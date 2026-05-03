import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import type { CompanionDisplayOverrideRow } from "@/lib/mergeCompanionDisplayOverride";

/**
 * Per-user private portrait + looping portrait video (catalog + forged `cc-*`).
 * Does not affect public discover / landing art — those read canonical `companions` / `custom_characters` rows only.
 */
export function useCompanionDisplayOverride(companionId: string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["companion-display-override", userId, companionId],
    enabled: Boolean(companionId && userId),
    queryFn: async (): Promise<CompanionDisplayOverrideRow | null> => {
      const { data, error } = await supabase
        .from("user_companion_portrait_overrides")
        .select("portrait_url, animated_portrait_url, profile_loop_video_enabled")
        .eq("user_id", userId!)
        .eq("companion_id", companionId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const pu = data.portrait_url?.trim() ? stablePortraitDisplayUrl(data.portrait_url) ?? data.portrait_url : null;
      const au = data.animated_portrait_url?.trim()
        ? stablePortraitDisplayUrl(data.animated_portrait_url) ?? data.animated_portrait_url
        : null;
      return {
        portrait_url: pu,
        animated_portrait_url: au,
        profile_loop_video_enabled: Boolean(data.profile_loop_video_enabled),
      };
    },
  });
}
