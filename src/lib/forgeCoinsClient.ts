import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type SpendForgeCoinsResult = { ok: true; newBalance: number } | { ok: false; err: string; newBalance: number };

/**
 * Deducts FC and appends a row in `user_transactions` (see `spend_forge_coins` in DB).
 */
export async function spendForgeCoins(
  amount: number,
  transactionType: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<SpendForgeCoinsResult> {
  const { data, error } = await supabase.rpc("spend_forge_coins", {
    p_amount: amount,
    p_transaction_type: transactionType,
    p_description: description,
    p_metadata: (metadata ?? {}) as Json,
  });
  if (error) {
    return { ok: false, err: error.message, newBalance: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const o = row as { ok?: boolean; new_balance?: number; err?: string } | null;
  if (o?.ok) {
    return { ok: true, newBalance: typeof o.new_balance === "number" ? o.new_balance : 0 };
  }
  return { ok: false, err: o?.err || "spend_failed", newBalance: typeof o?.new_balance === "number" ? o.new_balance : 0 };
}

export async function creditForgeCoins(
  amount: number,
  transactionType: string,
  description: string,
  metadata?: Record<string, unknown>,
): Promise<SpendForgeCoinsResult> {
  const { data, error } = await supabase.rpc("credit_forge_coins", {
    p_amount: amount,
    p_transaction_type: transactionType,
    p_description: description,
    p_metadata: (metadata ?? {}) as Json,
  });
  if (error) {
    return { ok: false, err: error.message, newBalance: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const o = row as { ok?: boolean; new_balance?: number; err?: string } | null;
  if (o?.ok) {
    return { ok: true, newBalance: typeof o.new_balance === "number" ? o.new_balance : 0 };
  }
  return { ok: false, err: o?.err || "credit_failed", newBalance: typeof o?.new_balance === "number" ? o.new_balance : 0 };
}

export type PurchaseDiscoverResult =
  | { ok: true; alreadyOwned: boolean; newBalance: number; priceFc: number }
  | { ok: false; err: string; newBalance: number; priceFc: number };

export type ChatConsumeQuotaResult =
  | { ok: true; remainingFree: number; chargedFc: number; newBalance: number }
  | { ok: false; remainingFree: number; chargedFc: number; newBalance: number; err: string };

/** Records one text chat message against the daily free pool (or spends overage FC). */
export async function consumeChatMessageQuota(): Promise<ChatConsumeQuotaResult> {
  const { data, error } = await supabase.rpc("chat_consume_message_quota");
  if (error) {
    return { ok: false, remainingFree: 0, chargedFc: 0, newBalance: 0, err: error.message };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const o = row as {
    ok?: boolean;
    remaining_free?: number;
    charged_fc?: number;
    new_balance?: number;
    err?: string;
  } | null;
  if (o?.ok) {
    return {
      ok: true,
      remainingFree: typeof o.remaining_free === "number" ? o.remaining_free : 0,
      chargedFc: typeof o.charged_fc === "number" ? o.charged_fc : 0,
      newBalance: typeof o.new_balance === "number" ? o.new_balance : 0,
    };
  }
  return {
    ok: false,
    remainingFree: typeof o?.remaining_free === "number" ? o.remaining_free : 0,
    chargedFc: typeof o?.charged_fc === "number" ? o.charged_fc : 0,
    newBalance: typeof o?.new_balance === "number" ? o.new_balance : 0,
    err: o?.err || "quota_failed",
  };
}

export async function purchaseDiscoverCompanion(companionId: string): Promise<PurchaseDiscoverResult> {
  const { data, error } = await supabase.rpc("purchase_discover_companion", { p_companion_id: companionId });
  if (error) {
    return { ok: false, err: error.message, newBalance: 0, priceFc: 0 };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const o = row as {
    ok?: boolean;
    already_owned?: boolean;
    new_balance?: number;
    price_fc?: number;
    err?: string;
  } | null;
  if (o?.ok) {
    return {
      ok: true,
      alreadyOwned: Boolean(o.already_owned),
      newBalance: typeof o.new_balance === "number" ? o.new_balance : 0,
      priceFc: typeof o.price_fc === "number" ? o.price_fc : 0,
    };
  }
  return {
    ok: false,
    err: o?.err || "purchase_failed",
    newBalance: typeof o?.new_balance === "number" ? o.new_balance : 0,
    priceFc: typeof o?.price_fc === "number" ? o.price_fc : 0,
  };
}
