import { supabase } from "@/integrations/supabase/client";
import { isVideoPortraitUrl, stablePortraitDisplayUrl } from "@/lib/companionMedia";

/**
 * Sets the companion still portrait for **this user only** (profile + chat).
 * Never mutates public `companions` / `custom_characters` art used on discover / landing.
 * If a **looping portrait MP4** is already stored on the override row, it is kept so you can
 * switch between still and loop from the profile toggle instead of losing the clip.
 */
export async function setCompanionPortraitFromGalleryUrl(args: {
  userId: string;
  companionId: string;
  imageUrl: string;
  /**
   * When the override row has no clip yet, copy the looping MP4 from the canonical
   * `custom_characters` / `companions` row (e.g. admin-generated loop before any override existed).
   */
  fallbackLoopVideoUrl?: string | null;
  /** Used with `fallbackLoopVideoUrl` so “show loop on profile” matches the card. */
  fallbackLoopVideoEnabled?: boolean;
}): Promise<void> {
  const { userId, companionId, imageUrl, fallbackLoopVideoUrl, fallbackLoopVideoEnabled } = args;
  const stable = stablePortraitDisplayUrl(imageUrl) ?? imageUrl.trim();

  const { data: existing } = await supabase
    .from("user_companion_portrait_overrides")
    .select("animated_portrait_url, profile_loop_video_enabled")
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .maybeSingle();

  const existingAnim = typeof existing?.animated_portrait_url === "string" ? existing.animated_portrait_url.trim() : "";
  const fallback = typeof fallbackLoopVideoUrl === "string" ? fallbackLoopVideoUrl.trim() : "";
  const fromOverride = Boolean(existingAnim && isVideoPortraitUrl(existingAnim));
  const fromFallback = Boolean(!fromOverride && fallback && isVideoPortraitUrl(fallback));
  const keepStoredLoopFile = fromOverride || fromFallback;
  const animatedToStore = fromOverride ? existingAnim : fromFallback ? fallback : null;
  const loopEnabledToStore = keepStoredLoopFile
    ? fromOverride
      ? Boolean(existing?.profile_loop_video_enabled)
      : Boolean(fallbackLoopVideoEnabled ?? true)
    : false;

  const { error } = await supabase.from("user_companion_portrait_overrides").upsert(
    {
      user_id: userId,
      companion_id: companionId,
      portrait_url: stable,
      animated_portrait_url: animatedToStore,
      profile_loop_video_enabled: loopEnabledToStore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,companion_id" },
  );
  if (error) throw error;
}
