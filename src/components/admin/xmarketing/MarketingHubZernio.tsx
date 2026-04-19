import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { Calendar, ExternalLink, Loader2, Radio, Send, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { invokeZernioSocial, type ZernioHubTab } from "@/lib/zernioSocial";
import type { DbCompanion } from "@/hooks/useCompanions";

export type TweetVariationLite = { text: string; hashtags: string[] };

const NEON = "#FF2D7B";

const TABS: { id: ZernioHubTab; label: string }[] = [
  { id: "compose", label: "Compose" },
  { id: "integrations", label: "Zernio" },
  { id: "queue", label: "Queue" },
];

type Props = {
  hubTab: ZernioHubTab;
  onHubTab: (t: ZernioHubTab) => void;
  variations: TweetVariationLite[] | null;
  fullTweetText: (v: TweetVariationLite) => string;
  selected: DbCompanion | null;
};

export function MarketingHubTabStrip({ hubTab, onHubTab }: { hubTab: ZernioHubTab; onHubTab: (t: ZernioHubTab) => void }) {
  return (
    <div className="flex gap-1 p-1 rounded-2xl bg-black/50 border border-white/[0.08] overflow-x-auto scrollbar-thin min-h-[3rem] items-center">
      {TABS.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onHubTab(t.id)}
          className={cn(
            "shrink-0 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors touch-manipulation",
            hubTab === t.id
              ? "bg-primary/25 text-primary border border-primary/40 shadow-[0_0_20px_rgba(255,45,123,0.15)]"
              : "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function MarketingHubZernioPanels({ hubTab, onHubTab, variations, fullTweetText, selected }: Props) {
  const queryClient = useQueryClient();
  const [zernioAccountDraft, setZernioAccountDraft] = useState("");
  const [autoProcessQueue, setAutoProcessQueue] = useState(false);
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [pickVar, setPickVar] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);

  const { data: settingsRow } = useQuery({
    queryKey: ["marketing-social-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("marketing_social_settings").select("*").eq("id", 1).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settingsRow?.zernio_twitter_account_id != null) {
      setZernioAccountDraft(settingsRow.zernio_twitter_account_id);
    }
    if (typeof settingsRow?.auto_process_forge_queue === "boolean") {
      setAutoProcessQueue(settingsRow.auto_process_forge_queue);
    }
  }, [settingsRow]);

  const { data: jobs = [], refetch: refetchJobs } = useQuery({
    queryKey: ["social-post-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("social_post_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;
      return data ?? [];
    },
    enabled: hubTab === "queue",
  });

  const saveSettings = useCallback(async () => {
    setBusy("save");
    try {
      const { error } = await invokeZernioSocial({
        mode: "settings_update",
        zernioTwitterAccountId: zernioAccountDraft,
        autoProcessForgeQueue: autoProcessQueue,
      });
      if (error) throw error;
      toast.success("Zernio settings saved");
      void queryClient.invalidateQueries({ queryKey: ["marketing-social-settings"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(null);
    }
  }, [autoProcessQueue, queryClient, zernioAccountDraft]);

  const ping = useCallback(async () => {
    setBusy("ping");
    try {
      const { data, error } = await invokeZernioSocial({ mode: "ping" });
      if (error) throw error;
      const p = data as { hasZernioKey?: boolean; zernioReachable?: boolean; detail?: string };
      toast.message(
        p.hasZernioKey ? `API key present · ${p.zernioReachable ? "Zernio reachable" : "check detail"}` : "Set ZERNIO_API_KEY on the Edge Function",
        { description: p.detail },
      );
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Ping failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const listProfiles = useCallback(async () => {
    setBusy("profiles");
    try {
      const { data, error } = await invokeZernioSocial({ mode: "profiles_list" });
      if (error) throw error;
      toast.success("Loaded profiles from Zernio — check browser console for JSON");
      console.info("[Zernio profiles]", data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "List failed");
    } finally {
      setBusy(null);
    }
  }, []);

  const postNow = useCallback(
    async (scheduledFor?: string | null) => {
      const vs = variations;
      if (!vs?.length) {
        toast.error("Generate tweets first.");
        return;
      }
      const v = vs[Math.min(pickVar, vs.length - 1)]!;
      const content = fullTweetText(v);
      setBusy("post");
      try {
        const body: Record<string, unknown> = { mode: "post", content, publishNow: !scheduledFor };
        if (scheduledFor) body.scheduledFor = scheduledFor;
        const { error } = await invokeZernioSocial(body);
        if (error) throw error;
        toast.success(scheduledFor ? "Scheduled on Zernio" : "Posted via Zernio");
        void queryClient.invalidateQueries({ queryKey: ["social-post-jobs"] });
      } catch (e: unknown) {
        toast.error(e instanceof Error ? e.message : "Post failed");
      } finally {
        setBusy(null);
      }
    },
    [fullTweetText, pickVar, queryClient, variations],
  );

  const enqueueForge = useCallback(async () => {
    if (!selected?.id) {
      toast.error("Select a companion first.");
      return;
    }
    setBusy("enqueue");
    try {
      const { error } = await invokeZernioSocial({ mode: "enqueue_auto_forge", companionId: selected.id });
      if (error) throw error;
      toast.success("Queued forge announcement");
      onHubTab("queue");
      void queryClient.invalidateQueries({ queryKey: ["social-post-jobs"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Queue failed");
    } finally {
      setBusy(null);
    }
  }, [onHubTab, queryClient, selected?.id]);

  const processQueue = useCallback(async () => {
    setBusy("process");
    try {
      const { data, error } = await invokeZernioSocial({ mode: "process_queue" });
      if (error) throw error;
      const r = data as { processed?: number };
      toast.success(`Processed ${r.processed ?? 0} job(s)`);
      void refetchJobs();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Process failed");
    } finally {
      setBusy(null);
    }
  }, [refetchJobs]);

  if (hubTab === "integrations") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 md:p-6 space-y-4 max-w-3xl">
        <div className="flex items-center gap-2 text-white font-gothic text-lg">
          <Share2 className="h-5 w-5 text-primary" style={{ color: NEON }} />
          Zernio integration
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Add{" "}
          <code className="text-primary/90">ZERNIO_API_KEY</code> in Supabase → Edge Functions → <code>zernio-social</code> secrets. Connect your X account in
          the Zernio dashboard, then paste the Twitter <strong>account id</strong> here.
        </p>
        <a
          href="https://docs.zernio.com/posts/create-post"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          Zernio API docs <ExternalLink className="h-3.5 w-3.5" />
        </a>
        <div className="space-y-2">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">X / Twitter account id</label>
          <input
            value={zernioAccountDraft}
            onChange={(e) => setZernioAccountDraft(e.target.value)}
            placeholder="From Zernio → connected accounts"
            className="w-full rounded-xl bg-black/60 border border-border px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground/90 cursor-pointer">
          <input
            type="checkbox"
            checked={autoProcessQueue}
            onChange={(e) => setAutoProcessQueue(e.target.checked)}
            className="rounded border-border"
          />
          Track automation toggle (queue still runs manually from Queue tab)
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void saveSettings()}
            className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-bold text-primary"
          >
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Save settings
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void ping()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold"
          >
            {busy === "ping" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
            Test connection
          </button>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => void listProfiles()}
            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-xs font-semibold"
          >
            {busy === "profiles" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            List profiles (console)
          </button>
        </div>
      </div>
    );
  }

  if (hubTab === "queue") {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/40 p-4 md:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-gothic text-lg text-white">Automation queue</p>
            <p className="text-xs text-muted-foreground mt-1">Forge announcements and job history.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void enqueueForge()}
              className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-xs font-bold text-accent"
            >
              {busy === "enqueue" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
              Queue selected companion
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void processQueue()}
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/15 px-4 py-2 text-xs font-bold text-primary"
            >
              {busy === "process" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Process pending
            </button>
          </div>
        </div>
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-2">When</th>
                <th className="p-2">Kind</th>
                <th className="p-2">Status</th>
                <th className="p-2">Companion</th>
                <th className="p-2">Note</th>
              </tr>
            </thead>
            <tbody>
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No jobs yet.
                  </td>
                </tr>
              ) : (
                jobs.map((row) => {
                  const r = row as {
                    id: string;
                    created_at: string;
                    kind: string;
                    status: string;
                    companion_id: string | null;
                    content: string | null;
                    error: string | null;
                  };
                  return (
                    <tr key={r.id} className="border-t border-border/40">
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-2">{r.kind}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2 font-mono text-[10px]">{r.companion_id ?? "—"}</td>
                      <td className="p-2 max-w-[200px] truncate text-muted-foreground">{r.error || (r.content?.slice(0, 80) ?? "—")}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  /* compose tab: send bar */
  return (
    <div className="rounded-2xl border border-primary/25 bg-black/45 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Post to X via Zernio</p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground">Variation</label>
        <select
          value={pickVar}
          onChange={(e) => setPickVar(Number(e.target.value))}
          className="rounded-lg bg-black/60 border border-border px-2 py-1.5 text-sm"
        >
          {(variations ?? []).map((_, i) => (
            <option key={i} value={i}>
              #{i + 1}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={busy !== null || !variations?.length}
          onClick={() => void postNow()}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold text-primary-foreground border border-primary/40 disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${NEON}, hsl(280 40% 36%))` }}
        >
          {busy === "post" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Post now
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase text-muted-foreground">Schedule (local)</label>
          <input
            type="datetime-local"
            value={scheduleLocal}
            onChange={(e) => setScheduleLocal(e.target.value)}
            className="rounded-xl bg-black/60 border border-border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={busy !== null || !scheduleLocal || !variations?.length}
          onClick={() => {
            const d = new Date(scheduleLocal);
            if (Number.isNaN(d.getTime())) {
              toast.error("Invalid date");
              return;
            }
            void postNow(d.toISOString());
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-accent/40 bg-accent/10 px-4 py-2 text-sm font-semibold text-accent disabled:opacity-40"
        >
          <Calendar className="h-4 w-4" />
          Schedule
        </button>
      </div>
    </div>
  );
}
