import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";
import { portraitUrlsEquivalent } from "@/lib/companionMedia";

/** Synthetic `CompanionGalleryRow.id` prefix for the canonical still tile. */
export const CANONICAL_PORTRAIT_GALLERY_ID_PREFIX = "canonical-card-portrait::";

/**
 * Ensures the card’s canonical still (from `custom_characters` / `companions`, before per-user override)
 * appears in gallery UIs so users can re-select it after setting a chat image as their portrait.
 */
export function prependCanonicalPortraitIfMissing(
  images: CompanionGalleryRow[],
  opts: {
    companionId: string;
    canonicalStillUrl: string | null | undefined;
    /** Shown on the synthetic row; defaults to ISO now. */
    sortTimestamp?: string;
  },
): CompanionGalleryRow[] {
  const canon = opts.canonicalStillUrl?.trim();
  if (!canon || !opts.companionId) return images;
  if (images.some((g) => portraitUrlsEquivalent(g.image_url, canon))) return images;
  const synthetic: CompanionGalleryRow = {
    id: `${CANONICAL_PORTRAIT_GALLERY_ID_PREFIX}${opts.companionId}`,
    image_url: canon,
    prompt: "Original card portrait",
    created_at: opts.sortTimestamp ?? new Date().toISOString(),
    saved_to_personal_gallery: null,
    is_video: false,
  };
  return [synthetic, ...images];
}
