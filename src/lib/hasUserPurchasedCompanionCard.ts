import { supabase } from "@/integrations/supabase/client";

/** True if the user has an FC `card_purchase` ledger row for this companion (Discover / catalog unlock). */
export async function hasUserPurchasedCompanionCard(userId: string, companionId: string): Promise<boolean> {
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
