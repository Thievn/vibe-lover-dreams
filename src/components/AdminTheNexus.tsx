import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { mapSupabaseCustomCharacterRow, type DbCompanion } from "@/hooks/useCompanions";
import TheNexus from "@/components/TheNexus";

/**
 * Admin lab: merge from your own forges plus approved public gallery only
 * (never another user’s private companions). Unlimited — no credits, no cooldown.
 */
export default function AdminTheNexus() {
  const [userId, setUserId] = useState<string | null>(null);
  const [pool, setPool] = useState<DbCompanion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPool = useCallback(async (uid: string) => {
    setLoading(true);
    setError(null);
    try {
      const [mineRes, pubRes] = await Promise.all([
        supabase
          .from("custom_characters")
          .select("*")
          .eq("user_id", uid)
          .or("exclude_from_personal_vault.is.null,exclude_from_personal_vault.eq.false")
          .order("created_at", { ascending: false }),
        supabase
          .from("custom_characters")
          .select("*")
          .eq("is_public", true)
          .eq("approved", true)
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (mineRes.error) throw mineRes.error;
      if (pubRes.error) throw pubRes.error;

      const byId = new Map<string, DbCompanion>();
      const mineRows = (mineRes.data ?? []) as Record<string, unknown>[];
      const pubRows = (pubRes.data ?? []) as Record<string, unknown>[];

      for (const r of mineRows) {
        byId.set(`cc-${String(r.id)}`, mapSupabaseCustomCharacterRow(r));
      }
      for (const r of pubRows) {
        const id = `cc-${String(r.id)}`;
        if (!byId.has(id)) byId.set(id, mapSupabaseCustomCharacterRow(r));
      }

      const list = [...byId.values()].sort((a, b) => {
        const aMine = a.user_id === uid ? 1 : 0;
        const bMine = b.user_id === uid ? 1 : 0;
        if (aMine !== bMine) return bMine - aMine;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });

      setPool(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load Nexus pool.");
      setPool([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (cancelled) return;
      if (!uid) {
        setUserId(null);
        setPool([]);
        setLoading(false);
        return;
      }
      setUserId(uid);
      await loadPool(uid);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadPool]);

  if (!userId) {
    return <p className="text-sm text-muted-foreground">Sign in as admin to use the lab.</p>;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="text-sm">Loading forge & gallery pool…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-[1.75rem] border border-border/80 bg-card/30 backdrop-blur-md overflow-hidden">
      <div className="px-6 py-4 border-b border-border/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-gothic text-2xl gradient-vice-text">The Nexus · Admin lab</h2>
          <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            Merge your vault cards with each other, or with approved public gallery originals only. Other users’ private
            forges never appear here. No credits, no cooldown — output is saved to your admin vault for testing.
          </p>
        </div>
        <span className="text-xs font-semibold uppercase tracking-widest text-accent shrink-0">Unlimited</span>
      </div>
      <div className="p-4 md:p-6">
        <TheNexus
          userId={userId}
          forgeParents={pool}
          tokensBalance={0}
          mode="admin"
          onCreditsChanged={() => void loadPool(userId)}
        />
      </div>
    </div>
  );
}
