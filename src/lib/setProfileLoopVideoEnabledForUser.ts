import { supabase } from "@/integrations/supabase/client";
import type { DbCompanion } from "@/hooks/useCompanions";
import type { CompanionDisplayOverrideRow } from "@/lib/mergeCompanionDisplayOverride";
import { isLoopVideoStorageUrl } from "@/lib/companionMedia";

/**
 * Persists whether the **looping portrait MP4** is shown on profile/chat (vs still only).
 * Forged `cc-…` without an override row updates `custom_characters`; otherwise uses
 * `user_companion_portrait_overrides` (catalog + paid loop paths).
 */
export async function setProfileLoopVideoEnabledForUser(args: {
  userId: string;
  companionId: string;
  enabled: boolean;
  baseDb: DbCompanion;
  overrideRow: CompanionDisplayOverrideRow | null;
}): Promise<void> {
  const { userId, companionId, enabled, baseDb, overrideRow } = args;

  const animFromOverride = overrideRow?.animated_portrait_url?.trim() || "";
  const animFromBase = baseDb.animated_image_url?.trim() || "";
  const loopVideoUrl =
    (animFromOverride && isLoopVideoStorageUrl(animFromOverride) ? animFromOverride : null) ||
    (animFromBase && isLoopVideoStorageUrl(animFromBase) ? animFromBase : null) ||
    "";

  if (!loopVideoUrl) {
    throw new Error("No looping portrait video is saved for this companion yet.");
  }

  const stillFromOverride = overrideRow?.portrait_url?.trim() || "";
  const stillFromBase =
    baseDb.static_image_url?.trim() || baseDb.image_url?.trim() || baseDb.avatar_url?.trim() || "";
  const still = stillFromOverride || stillFromBase;
  if (!still) {
    throw new Error("No still portrait URL to pair with the loop.");
  }

  const isForged = companionId.startsWith("cc-");
  const hasOverrideRow = overrideRow != null;

  if (isForged && hasOverrideRow) {
    const { error } = await supabase
      .from("user_companion_portrait_overrides")
      .update({
        profile_loop_video_enabled: enabled,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("companion_id", companionId);
    if (error) throw error;
    return;
  }

  if (isForged && !hasOverrideRow) {
    const uuid = companionId.slice(3);
    const { error } = await supabase
      .from("custom_characters")
      .update({ profile_loop_video_enabled: enabled })
      .eq("id", uuid)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("user_companion_portrait_overrides").upsert(
    {
      user_id: userId,
      companion_id: companionId,
      portrait_url: still,
      animated_portrait_url: loopVideoUrl,
      profile_loop_video_enabled: enabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,companion_id" },
  );
  if (error) throw error;
}
