import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Companion } from "@/data/companions";
import { dbToCompanion, type DbCompanion } from "@/hooks/useCompanions";

export const VAULT_COLLECTION_QUERY_KEY = ["vault-collection"] as const;

export interface VaultCollectionData {
  pinOrder: string[];
  forgeCcIds: string[];
}

function buildVaultCompanions(
  dbCompanions: DbCompanion[],
  pinOrder: string[],
  forgeCcIds: string[],
): Companion[] {
  const byId = new Map(dbCompanions.map((c) => [c.id, c]));
  const seen = new Set<string>();
  const outDb: DbCompanion[] = [];

  for (const id of pinOrder) {
    const c = byId.get(id);
    if (c && !seen.has(id)) {
      outDb.push(c);
      seen.add(id);
    }
  }

  const forgeSet = new Set(forgeCcIds);
  const remaining = dbCompanions.filter((c) => forgeSet.has(c.id) && !seen.has(c.id));
  remaining.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  outDb.push(...remaining);

  return outDb.map(dbToCompanion);
}

/** Pins from Discover + your own forges (excludes admin “discover only” rows). */
export function useVaultCollection(userId: string | null, dbCompanions: DbCompanion[]) {
  const q = useQuery({
    queryKey: [...VAULT_COLLECTION_QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: async (): Promise<VaultCollectionData> => {
      const uid = userId!;
      const [pinsRes, forgeRes] = await Promise.all([
        supabase
          .from("user_discover_pins")
          .select("companion_id, created_at")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),
        supabase
          .from("custom_characters")
          .select("id")
          .eq("user_id", uid)
          .or("exclude_from_personal_vault.is.null,exclude_from_personal_vault.eq.false"),
      ]);

      if (pinsRes.error) throw pinsRes.error;
      if (forgeRes.error) throw forgeRes.error;

      const pinOrder = (pinsRes.data ?? []).map((r) => r.companion_id).filter(Boolean) as string[];
      const forgeCcIds = (forgeRes.data ?? []).map((r) => `cc-${r.id}`);
      return { pinOrder, forgeCcIds };
    },
    staleTime: 20 * 1000,
  });

  const companions = useMemo(() => {
    if (!userId || !q.data) return [];
    return buildVaultCompanions(dbCompanions, q.data.pinOrder, q.data.forgeCcIds);
  }, [userId, q.data, dbCompanions]);

  return {
    vaultCompanions: companions,
    isLoading: !!userId && q.isLoading,
    isFetching: q.isFetching,
    error: q.error,
  };
}
