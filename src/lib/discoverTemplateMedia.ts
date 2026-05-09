import type { DbCompanion } from "@/hooks/useCompanions";

/**
 * Discover-listed forge cards (`custom_characters` public + approved) share one canonical row.
 * Looping portrait video must never live on that shared row — only on
 * `user_companion_portrait_overrides` per user (including staff previews).
 */
export function isPublicApprovedDiscoverForgeTemplate(db: DbCompanion | null | undefined): boolean {
  if (!db?.id?.startsWith("cc-")) return false;
  return Boolean(db.is_public && db.approved);
}

/** Removes shared looping fields from the canonical forge row for Discover templates. */
export function stripDiscoverForgeTemplateCanonicalLoop(db: DbCompanion | null): DbCompanion | null {
  if (!db) return null;
  if (!isPublicApprovedDiscoverForgeTemplate(db)) return db;
  return {
    ...db,
    animated_image_url: null,
    profile_loop_video_enabled: false,
  };
}

/** Discover grid / marketing: never show looping video on the tile — still portrait only. */
export function discoverListingPortraitDbSlice(db: DbCompanion): DbCompanion {
  return {
    ...db,
    animated_image_url: null,
    profile_loop_video_enabled: false,
  };
}
