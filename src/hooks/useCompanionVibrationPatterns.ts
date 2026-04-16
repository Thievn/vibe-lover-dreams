import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type CompanionVibrationPatternRow = {
  id: string;
  display_name: string;
  sort_order: number;
  is_abyssal_signature: boolean;
  vibration_pattern_pool: { payload: unknown } | null;
};

export function useCompanionVibrationPatterns(companionId: string | undefined) {
  return useQuery({
    queryKey: ["companion-vibration-patterns", companionId],
    enabled: Boolean(companionId?.trim()),
    queryFn: async (): Promise<CompanionVibrationPatternRow[]> => {
      const { data: rows, error: e1 } = await supabase
        .from("companion_vibration_patterns")
        .select("id, display_name, sort_order, is_abyssal_signature, pool_pattern_id")
        .eq("companion_id", companionId!)
        .order("sort_order", { ascending: true });
      if (e1) throw e1;
      if (!rows?.length) return [];

      const poolIds = [...new Set(rows.map((r) => r.pool_pattern_id))];
      const { data: pools, error: e2 } = await supabase
        .from("vibration_pattern_pool")
        .select("id, payload")
        .in("id", poolIds);
      if (e2) throw e2;
      const byId = new Map((pools ?? []).map((p) => [p.id, p]));

      return rows.map((r) => ({
        id: r.id,
        display_name: r.display_name,
        sort_order: r.sort_order,
        is_abyssal_signature: r.is_abyssal_signature,
        vibration_pattern_pool: byId.get(r.pool_pattern_id)
          ? { payload: byId.get(r.pool_pattern_id)!.payload }
          : null,
      }));
    },
    staleTime: 60 * 1000,
  });
}
