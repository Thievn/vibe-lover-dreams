import { useState, useCallback, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAdminCompanions, mapSupabaseCustomCharacterRow, type DbCompanion } from "@/hooks/useCompanions";
import { COMPANION_RARITIES, normalizeCompanionRarity } from "@/lib/companionRarity";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionInvokeMessage } from "@/lib/edgeFunction";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Save, RefreshCw, Plus, Eye, EyeOff, ChevronDown, ChevronUp,
  Loader2, X, ImageIcon, Palette, ArrowLeft, Sparkles, Trash2, Waves,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewMode = "list" | "edit" | "create";

const emptyCompanion: Omit<DbCompanion, "created_at" | "updated_at"> = {
  id: "",
  name: "",
  tagline: "",
  gender: "Female",
  orientation: "Bisexual",
  role: "Switch",
  tags: [],
  kinks: [],
  appearance: "",
  personality: "",
  bio: "",
  system_prompt: "",
  fantasy_starters: [],
  gradient_from: "#7B2D8E",
  gradient_to: "#FF2D7B",
  image_url: null,
  image_prompt: null,
  is_active: true,
  rarity: "common",
  backstory: "",
  static_image_url: null,
  animated_image_url: null,
  rarity_border_overlay_url: null,
};

/** Allowed columns on `custom_characters` when saving from admin forge editor. */
const CUSTOM_CHARACTER_UPDATE_KEYS = new Set([
  "name",
  "tagline",
  "gender",
  "orientation",
  "role",
  "tags",
  "kinks",
  "appearance",
  "personality",
  "bio",
  "backstory",
  "system_prompt",
  "fantasy_starters",
  "gradient_from",
  "gradient_to",
  "image_prompt",
  "image_url",
  "avatar_url",
  "static_image_url",
  "animated_image_url",
  "rarity_border_overlay_url",
  "rarity",
  "gallery_credit_name",
  "exclude_from_personal_vault",
  "personality_archetypes",
  "vibe_theme_selections",
]);

function LabeledRegenWrap({
  label,
  busy,
  onRegen,
  children,
}: {
  label: string;
  busy: boolean;
  onRegen: () => void;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-1">
        <label className="text-xs text-muted-foreground">{label}</label>
        <button
          type="button"
          onClick={() => void onRegen()}
          disabled={busy}
          title={`Regenerate ${label} from current theme (Grok)`}
          className="p-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", busy && "animate-spin")} />
        </button>
      </div>
      {children}
    </div>
  );
}

type AdminVibRow = {
  id: string;
  display_name: string;
  sort_order: number;
  is_abyssal_signature: boolean;
  pool_pattern_id: string;
  pool_index: number | null;
  internal_label: string | null;
};

