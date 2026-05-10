import { supabase } from "@/integrations/supabase/client";

/**
 * True if this user may use paid profile features for this companion:
 * `user_discover_pins` (all successful Discover unlocks, including free Common — no ledger row),
 * or legacy `user_transactions.card_purchase` rows.
 */
export async function hasUserPurchasedCompanionCard(userId: string, companionId: string): Promise<boolean> {
  const { data: pin, error: pinErr } = await supabase
    .from("user_discover_pins")
    .select("companion_id")
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .maybeSingle();
  if (!pinErr && pin?.companion_id === companionId) return true;

  const { data, error } = await supabase
    .from("user_transactions")
    .select("metadata")
    .eq("user_id", userId)
    .eq("transaction_type", "card_purchase")
    .order("created_at", { ascending: false })
    .limit(250);
  if (error || !data) return false;
  return data.some((row) => {
    const cid = (row.metadata as { companion_id?: unknown } | null)?.companion_id;
    return typeof cid === "string" && cid === companionId;
  });
}
