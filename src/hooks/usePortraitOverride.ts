import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";

/** Catalog-only: per-user still portrait for stock companions. Forged `cc-*` use `custom_characters` URLs. */
export function usePortraitOverrideUrl(companionId: string | undefined, userId: string | undefined) {
  const isForge = Boolean(companionId?.startsWith("cc-"));

  return useQuery({
    queryKey: ["portrait-override", userId, companionId],
    enabled: Boolean(companionId && userId && !isForge),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_companion_portrait_overrides")
        .select("portrait_url")
        .eq("user_id", userId!)
        .eq("companion_id", companionId!)
        .maybeSingle();
      if (error) throw error;
      const u = data?.portrait_url?.trim();
      return u ? stablePortraitDisplayUrl(u) ?? u : null;
    },
  });
}