function AdminToyPatternsSection({ companionId }: { companionId: string }) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);
  const [addPoolIndex, setAddPoolIndex] = useState(1);

  const { data: pool = [] } = useQuery({
    queryKey: ["vibration-pattern-pool"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vibration_pattern_pool")
        .select("id, pool_index, internal_label")
        .order("pool_index", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-vib-rows", companionId],
    queryFn: async (): Promise<AdminVibRow[]> => {
      const { data: raws, error: e1 } = await supabase
        .from("companion_vibration_patterns")
        .select("id, display_name, sort_order, is_abyssal_signature, pool_pattern_id")
        .eq("companion_id", companionId)
        .order("sort_order", { ascending: true });
      if (e1) throw e1;
      if (!raws?.length) return [];
      const poolIds = [...new Set(raws.map((r) => r.pool_pattern_id))];
      const { data: pools, error: e2 } = await supabase
        .from("vibration_pattern_pool")
        .select("id, pool_index, internal_label")
        .in("id", poolIds);
      if (e2) throw e2;
      const byPool = new Map((pools ?? []).map((p) => [p.id, p]));
      return raws.map((r) => {
        const p = byPool.get(r.pool_pattern_id);
        return {
          id: r.id,
          display_name: r.display_name,
          sort_order: r.sort_order,
          is_abyssal_signature: r.is_abyssal_signature,
          pool_pattern_id: r.pool_pattern_id,
          pool_index: p?.pool_index ?? null,
          internal_label: p?.internal_label ?? null,
        };
      });
    },
  });

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companionId] });
    void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", companionId] });
  }, [queryClient, companionId]);

  const reloadFromRarity = async () => {
    setBusy("reload");
    try {
      const { error } = await supabase.rpc("admin_reassign_vibration_patterns", {
        p_companion_id: companionId,
      });
      if (error) throw error;
      toast.success("Toy patterns rebuilt from current rarity.");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setBusy(null);
    }
  };

  const removeRow = async (rowId: string) => {
    setBusy(rowId);
    try {
      const { error } = await supabase.from("companion_vibration_patterns").delete().eq("id", rowId);
      if (error) throw error;
      toast.success("Pattern removed from this character.");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(null);
    }
  };

  const addPattern = async () => {
    const slot = pool.find((p) => p.pool_index === addPoolIndex);
    if (!slot) {
      toast.error("Pool not loaded.");
      return;
    }
    setBusy("add");
    try {
      const maxSort = rows.reduce((m, r) => Math.max(m, r.sort_order), 0);
      const next = maxSort + 1;
      if (next > 20) {
        toast.error("Maximum 20 pattern slots per companion.");
        return;
      }
      const { error } = await supabase.from("companion_vibration_patterns").insert({
        companion_id: companionId,
        pool_pattern_id: slot.id,
        display_name: slot.internal_label,
        sort_order: next,
        is_abyssal_signature: slot.pool_index === 50,
      });
      if (error) throw error;
      toast.success("Pattern added.");
      invalidate();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Add failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-lg border border-violet-500/25 bg-violet-950/20 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Waves className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-bold text-foreground">Lovense toy patterns (chat)</h4>
      </div>
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Rarity sets the default slot count (common 1 … abyssal 5 + signature). Use{" "}
        <strong className="text-foreground/90">Reload from rarity</strong> to wipe custom rows and rebuild. Add/remove
        individual pool entries below; changes apply server-side immediately.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy === "reload"}
          onClick={() => void reloadFromRarity()}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-600/90 text-white text-xs font-semibold hover:opacity-90 disabled:opacity-50 border border-violet-400/30"
        >
          {busy === "reload" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Reload from rarity
        </button>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading assignments…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-amber-200/90">
          No patterns for this ID. Save rarity/name on the stock row (auto-trigger) or click Reload from rarity / Repair
          missing (list).
        </p>
      ) : (
        <ul className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/40 px-2 py-1.5 text-xs"
            >
              <span className="text-muted-foreground w-6 shrink-0">{r.sort_order}</span>
              <input
                type="text"
                defaultValue={r.display_name}
                key={r.id}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (!v || v === r.display_name) return;
                  void supabase
                    .from("companion_vibration_patterns")
                    .update({ display_name: v })
                    .eq("id", r.id)
                    .then(({ error }) => {
                      if (error) toast.error(error.message);
                      else invalidate();
                    });
                }}
                className="flex-1 min-w-0 rounded border border-border/80 bg-muted/40 px-2 py-1 text-foreground"
              />
              <span className="hidden sm:inline text-[10px] text-muted-foreground truncate max-w-[140px]" title={r.internal_label ?? ""}>
                #{r.pool_index ?? "?"} {r.internal_label ?? ""}
              </span>
              {r.is_abyssal_signature && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-200 shrink-0">sig</span>
              )}
              <button
                type="button"
                title="Remove this slot"
                disabled={busy === r.id}
                onClick={() => void removeRow(r.id)}
                className="p-1.5 rounded-md hover:bg-destructive/20 text-muted-foreground hover:text-destructive shrink-0 disabled:opacity-50"
              >
                {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-end gap-2 pt-1 border-t border-border/40">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wide">Pool preset</label>
          <select
            value={addPoolIndex}
            onChange={(e) => setAddPoolIndex(Number(e.target.value))}
            className="rounded-lg bg-muted border border-border px-2 py-1.5 text-xs text-foreground min-w-[12rem]"
          >
            {pool.map((p) => (
              <option key={p.id} value={p.pool_index}>
                {p.pool_index}. {p.internal_label}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={busy === "add" || pool.length === 0}
          onClick={() => void addPattern()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-400/40 text-violet-200 text-xs font-medium hover:bg-violet-500/10 disabled:opacity-50"
        >
          {busy === "add" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add slot
        </button>
      </div>
    </div>
  );
}

const CompanionManager = () => {
  const { data: companions, isLoading, error } = useAdminCompanions();
  const { data: forgedRows = [], isLoading: forgedLoading } = useQuery({
    queryKey: ["admin-custom-characters"],
    queryFn: async () => {
      const { data, error: qErr } = await supabase
        .from("custom_characters")
        .select(
          "id,name,user_id,is_public,approved,created_at,image_url,avatar_url,tagline,rarity,gradient_from,gradient_to,rarity_border_overlay_url",
        )
        .order("created_at", { ascending: false })
        .limit(80);
      if (qErr) throw qErr;
      return data ?? [];
    },
  });
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Partial<DbCompanion>>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState<Record<string, boolean>>({});
  const [createData, setCreateData] = useState({ ...emptyCompanion, id: `custom-${Date.now()}` });
  const [creatingLoading, setCreatingLoading] = useState(false);
  const [forgeBusyId, setForgeBusyId] = useState<string | null>(null);
  const [forgeVibBusyId, setForgeVibBusyId] = useState<string | null>(null);
  const [loreBusyId, setLoreBusyId] = useState<string | null>(null);
  const [repairVibBusy, setRepairVibBusy] = useState(false);
  /** When set, edit view uses this row (e.g. full forge profile) instead of catalog list lookup. */
  const [editOverride, setEditOverride] = useState<DbCompanion | null>(null);
  const [forgeEditLoadingId, setForgeEditLoadingId] = useState<string | null>(null);
  const [sectionBusy, setSectionBusy] = useState<Record<string, boolean>>({});

  // Auto-fill state
  const [autoFillPrompt, setAutoFillPrompt] = useState("");
  const [autoFilling, setAutoFilling] = useState(false);
  const [designLabHints, setDesignLabHints] = useState("");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading companions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
        <p className="text-destructive">Failed to load companions. Please try again.</p>
      </div>
    );
  }

  const filtered = (companions || []).filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      c.gender.toLowerCase().includes(q) ||
      c.role.toLowerCase().includes(q)
    );
  });

  const getEdit = (id: string): Partial<DbCompanion> => editData[id] || {};
  const setField = (id: string, field: string, value: any) => {
    setEditData((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  };

  const saveCompanion = async (companion: DbCompanion) => {
    const changes = getEdit(companion.id);
    if (Object.keys(changes).length === 0) {
      toast.info("No changes to save.");
      return;
    }
    setSaving((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const isForge = companion.id.startsWith("cc-");
      if (isForge) {
        const uuid = companion.id.slice(3);
        const patch: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(changes)) {
          if (CUSTOM_CHARACTER_UPDATE_KEYS.has(k)) patch[k] = v;
        }
        if (Object.keys(patch).length === 0) {
          toast.info("No forge-safe fields to save.");
          return;
        }
        const { error } = await supabase.from("custom_characters").update(patch as any).eq("id", uuid);
        if (error) throw error;
        toast.success(`${companion.name} (forge) updated!`);
      } else {
        const { error } = await supabase
          .from("companions")
          .update(changes as any)
          .eq("id", companion.id);
        if (error) throw error;
        toast.success(`${companion.name} updated!`);
        if ("rarity" in changes || "name" in changes) {
          void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", companion.id] });
          void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", companion.id] });
        }
      }
      setEditData((prev) => {
        const next = { ...prev };
        delete next[companion.id];
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (err: any) {
      toast.error("Save failed: " + err.message);
    } finally {
      setSaving((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const regenSection = async (companion: DbCompanion, section: string) => {
    const rk = `${companion.id}::${section}`;
    setSectionBusy((prev) => ({ ...prev, [rk]: true }));
    try {
      const source = companion.id.startsWith("cc-") ? "forge" : "catalog";
      const { data, error } = await supabase.functions.invoke("admin-regenerate-companion-section", {
        body: { source, companionAppId: companion.id, section },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      if (data?.fields && typeof data.fields === "object") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: { ...prev[companion.id], ...(data.fields as Record<string, unknown>) },
        }));
      }
      if (section === "portrait" && typeof data?.publicImageUrl === "string") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: {
            ...prev[companion.id],
            image_url: data.publicImageUrl,
            static_image_url: data.publicImageUrl,
          },
        }));
      }
      toast.success(section === "portrait" ? "Portrait regenerated." : `Regenerated ${section.replace(/_/g, " ")}.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Regenerate failed");
    } finally {
      setSectionBusy((prev) => {
        const next = { ...prev };
        delete next[rk];
        return next;
      });
    }
  };

  const repairMissingVibrationPatterns = async () => {
    setRepairVibBusy(true);
    try {
      const { data, error } = await supabase.rpc("admin_backfill_missing_vibration_patterns");
      if (error) throw error;
      const n = typeof data === "number" ? data : 0;
      toast.success(`Repaired ${n} companion(s) that had no toy pattern rows.`);
      void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows"] });
      void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns"] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Repair failed");
    } finally {
      setRepairVibBusy(false);
    }
  };

  const reloadForgeVibrationPatterns = async (customUuid: string) => {
    setForgeVibBusyId(customUuid);
    try {
      const { error } = await supabase.rpc("admin_reassign_vibration_patterns", {
        p_companion_id: `cc-${customUuid}`,
      });
      if (error) throw error;
      toast.success("Toy patterns rebuilt for this forge save.");
      void queryClient.invalidateQueries({ queryKey: ["admin-vib-rows", `cc-${customUuid}`] });
      void queryClient.invalidateQueries({ queryKey: ["companion-vibration-patterns", `cc-${customUuid}`] });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Reload failed");
    } finally {
      setForgeVibBusyId(null);
    }
  };

  const updateForgeRow = async (
    id: string,
    patch: { approved?: boolean; is_public?: boolean },
  ) => {
    setForgeBusyId(id);
    try {
      const { error } = await supabase.from("custom_characters").update(patch).eq("id", id);
      if (error) throw error;
      toast.success("Community forge row updated.");
      void queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
      void queryClient.invalidateQueries({ queryKey: ["companions"] });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setForgeBusyId(null);
    }
  };

  const refreshLoreWithGrok = async (companion: DbCompanion) => {
    setLoreBusyId(companion.id);
    try {
      const hints = [
        `Keep or gently refine this roster name: ${companion.name}`,
        `Tagline: ${companion.tagline}`,
        `Gender: ${companion.gender}; orientation: ${companion.orientation}; role: ${companion.role}`,
        `Personality: ${companion.personality}`,
        `Current bio (expand, do not shorten into bullet tags): ${companion.bio}`,
        `Current backstory (replace with deeper lore if thin): ${companion.backstory || "(empty)"}`,
        `Appearance (rewrite as 3+ flowing sentences, not keyword spam): ${companion.appearance}`,
        "Return a FULL premium profile via tool: bio = 2 vivid paragraphs; backstory = 4 paragraphs with wound/want/secret/sensory scenes; system_prompt = complete chat charter; fantasy_starters = exactly 4; image_prompt = one dense SFW portrait paragraph.",
      ].join("\n\n");
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: { mode: "companion_design_lab", prompt: hints },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      const fields = data?.fields as Record<string, unknown> | undefined;
      if (!fields) throw new Error("No fields returned");

      const fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);
      setEditData((prev) => ({
        ...prev,
        [companion.id]: {
          ...prev[companion.id],
          ...(typeof fields.name === "string" ? { name: String(fields.name).slice(0, 120) } : {}),
          ...(typeof fields.tagline === "string" ? { tagline: String(fields.tagline).slice(0, 240) } : {}),
          ...(typeof fields.bio === "string" ? { bio: String(fields.bio).slice(0, 12000) } : {}),
          ...(typeof fields.backstory === "string" ? { backstory: String(fields.backstory).slice(0, 24000) } : {}),
          ...(typeof fields.appearance === "string" ? { appearance: String(fields.appearance).slice(0, 12000) } : {}),
          ...(typeof fields.system_prompt === "string" ? { system_prompt: String(fields.system_prompt).slice(0, 32000) } : {}),
          ...(fantasy_starters.length ? { fantasy_starters } : {}),
          ...(typeof fields.image_prompt === "string" ? { image_prompt: String(fields.image_prompt).slice(0, 8000) } : {}),
          ...(Array.isArray(fields.tags) ? { tags: (fields.tags as string[]).map(String).slice(0, 24) } : {}),
          ...(Array.isArray(fields.kinks) ? { kinks: (fields.kinks as string[]).map(String).slice(0, 16) } : {}),
        },
      }));
      toast.success("Grok drafted richer lore — review fields, then Save.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Lore refresh failed");
    } finally {
      setLoreBusyId(null);
    }
  };

  const regenerateImage = async (companion: DbCompanion) => {
    const imagePrompt =
      (getEdit(companion.id)?.image_prompt as string | null | undefined) ??
      companion.image_prompt ??
      `SFW portrait: ${companion.name}. ${companion.appearance}`.slice(0, 4000);
    if (!String(imagePrompt).trim()) {
      toast.error("Need appearance or image prompt to generate a portrait.");
      return;
    }
    setGenerating((prev) => ({ ...prev, [companion.id]: true }));
    try {
      const isForge = companion.id.startsWith("cc-");
      const { data, error } = await supabase.functions.invoke("generate-companion-image", {
        body: isForge
          ? { target: "forge", forgeRowUuid: companion.id.replace(/^cc-/, ""), imagePrompt: String(imagePrompt).trim() }
          : { target: "catalog", companionId: companion.id, imagePrompt: String(imagePrompt).trim() },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(data.error);
      toast.success("Portrait generated!");
      if (typeof data?.publicImageUrl === "string") {
        setEditData((prev) => ({
          ...prev,
          [companion.id]: {
            ...prev[companion.id],
            image_url: data.publicImageUrl,
            static_image_url: data.publicImageUrl,
          },
        }));
      }
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      queryClient.invalidateQueries({ queryKey: ["companions"] });
      queryClient.invalidateQueries({ queryKey: ["admin-custom-characters"] });
    } catch (err: any) {
      toast.error("Generation failed: " + err.message);
    } finally {
      setGenerating((prev) => ({ ...prev, [companion.id]: false }));
    }
  };

  const toggleActive = async (companion: DbCompanion) => {
    const newVal = !companion.is_active;
    const { error } = await supabase
      .from("companions")
      .update({ is_active: newVal } as any)
      .eq("id", companion.id);
    if (error) {
      toast.error("Toggle failed");
    } else {
      toast.success(newVal ? "Activated" : "Deactivated");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
    }
  };

  const openEdit = (id: string) => {
    setEditOverride(null);
    setEditingId(id);
    setViewMode("edit");
  };

  const openForgeAdminEdit = async (uuid: string) => {
    setForgeEditLoadingId(uuid);
    try {
      const { data, error } = await supabase.from("custom_characters").select("*").eq("id", uuid).maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Forge row not found.");
        return;
      }
      const mapped = mapSupabaseCustomCharacterRow(data as Record<string, unknown>);
      setEditOverride(mapped);
      setEditingId(mapped.id);
      setViewMode("edit");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Could not load forge row");
    } finally {
      setForgeEditLoadingId(null);
    }
  };

  const openCreate = () => {
    setCreateData({ ...emptyCompanion, id: `custom-${Date.now()}` });
    setAutoFillPrompt("");
    setViewMode("create");
  };

  const backToList = () => {
    setViewMode("list");
    setEditingId(null);
    setEditOverride(null);
  };

  const createCompanion = async () => {
    if (!createData.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setCreatingLoading(true);
    try {
      const { error } = await supabase.from("companions").insert({
        id: createData.id,
        name: createData.name,
        tagline: createData.tagline,
        gender: createData.gender,
        orientation: createData.orientation,
        role: createData.role,
        tags: createData.tags,
        kinks: createData.kinks,
        appearance: createData.appearance,
        personality: createData.personality,
        bio: createData.bio,
        system_prompt: createData.system_prompt,
        fantasy_starters: createData.fantasy_starters as any,
        gradient_from: createData.gradient_from,
        gradient_to: createData.gradient_to,
        image_prompt: createData.image_prompt,
        is_active: createData.is_active,
        rarity: createData.rarity,
        backstory: createData.backstory,
        static_image_url: createData.static_image_url,
        animated_image_url: createData.animated_image_url,
        rarity_border_overlay_url: createData.rarity_border_overlay_url,
        image_url: createData.image_url,
      } as any);
      if (error) throw error;
      toast.success("Companion created!");
      queryClient.invalidateQueries({ queryKey: ["admin-companions"] });
      backToList();
    } catch (err: any) {
      toast.error("Create failed: " + err.message);
    } finally {
      setCreatingLoading(false);
    }
  };

  const normalizeFantasyStartersFromFields = (raw: unknown): { title: string; description: string }[] => {
    if (!Array.isArray(raw)) return [];
    return (raw as Record<string, unknown>[])
      .map((s) => {
        if (!s || typeof s !== "object") return null;
        const description = String(s.description ?? s.message ?? "").trim();
        const title =
          String(s.title ?? s.label ?? "").trim() ||
          (description ? `${description.slice(0, 44)}${description.length > 44 ? "…" : ""}` : "");
        if (!title) return null;
        return { title, description };
      })
      .filter((x): x is { title: string; description: string } => x !== null);
  };

  /** Full-catalog roll — replaces the create form with a fresh Grok-designed companion (admin library builder). */
  const rollPremiumCatalogCompanion = async () => {
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: {
          mode: "companion_design_lab",
          prompt:
            designLabHints.trim() ||
            "Surprise me with one completely original companion — maximize species, era, subculture, and hobby diversity.",
        },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(String(data.error));
      const fields = data?.fields as Record<string, unknown> | undefined;
      if (!fields || typeof fields.name !== "string") throw new Error("No profile returned");

      const slug =
        String(fields.name)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "") || "companion";
      const fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);

      setCreateData({
        ...emptyCompanion,
        id: `${slug}-${Date.now().toString(36)}`,
        name: String(fields.name || "").slice(0, 120),
        tagline: String(fields.tagline || "").slice(0, 240),
        gender: String(fields.gender || "Female").slice(0, 80),
        orientation: String(fields.orientation || "Bisexual").slice(0, 80),
        role: String(fields.role || "Switch").slice(0, 80),
        tags: Array.isArray(fields.tags) ? (fields.tags as string[]).map(String).slice(0, 24) : [],
        kinks: Array.isArray(fields.kinks) ? (fields.kinks as string[]).map(String).slice(0, 24) : [],
        appearance: String(fields.appearance || "").slice(0, 8000),
        personality: String(fields.personality || "").slice(0, 8000),
        bio: String(fields.bio || "").slice(0, 8000),
        backstory: String(fields.backstory || fields.bio || "").slice(0, 16000),
        system_prompt: String(fields.system_prompt || "").slice(0, 32000),
        fantasy_starters,
        gradient_from:
          typeof fields.gradient_from === "string" && fields.gradient_from ? fields.gradient_from : "#7B2D8E",
        gradient_to: typeof fields.gradient_to === "string" && fields.gradient_to ? fields.gradient_to : "#FF2D7B",
        image_prompt: fields.image_prompt != null ? String(fields.image_prompt).slice(0, 8000) : null,
        image_url: null,
        is_active: true,
        rarity: "common",
        static_image_url: null,
        animated_image_url: null,
        rarity_border_overlay_url: null,
      });

      toast.success("Rolled a new catalog companion — review, tweak rarity/portrait, then create.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Design roll failed");
    } finally {
      setAutoFilling(false);
    }
  };

  // Auto-fill from prompt using Grok
  const autoFillFromPrompt = async () => {
    if (!autoFillPrompt.trim()) {
      toast.error("Paste a companion profile first.");
      return;
    }
    setAutoFilling(true);
    try {
      const { data, error } = await supabase.functions.invoke("parse-companion-prompt", {
        body: { prompt: autoFillPrompt },
      });
      if (error) throw new Error(await getEdgeFunctionInvokeMessage(error, data));
      if (data?.error) throw new Error(data.error);

      const fields = data.fields;
      if (!fields) throw new Error("No fields returned");

      // Merge into createData — only fill blank/default values
      setCreateData((prev) => {
        const updated = { ...prev };
        if (fields.name && !prev.name) updated.name = fields.name;
        if (fields.tagline && !prev.tagline) updated.tagline = fields.tagline;
        if (fields.gender && prev.gender === "Female") updated.gender = fields.gender;
        if (fields.orientation && prev.orientation === "Bisexual") updated.orientation = fields.orientation;
        if (fields.role && prev.role === "Switch") updated.role = fields.role;
        if (fields.tags?.length && prev.tags.length === 0) updated.tags = fields.tags;
        if (fields.kinks?.length && prev.kinks.length === 0) updated.kinks = fields.kinks;
        if (fields.appearance && !prev.appearance) updated.appearance = fields.appearance;
        if (fields.personality && !prev.personality) updated.personality = fields.personality;
        if (fields.bio && !prev.bio) updated.bio = fields.bio;
        if (fields.backstory && !prev.backstory) updated.backstory = fields.backstory;
        if (fields.system_prompt && !prev.system_prompt) updated.system_prompt = fields.system_prompt;
        if (fields.fantasy_starters?.length && (prev.fantasy_starters as any[]).length === 0) {
          updated.fantasy_starters = normalizeFantasyStartersFromFields(fields.fantasy_starters);
        }
        if (fields.gradient_from && prev.gradient_from === "#7B2D8E") updated.gradient_from = fields.gradient_from;
        if (fields.gradient_to && prev.gradient_to === "#FF2D7B") updated.gradient_to = fields.gradient_to;
        if (fields.image_prompt && !prev.image_prompt) updated.image_prompt = fields.image_prompt;
        // Auto-generate an ID from name if still default
        if (fields.name && prev.id.startsWith("custom-")) {
          updated.id = fields.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        }
        return updated;
      });

      toast.success("Fields auto-filled from prompt!");
    } catch (err: any) {
      toast.error("Auto-fill failed: " + err.message);
    } finally {
      setAutoFilling(false);
    }
  };

  const hasChanges = (id: string) => Object.keys(getEdit(id)).length > 0;

  // CREATE VIEW
  if (viewMode === "create") {
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <h2 className="text-lg font-bold text-foreground">Create New Companion</h2>

        {/* Auto-Fill from Prompt */}
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-bold text-foreground">Auto-Fill from Prompt</h4>
          </div>
          <p className="text-xs text-muted-foreground">Paste a full companion profile from Grok or anywhere else. Grok will parse it and fill in the fields below.</p>
          <textarea
            value={autoFillPrompt}
            onChange={(e) => setAutoFillPrompt(e.target.value)}
            rows={6}
            placeholder="Paste your full companion prompt/profile here..."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
          />
          <button
            onClick={autoFillFromPrompt}
            disabled={autoFilling || !autoFillPrompt.trim()}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoFilling ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Parsing with Grok...</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Auto-Fill Fields</>
            )}
          </button>
        </div>

        <div className="rounded-lg border border-violet-500/25 bg-violet-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-400" />
            <h4 className="text-sm font-bold text-foreground">Catalog design lab</h4>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Grok invents a full premium companion (name, deep backstory, 4 fantasy starters, cinematic{" "}
            <strong className="text-foreground">image_prompt</strong>, rich tags &amp; interests). This{" "}
            <strong className="text-foreground">replaces</strong> the draft below — use it to build a big roster. Portrait
            generation still uses the shared LustForge image brief (SFW art).
          </p>
          <textarea
            value={designLabHints}
            onChange={(e) => setDesignLabHints(e.target.value)}
            rows={3}
            placeholder="Optional: e.g. &quot;nocturnal merfolk DJ, bioluminescent club, melancholic flirt&quot; — or leave empty for a wild card."
            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-violet-500/50 transition-colors resize-y"
          />
          <button
            type="button"
            onClick={() => void rollPremiumCatalogCompanion()}
            disabled={autoFilling}
            className="px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {autoFilling ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Grok is designing…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Roll new catalog companion
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Portrait & Appearance */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-primary" />
                <h4 className="text-sm font-bold text-foreground">Portrait & Appearance</h4>
              </div>
              <div className="w-24 h-24 shrink-0">
                <TierHaloPortraitFrame
                  variant="compact"
                  rarity={normalizeCompanionRarity(createData.rarity)}
                  gradientFrom={createData.gradient_from}
                  gradientTo={createData.gradient_to}
                  overlayUrl={createData.rarity_border_overlay_url}
                  aspectClassName="aspect-square w-full h-full"
                >
                  <div
                    className="absolute inset-0 z-0"
                    style={{ background: `linear-gradient(135deg, ${createData.gradient_from}, ${createData.gradient_to})` }}
                  />
                  {createData.static_image_url || createData.image_url ? (
                    <img
                      src={(createData.static_image_url || createData.image_url)!}
                      alt=""
                      className="absolute inset-0 z-[1] h-full w-full object-cover"
                    />
                  ) : (
                    <span className="absolute inset-0 z-[2] flex items-center justify-center text-2xl font-bold text-white/80">
                      {createData.name.charAt(0) || "?"}
                    </span>
                  )}
                </TierHaloPortraitFrame>
              </div>
              <TextArea label="Appearance" value={createData.appearance} onChange={(v) => setCreateData(p => ({ ...p, appearance: v }))} rows={4} placeholder="Physical description..." />
              <TextArea label="Image Prompt" value={createData.image_prompt || ""} onChange={(v) => setCreateData(p => ({ ...p, image_prompt: v }))} rows={3} placeholder="Image generation prompt..." />
              <div className="flex items-center gap-4">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">From:</label>
                  <input type="color" value={createData.gradient_from} onChange={(e) => setCreateData(p => ({ ...p, gradient_from: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">To:</label>
                  <input type="color" value={createData.gradient_to} onChange={(e) => setCreateData(p => ({ ...p, gradient_to: e.target.value }))} className="w-8 h-8 rounded border border-border cursor-pointer" />
                </div>
                <div className="w-20 h-8 rounded" style={{ background: `linear-gradient(135deg, ${createData.gradient_from}, ${createData.gradient_to})` }} />
              </div>
            </div>
          </div>

          {/* Right: Metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name *" value={createData.name} onChange={(v) => setCreateData(p => ({ ...p, name: v }))} />
              <Field label="Tagline" value={createData.tagline} onChange={(v) => setCreateData(p => ({ ...p, tagline: v }))} />
              <Field label="Gender" value={createData.gender} onChange={(v) => setCreateData(p => ({ ...p, gender: v }))} />
              <Field label="Orientation" value={createData.orientation} onChange={(v) => setCreateData(p => ({ ...p, orientation: v }))} />
              <Field label="Role" value={createData.role} onChange={(v) => setCreateData(p => ({ ...p, role: v }))} />
              <Field label="ID" value={createData.id} onChange={(v) => setCreateData(p => ({ ...p, id: v }))} />
            </div>
            <Field label="Tags (comma-separated)" value={createData.tags.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, tags: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <Field label="Kinks (comma-separated)" value={createData.kinks.join(", ")} onChange={(v) => setCreateData(p => ({ ...p, kinks: v.split(",").map(s => s.trim()).filter(Boolean) }))} />
            <TextArea label="Bio" value={createData.bio} onChange={(v) => setCreateData(p => ({ ...p, bio: v }))} rows={3} />
            <TextArea label="Backstory (2–4 paragraphs, blank line between)" value={createData.backstory} onChange={(v) => setCreateData(p => ({ ...p, backstory: v }))} rows={6} />
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={createData.rarity}
                onChange={(e) => setCreateData((p) => ({ ...p, rarity: e.target.value }))}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Field label="Static portrait URL" value={createData.static_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, static_image_url: v || null }))} />
            <Field label="Animated portrait URL (gif/webp/mp4)" value={createData.animated_image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, animated_image_url: v || null }))} />
            <Field label="Custom border overlay URL (optional PNG/SVG)" value={createData.rarity_border_overlay_url || ""} onChange={(v) => setCreateData(p => ({ ...p, rarity_border_overlay_url: v || null }))} />
            <Field label="Legacy image_url (optional)" value={createData.image_url || ""} onChange={(v) => setCreateData(p => ({ ...p, image_url: v || null }))} />
            <TextArea label="Personality" value={createData.personality} onChange={(v) => setCreateData(p => ({ ...p, personality: v }))} rows={3} />
            <TextArea label="Companion Prompt" value={createData.system_prompt} onChange={(v) => setCreateData(p => ({ ...p, system_prompt: v }))} rows={6} placeholder="Paste the full companion prompt here..." />
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <button onClick={createCompanion} disabled={creatingLoading} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {creatingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create Companion
          </button>
          <button onClick={backToList} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // EDIT VIEW
  if (viewMode === "edit" && editingId) {
    const companion = editOverride ?? companions?.find((c) => c.id === editingId);
    if (!companion) {
      return <p className="text-muted-foreground">Companion not found.</p>;
    }
    const edit = getEdit(companion.id);
    const val = (field: keyof DbCompanion) => edit[field] !== undefined ? edit[field] : companion[field];

    return (
      <div className="space-y-4">
        <button onClick={backToList} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to list
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-lg font-bold text-foreground">{val("name") as string}</h2>
          {companion.id.startsWith("cc-") ? (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-500/35">
              Forge row
            </span>
          ) : (
            <span className={`px-2 py-0.5 rounded-full text-[10px] ${companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
              {companion.is_active ? "Active" : "Inactive"}
            </span>
          )}
          {hasChanges(companion.id) && <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary/20 text-primary">Unsaved</span>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Portrait + Appearance + Image Prompt + Regenerate */}
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <ImageIcon className="h-4 w-4 text-primary shrink-0" />
                  <h4 className="text-sm font-bold text-foreground truncate">Portrait & Appearance</h4>
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::portrait`]}
                  onClick={() => void regenSection(companion, "portrait")}
                  title="Regenerate portrait (admin edge — same brief as forge)"
                  className="p-1.5 rounded-full border border-border bg-muted/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::portrait`] && "animate-spin")} />
                </button>
              </div>

              {/* Portrait Preview */}
              <div className="flex items-start gap-4">
                <div className="w-32 h-32 shrink-0">
                  <TierHaloPortraitFrame
                    variant="compact"
                    rarity={normalizeCompanionRarity(String(val("rarity")))}
                    gradientFrom={String(val("gradient_from"))}
                    gradientTo={String(val("gradient_to"))}
                    overlayUrl={(val("rarity_border_overlay_url") as string | null) ?? companion.rarity_border_overlay_url}
                    aspectClassName="aspect-square w-full h-full"
                  >
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        background: `linear-gradient(135deg, ${String(val("gradient_from"))}, ${String(val("gradient_to"))})`,
                      }}
                    />
                    {(val("static_image_url") as string | null) ||
                    (val("image_url") as string | null) ||
                    companion.static_image_url ||
                    companion.image_url ? (
                      <img
                        src={
                          ((val("static_image_url") as string | null) ||
                            (val("image_url") as string | null) ||
                            companion.static_image_url ||
                            companion.image_url)!
                        }
                        alt={companion.name}
                        className="absolute inset-0 z-[1] h-full w-full object-cover"
                      />
                    ) : (
                      <span className="absolute inset-0 z-[2] flex items-center justify-center text-3xl font-bold text-white/80">
                        {companion.name.charAt(0)}
                      </span>
                    )}
                  </TierHaloPortraitFrame>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-4">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">From:</label>
                      <input type="color" value={val("gradient_from") as string} onChange={(e) => setField(companion.id, "gradient_from", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-muted-foreground">To:</label>
                      <input type="color" value={val("gradient_to") as string} onChange={(e) => setField(companion.id, "gradient_to", e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
                    </div>
                  </div>
                  <div className="w-full h-6 rounded" style={{ background: `linear-gradient(135deg, ${val("gradient_from")}, ${val("gradient_to")})` }} />
                </div>
              </div>

              {/* Appearance */}
              <LabeledRegenWrap
                label="Appearance"
                busy={!!sectionBusy[`${companion.id}::appearance`]}
                onRegen={() => void regenSection(companion, "appearance")}
              >
                <textarea
                  value={val("appearance") as string}
                  onChange={(e) => setField(companion.id, "appearance", e.target.value)}
                  rows={4}
                  placeholder="Physical description for reference..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </LabeledRegenWrap>

              {/* Image Prompt */}
              <LabeledRegenWrap
                label="Image Prompt"
                busy={!!sectionBusy[`${companion.id}::image_prompt`]}
                onRegen={() => void regenSection(companion, "image_prompt")}
              >
                <textarea
                  value={(val("image_prompt") as string) || ""}
                  onChange={(e) => setField(companion.id, "image_prompt", e.target.value)}
                  rows={3}
                  placeholder="Describe the portrait to generate..."
                  className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
                />
              </LabeledRegenWrap>

              {/* Regenerate */}
              <button
                onClick={() => regenerateImage(companion)}
                disabled={generating[companion.id]}
                className="w-full px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {generating[companion.id] ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><RefreshCw className="h-4 w-4" /> Regenerate Portrait</>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: All metadata */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Name" value={val("name") as string} onChange={(v) => setField(companion.id, "name", v)} />
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Field label="Tagline" value={val("tagline") as string} onChange={(v) => setField(companion.id, "tagline", v)} />
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::tagline`]}
                  onClick={() => void regenSection(companion, "tagline")}
                  title="Regenerate tagline"
                  className="mb-0.5 p-2 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::tagline`] && "animate-spin")} />
                </button>
              </div>
              <Field label="Gender" value={val("gender") as string} onChange={(v) => setField(companion.id, "gender", v)} />
              <Field label="Orientation" value={val("orientation") as string} onChange={(v) => setField(companion.id, "orientation", v)} />
              <Field label="Role" value={val("role") as string} onChange={(v) => setField(companion.id, "role", v)} />
              <Field label="ID" value={companion.id} onChange={() => {}} disabled />
            </div>
            <div className="space-y-2">
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <Field
                    label="Tags (comma-separated)"
                    value={(val("tags") as string[]).join(", ")}
                    onChange={(v) => setField(companion.id, "tags", v.split(",").map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::tags_kinks`]}
                  onClick={() => void regenSection(companion, "tags_kinks")}
                  title="Regenerate tags + kinks from theme"
                  className="mb-0.5 p-2 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::tags_kinks`] && "animate-spin")} />
                </button>
              </div>
              <Field
                label="Kinks (comma-separated)"
                value={(val("kinks") as string[]).join(", ")}
                onChange={(v) => setField(companion.id, "kinks", v.split(",").map((s) => s.trim()).filter(Boolean))}
              />
            </div>
            <LabeledRegenWrap label="Bio" busy={!!sectionBusy[`${companion.id}::bio`]} onRegen={() => void regenSection(companion, "bio")}>
              <textarea
                value={val("bio") as string}
                onChange={(e) => setField(companion.id, "bio", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <LabeledRegenWrap
              label="Backstory (2–4 paragraphs)"
              busy={!!sectionBusy[`${companion.id}::backstory`]}
              onRegen={() => void regenSection(companion, "backstory")}
            >
              <textarea
                value={val("backstory") as string}
                onChange={(e) => setField(companion.id, "backstory", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Rarity</label>
              <select
                value={(val("rarity") as string) || "common"}
                onChange={(e) => setField(companion.id, "rarity", e.target.value)}
                className="w-full rounded-lg bg-muted border border-border px-3 py-2 text-sm text-foreground"
              >
                {COMPANION_RARITIES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <AdminToyPatternsSection companionId={companion.id} />
            <Field label="Static portrait URL" value={(val("static_image_url") as string) || ""} onChange={(v) => setField(companion.id, "static_image_url", v || null)} />
            <Field label="Animated portrait URL" value={(val("animated_image_url") as string) || ""} onChange={(v) => setField(companion.id, "animated_image_url", v || null)} />
            <Field label="Border overlay URL (optional)" value={(val("rarity_border_overlay_url") as string) || ""} onChange={(v) => setField(companion.id, "rarity_border_overlay_url", v || null)} />
            <Field label="image_url (legacy)" value={(val("image_url") as string) || ""} onChange={(v) => setField(companion.id, "image_url", v || null)} />
            <LabeledRegenWrap
              label="Personality"
              busy={!!sectionBusy[`${companion.id}::personality`]}
              onRegen={() => void regenSection(companion, "personality")}
            >
              <textarea
                value={val("personality") as string}
                onChange={(e) => setField(companion.id, "personality", e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <LabeledRegenWrap
              label="Companion Prompt"
              busy={!!sectionBusy[`${companion.id}::system_prompt`]}
              onRegen={() => void regenSection(companion, "system_prompt")}
            >
              <textarea
                value={val("system_prompt") as string}
                onChange={(e) => setField(companion.id, "system_prompt", e.target.value)}
                rows={6}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y"
              />
            </LabeledRegenWrap>
            <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-foreground">Fantasy starters</span>
                <button
                  type="button"
                  disabled={!!sectionBusy[`${companion.id}::fantasy_starters`]}
                  onClick={() => void regenSection(companion, "fantasy_starters")}
                  title="Regenerate all four starters"
                  className="p-1.5 rounded-md border border-border bg-muted/40 text-muted-foreground hover:text-primary shrink-0"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", sectionBusy[`${companion.id}::fantasy_starters`] && "animate-spin")} />
                </button>
              </div>
              <ul className="space-y-2 text-[11px] text-muted-foreground">
                {((val("fantasy_starters") as { title: string; description: string }[]) || []).length === 0 ? (
                  <li>None — use refresh or lore tools.</li>
                ) : (
                  ((val("fantasy_starters") as { title: string; description: string }[]) || []).map((s, i) => (
                    <li key={i} className="border border-border/60 rounded-md p-2 bg-background/60">
                      <span className="font-semibold text-foreground/90">{s.title}</span>
                      <p className="mt-1 line-clamp-3">{s.description}</p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={() => void refreshLoreWithGrok(companion)}
            disabled={loreBusyId === companion.id}
            className="px-4 py-2 rounded-lg bg-violet-600/90 text-white text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 border border-violet-400/30"
          >
            {loreBusyId === companion.id ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Grok expanding lore…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" /> Refresh lore with Grok
              </>
            )}
          </button>
          <button onClick={() => saveCompanion(companion)} disabled={saving[companion.id] || !hasChanges(companion.id)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {saving[companion.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Changes
          </button>
          {hasChanges(companion.id) && (
            <button onClick={() => setEditData(prev => { const next = { ...prev }; delete next[companion.id]; return next; })} className="px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              <X className="h-4 w-4" /> Discard
            </button>
          )}
          {!companion.id.startsWith("cc-") ? (
            <button onClick={(e) => { e.stopPropagation(); toggleActive(companion); }} className="ml-auto px-4 py-2 rounded-lg bg-muted border border-border text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
              {companion.is_active ? <><EyeOff className="h-4 w-4" /> Deactivate</> : <><Eye className="h-4 w-4" /> Activate</>}
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // LIST VIEW
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-accent/25 bg-accent/5 p-4 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-foreground">Community forge saves</h3>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              type="button"
              disabled={repairVibBusy}
              onClick={() => void repairMissingVibrationPatterns()}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-600/85 text-white text-[10px] font-semibold border border-violet-400/30 hover:opacity-90 disabled:opacity-50"
              title="Assign patterns for any stock or forge row that has zero rows (does not overwrite existing)"
            >
              {repairVibBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Waves className="h-3 w-3" />}
              Repair missing toy patterns
            </button>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">custom_characters</span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Entries created from <strong className="text-foreground/90">Companion Forge → Create</strong>. Catalog rows
          are listed below under stock companions.
        </p>
        {forgedLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
            <Loader2 className="h-4 w-4 animate-spin shrink-0" /> Loading forged rows…
          </div>
        ) : forgedRows.length === 0 ? (
          <p className="text-xs text-muted-foreground py-1">No community forge rows yet.</p>
        ) : (
          <ul className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
            {forgedRows.map((row) => {
              const fr = row as Record<string, unknown>;
              const frRarity = normalizeCompanionRarity(typeof fr.rarity === "string" ? fr.rarity : undefined);
              const frGf =
                typeof fr.gradient_from === "string" && fr.gradient_from.trim() ? fr.gradient_from : "#7B2D8E";
              const frGt = typeof fr.gradient_to === "string" && fr.gradient_to.trim() ? fr.gradient_to : "#FF2D7B";
              const frOb =
                typeof fr.rarity_border_overlay_url === "string" && fr.rarity_border_overlay_url.trim()
                  ? fr.rarity_border_overlay_url
                  : null;
              return (
              <li
                key={String(fr.id)}
                className="flex items-stretch gap-3 text-xs border border-border/60 rounded-xl p-3 bg-gradient-to-br from-black/40 to-muted/20"
              >
                <div className="w-14 h-20 shrink-0">
                  <TierHaloPortraitFrame
                    variant="compact"
                    rarity={frRarity}
                    gradientFrom={frGf}
                    gradientTo={frGt}
                    overlayUrl={frOb}
                    aspectClassName="aspect-[7/10] w-full h-full"
                  >
                    <div
                      className="absolute inset-0 z-0"
                      style={{ background: `linear-gradient(135deg, ${frGf}, ${frGt})` }}
                    />
                    {row.image_url || row.avatar_url ? (
                      <img
                        src={(row.image_url || row.avatar_url)!}
                        alt=""
                        className="absolute inset-0 z-[1] h-full w-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="absolute inset-0 z-[2] flex items-center justify-center text-lg font-bold text-white/50">
                        {(row.name || "?").charAt(0)}
                      </span>
                    )}
                  </TierHaloPortraitFrame>
                </div>
                <div className="min-w-0 flex-1 flex flex-col gap-2">
                  <div>
                    <p className="font-semibold text-foreground truncate">{row.name}</p>
                    <p className="text-[10px] text-muted-foreground line-clamp-2">{row.tagline || "—"}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">{row.user_id}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black/40 text-muted-foreground border border-white/10">
                      {row.is_public ? "Public intent" : "Private"} · {row.approved ? "live on carousel" : "pending approval"}
                    </span>
                    <Link
                      to={`/companions/cc-${row.id}`}
                      state={{ from: "/admin?section=characters" }}
                      className="text-primary hover:underline text-[10px] font-medium"
                    >
                      Open profile
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-auto">
                    <button
                      type="button"
                      disabled={forgeEditLoadingId === row.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        void openForgeAdminEdit(row.id);
                      }}
                      className="px-2.5 py-1 rounded-lg border border-primary/40 text-primary text-[10px] font-semibold hover:bg-primary/10 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Full profile editor + per-section Grok refresh"
                    >
                      {forgeEditLoadingId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      ) : (
                        <Sparkles className="h-3 w-3 shrink-0" />
                      )}
                      Admin edit
                    </button>
                    <button
                      type="button"
                      disabled={forgeVibBusyId === row.id}
                      onClick={() => void reloadForgeVibrationPatterns(row.id)}
                      className="px-2.5 py-1 rounded-lg border border-violet-400/40 text-violet-200 text-[10px] font-medium hover:bg-violet-500/10 disabled:opacity-50 inline-flex items-center gap-1"
                      title="Rebuild Lovense slots from this row’s rarity (same as Character edit → Reload from rarity)"
                    >
                      {forgeVibBusyId === row.id ? (
                        <Loader2 className="h-3 w-3 animate-spin shrink-0" />
                      ) : (
                        <RefreshCw className="h-3 w-3 shrink-0" />
                      )}
                      Reload toy patterns
                    </button>
                    {!row.approved && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { approved: true, is_public: true })}
                        className="px-2.5 py-1 rounded-lg bg-primary/90 text-primary-foreground text-[10px] font-semibold hover:opacity-90 disabled:opacity-50"
                      >
                        Approve for gallery + carousel
                      </button>
                    )}
                    {row.approved && row.is_public && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { approved: false, is_public: false })}
                        className="px-2.5 py-1 rounded-lg bg-muted border border-border text-[10px] font-medium hover:bg-muted/80 disabled:opacity-50"
                      >
                        Hide from public rotation
                      </button>
                    )}
                    {row.approved && !row.is_public && (
                      <button
                        type="button"
                        disabled={forgeBusyId === row.id}
                        onClick={() => void updateForgeRow(row.id, { is_public: true })}
                        className="px-2.5 py-1 rounded-lg bg-accent/20 text-accent text-[10px] font-medium border border-accent/30 disabled:opacity-50"
                      >
                        Mark public again
                      </button>
                    )}
                  </div>
                </div>
              </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, tag, gender, role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-opacity shrink-0">
          <Plus className="h-4 w-4" /> New Companion
        </button>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} of {companions?.length || 0} companions</p>

      {filtered.map((companion) => (
        <div
          key={companion.id}
          className="rounded-xl border border-border bg-card hover:border-primary/30 transition-colors cursor-pointer"
          onClick={() => openEdit(companion.id)}
        >
          <div className="flex items-center gap-3 p-4">
            <div className="w-12 h-12 shrink-0">
              <TierHaloPortraitFrame
                variant="compact"
                rarity={normalizeCompanionRarity(companion.rarity)}
                gradientFrom={companion.gradient_from}
                gradientTo={companion.gradient_to}
                overlayUrl={companion.rarity_border_overlay_url}
                aspectClassName="aspect-square w-full h-full"
              >
                <div
                  className="absolute inset-0 z-0"
                  style={{ background: `linear-gradient(135deg, ${companion.gradient_from}, ${companion.gradient_to})` }}
                />
                {companion.static_image_url || companion.image_url ? (
                  <img
                    src={(companion.static_image_url || companion.image_url)!}
                    alt={companion.name}
                    className="absolute inset-0 z-[1] h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 z-[2] flex items-center justify-center text-lg font-bold text-white/80">
                    {companion.name.charAt(0)}
                  </span>
                )}
              </TierHaloPortraitFrame>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-foreground text-sm truncate">{companion.name}</h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${companion.is_active ? "bg-green-500/20 text-green-400" : "bg-muted text-muted-foreground"}`}>
                  {companion.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{companion.tagline}</p>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{companion.gender} · {companion.role} · {companion.tags.slice(0, 3).join(", ")}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); toggleActive(companion); }}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title={companion.is_active ? "Deactivate" : "Activate"}
              >
                {companion.is_active ? <Eye className="h-4 w-4 text-green-400" /> : <EyeOff className="h-4 w-4 text-muted-foreground" />}
              </button>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-12">No companions match your search.</p>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, disabled = false }: { label: string; value: string; onChange: (v: string) => void; disabled?: boolean }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-50" />
  </div>
);

const TextArea = ({ label, value, onChange, rows = 3, placeholder }: { label: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) => (
  <div>
    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
    <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} placeholder={placeholder} className="w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary transition-colors resize-y" />
  </div>
);

export default CompanionManager;
