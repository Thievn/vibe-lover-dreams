/**
 * Routes Grok Imagine prompt policy: strict SFW only for Forge **live preview**;
 * fuller sensual / erotic art direction for all other `generate-image` and server portrait renders.
 */

export type ImageContentTier = "forge_preview_sfw" | "full_adult_art";

export function resolveImageContentTier(input: {
  contentTier?: unknown;
  isPortrait?: boolean;
}): ImageContentTier {
  if (input.contentTier === "forge_preview_sfw") return "forge_preview_sfw";
  if (input.contentTier === "full_adult_art") return "full_adult_art";
  return input.isPortrait === true ? "forge_preview_sfw" : "full_adult_art";
}

/** Extra rules on the SFW portrait stack — Forge live preview only. */
export const FORGE_PREVIEW_IMAGINE_HARD_SFW = `
Forge live preview — **stricter than general roster SFW:**
- No visible areolas or nipples, including through sheer, wet, clingy, or body-tight fabric.
- No sexual acts, no explicit anatomy, no pornographic staging — fashion / pin-up / cover-art tease only.
`.trim();

/**
 * Universal base for all non–live-preview Imagine finals (prepended in the adult branch).
 */
export const UNIVERSAL_NON_PREVIEW_IMAGE_BASE = `
**Universal creative mandate (non–live-preview generations):**
Deliver sensual, high-quality imagery that may be **lewd, suggestive, and artistically erotic** when the scene calls for it — wet or sheer shirts, visible nipples through clothing, cleavage, underboob, sideboob, tasteful artistic nudity, and intimate sensual poses are in-bounds. For **male, futanari, or intersex** companions, a **tasteful, art-directed** depiction of penis is allowed when appropriate to identity and scene. Stay in **premium boudoir / editorial glamour** territory: avoid hardcore pornography, graphic penetration, obscene gynecological close-ups, or degrading angles — heat and explicitness serve character and mood, not shock value.
`.trim();
