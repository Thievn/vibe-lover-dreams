import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CompanionRelationship } from "@/hooks/useCompanionRelationship";
import type { DashboardInsights } from "@/lib/dashboardInsights";

export const DASHBOARD_INSIGHTS_QUERY_KEY = ["dashboard-insights"] as const;

export type { DashboardInsights } from "@/lib/dashboardInsights";

async function fetchInsights(userId: string): Promise<DashboardInsights> {
  const [
    toyRes,
    msgRes,
    relRes,
    txRes,
  ] = await Promise.all([
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .not("lovense_command", "is", null),
    supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("companion_relationships")
      .select(
        "id,user_id,companion_id,affection_level,chat_affection_level,chat_affection_progress,breeding_progress,breeding_stage,last_interaction,created_at,updated_at,tts_voice_preset",
      )
      .eq("user_id", userId)
      .order("last_interaction", { ascending: false }),
    supabase
      .from("user_transactions")
      .select("id,credits_change,transaction_type,description,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  if (toyRes.error) throw toyRes.error;
  if (msgRes.error) throw msgRes.error;
  if (relRes.error) throw relRes.error;
  if (txRes.error) throw txRes.error;

  return {
    toySyncCount: toyRes.count ?? 0,
    chatMessageCount: msgRes.count ?? 0,
    relationships: (relRes.data ?? []) as CompanionRelationship[],
    transactions: txRes.data ?? [],
  };
}

export function useDashboardInsights(userId: string | null) {
  return useQuery({
    queryKey: [...DASHBOARD_INSIGHTS_QUERY_KEY, userId],
    enabled: !!userId,
    queryFn: () => fetchInsights(userId!),
    staleTime: 45 * 1000,
  });
}
