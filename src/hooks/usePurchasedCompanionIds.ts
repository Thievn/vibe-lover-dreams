import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const PURCHASED_COMPANION_IDS_QUERY_KEY = ["purchased-companion-ids"] as const;

/**
 * Companion IDs the user has in their Discover collection: `user_discover_pins` (includes free Common)
 * plus any `user_transactions.card_purchase` metadata (legacy / overlap).
 */
export function usePurchasedCompanionIds(userId: string | null) {
  return useQuery({
    queryKey: [...PURCHASED_COMPANION_IDS_QUERY_KEY, userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Set<string>> => {
      const uid = userId!;
      const [pinsRes, txRes] = await Promise.all([
        supabase.from("user_discover_pins").select("companion_id").eq("user_id", uid),
        supabase
          .from("user_transactions")
          .select("metadata")
          .eq("user_id", uid)
          .eq("transaction_type", "card_purchase")
          .order("created_at", { ascending: false })
          .limit(400),
      ]);
      if (pinsRes.error) throw pinsRes.error;
      if (txRes.error) throw txRes.error;
      const ids = new Set<string>();
      for (const row of pinsRes.data ?? []) {
        const cid = row.companion_id;
        if (typeof cid === "string" && cid.length > 0) ids.add(cid);
      }
      for (const row of txRes.data ?? []) {
        const cid = (row.metadata as { companion_id?: unknown } | null)?.companion_id;
        if (typeof cid === "string" && cid.length > 0) ids.add(cid);
      }
      return ids;
    },
    staleTime: 45 * 1000,
  });
}
