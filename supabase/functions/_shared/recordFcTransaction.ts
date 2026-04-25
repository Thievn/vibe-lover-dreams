import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

/**
 * Inserts a row in `user_transactions` (service role — RLS bypass).
 * Call after `profiles.tokens_balance` is updated so `balance_after` matches.
 */
export async function recordFcTransaction(
  supabase: SupabaseClient,
  args: {
    userId: string;
    creditsChange: number;
    balanceAfter: number;
    transactionType: string;
    description: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const { error } = await supabase.from("user_transactions").insert({
    user_id: args.userId,
    credits_change: args.creditsChange,
    balance_after: args.balanceAfter,
    transaction_type: args.transactionType,
    description: args.description,
    metadata: args.metadata ?? {},
  });
  if (error) {
    console.error("recordFcTransaction", error);
  }
}
