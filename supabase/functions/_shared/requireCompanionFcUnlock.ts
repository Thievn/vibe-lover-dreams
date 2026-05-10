import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type CompanionUnlockResult = { ok: true } | { ok: false; message: string };

/**
 * Discover / catalog spend gate: user must have this companion in `user_discover_pins` (all unlock paths,
 * including free Common — no ledger row) **or** an FC `card_purchase` row, OR own the forge row (`custom_characters.user_id`).
 * Skips when id is empty or `forge-preview` (Forge studio / non-roster).
 */
export async function assertUserUnlockedCompanionForSpend(
  svc: SupabaseClient,
  userId: string,
  companionId: string,
): Promise<CompanionUnlockResult> {
  const cid = companionId.trim();
  if (!cid || cid === "forge-preview") return { ok: true };

  if (cid.startsWith("cc-")) {
    const rowPk = cid.slice(3);
    const { data: row, error } = await svc.from("custom_characters").select("user_id").eq("id", rowPk).maybeSingle();
    if (error) {
      console.error("requireCompanionFcUnlock: custom_characters", error.message);
      return { ok: false, message: "Could not verify companion access." };
    }
    const owner = String(row?.user_id ?? "").trim();
    if (owner && owner === userId) return { ok: true };
  }

  const { data: pinRow, error: pinErr } = await svc
    .from("user_discover_pins")
    .select("companion_id")
    .eq("user_id", userId)
    .eq("companion_id", cid)
    .maybeSingle();
  if (pinErr) {
    console.error("requireCompanionFcUnlock: user_discover_pins", pinErr.message);
    return { ok: false, message: "Could not verify companion access." };
  }
  if (pinRow?.companion_id === cid) return { ok: true };

  const { data: purchases, error: pErr } = await svc
    .from("user_transactions")
    .select("metadata")
    .eq("user_id", userId)
    .eq("transaction_type", "card_purchase")
    .order("created_at", { ascending: false })
    .limit(300);

  if (pErr) {
    console.error("requireCompanionFcUnlock: user_transactions", pErr.message);
    return { ok: false, message: "Could not verify card purchase." };
  }

  for (const row of purchases ?? []) {
    const meta = row.metadata as { companion_id?: unknown } | null;
    const purchasedId = typeof meta?.companion_id === "string" ? meta.companion_id.trim() : "";
    if (purchasedId && purchasedId === cid) return { ok: true };
  }

  return {
    ok: false,
    message:
      "This card is not in your vault yet. Acquire it from Discover (or open it from your collection) to use chat and images here.",
  };
}
