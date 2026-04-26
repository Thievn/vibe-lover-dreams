/**
 * Canonical portrait “trading card” ratio for Lustforge: 2:3 (width:height).
 * Stills, Grok/Tensor video, and UI shells align on this; legacy 3:4 and 9:16 uploads may still be accepted for chat.
 */

export const PORTRAIT_CARD_ASPECT = 2 / 3;

export const PORTRAIT_ASPECT_TOLERANCE = 0.07;

/** Tailwind v3 arbitrary ratio for card portraits (width ÷ height = 2/3). */
export const PORTRAIT_CARD_ASPECT_CLASS = "aspect-[2/3]";

/**
 * xAI / Grok profile loops often render as ~9:16 even when 2:3 is requested. Using this shell for the
 * active loop avoids mismatch with a 2:3 still + 9:16 video (ugly double letterboxing) and matches object-cover
 * to the file so head/feet are not cropped vs a wider card.
 */
export const PROFILE_LOOP_VIDEO_ASPECT_CLASS = "aspect-[9/16]";

const LEGACY_VERTICAL_RATIOS = [2 / 3, 3 / 4, 9 / 16] as const;

/** Strict: portrait-oriented image matching the 2:3 card target. */
export function isPortraitCardRatio(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  if (width >= height) return false;
  const r = width / height;
  return Math.abs(r - PORTRAIT_CARD_ASPECT) <= PORTRAIT_ASPECT_TOLERANCE;
}

/**
 * For “set as portrait” / gallery: accept 2:3 (preferred), 3:4, or 9:16 so existing media keeps working
 * after the sitewide ratio change.
 */
export function isAcceptableChatPortraitUpload(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  if (width >= height) return false;
  const r = width / height;
  return LEGACY_VERTICAL_RATIOS.some((target) => Math.abs(r - target) <= PORTRAIT_ASPECT_TOLERANCE);
}
