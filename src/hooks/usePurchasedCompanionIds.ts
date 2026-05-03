import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PURCHASED_COMPANION_IDS_QUERY_KEY = ["purchased-companion-ids"] as const;

/**
 * Companion IDs the signed-in user has unlocked via Discover FC purchase (`user_transactions.card_purchase`).
 */
export function usePurchasedCompanionIds(userId: string | null) {
  return useQuery({
    queryKey: [...PURCHASED_COMPANION_IDS_QUERY_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Set<string>> => {
      const uid = userId!;
      const { data, error } = await supabase
        .from("user_transactions")
        .select("metadata")
        .eq("user_id", uid)
        .eq("transaction_type", "card_purchase")
        .order("created_at", { ascending: false })
        .limit(400);
      if (error) throw error;
      const ids = new Set<string>();
      for (const row of data ?? []) {
        const cid = (row.metadata as { companion_id?: unknown } | null)?.companion_id;
        if (typeof cid === "string" && cid.length > 0) ids.add(cid);
      }
      return ids;
    },
    staleTime: 45 * 1000,
  });
}
