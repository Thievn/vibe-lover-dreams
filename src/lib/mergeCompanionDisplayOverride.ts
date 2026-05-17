import type { DbCompanion } from "@/hooks/useCompanions";
import { isLoopVideoStorageUrl, stablePortraitDisplayUrl } from "@/lib/companionMedia";

export type CompanionDisplayOverrideRow = {
  portrait_url: string | null;
  animated_portrait_url: string | null;
  profile_loop_video_enabled: boolean;
};

/**
 * Merges the signed-in user’s private portrait / loop settings over the shared DB row (profile + chat only).
 * When an override row exists, private loop is shown only if enabled + URL; otherwise animated portrait is cleared
 * so a canonical row loop is not leaked to that user’s session.
 */
export function mergeCompanionDisplayWithUserOverride(
  db: DbCompanion | null,
  override: CompanionDisplayOverrideRow | null | undefined,
): DbCompanion | null {
  if (!db) return null;
  if (!override) return db;

  const stillRaw = override.portrait_url?.trim() || null;
  const still = stillRaw ? stablePortraitDisplayUrl(stillRaw) ?? stillRaw : null;
  const animRaw = override.animated_portrait_url?.trim() || null;
  const anim = animRaw ? stablePortraitDisplayUrl(animRaw) ?? animRaw : null;
  const overrideLoopOn = Boolean(
    anim && override.profile_loop_video_enabled && isLoopVideoStorageUrl(anim),
  );

  const baseAnimRaw = db.animated_image_url?.trim() || null;
  const baseAnim = baseAnimRaw ? stablePortraitDisplayUrl(baseAnimRaw) ?? baseAnimRaw : null;
  const baseLoopOn = Boolean(
    db.profile_loop_video_enabled && baseAnim && isLoopVideoStorageUrl(baseAnim),
  );

  const usePrivateLoop =
    overrideLoopOn || (override.profile_loop_video_enabled && !anim && baseLoopOn);
  const resolvedAnim = overrideLoopOn
    ? anim
    : override.profile_loop_video_enabled && baseLoopOn
      ? baseAnim
      : null;

  return {
    ...db,
    ...(still ? { static_image_url: still, image_url: still } : {}),
    animated_image_url: usePrivateLoop ? resolvedAnim : null,
    profile_loop_video_enabled: usePrivateLoop,
  };
}
