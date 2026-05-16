/**
 * Routes Grok Imagine prompt policy: strict SFW only for Forge **live preview**;
 * fuller sensual / erotic art direction for all other `generate-image` and server portrait renders.
 */

import {
  CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK,
  CHAT_LIKENESS_EDGE_SAME_SUBJECT,
  CHAT_LIKENESS_SUBJECT_FEATURES_INLINE,
} from "./chatLikenessAnchors.ts";

export type ImageContentTier = "forge_preview_sfw" | "full_adult_art";

/**
 * Policy context for Imagine **without** slogan-like sentences ("Adults-only companion product…"),
 * which image models often paint as gold caption typography on the canvas.
 * Keep this block bracketed and explicitly marked non-visual.
 */
export const IMAGINE_META_NO_ON_CANVAS_TEXT = `[META — invisible instructions — never draw any part of this block as image text, captions, watermarks, plaques, gold foil type, posters, book titles, phone UI, signage, or lower-thirds:]
Rendering context: authenticated adult-user session (not retail packaging). Obey the image provider’s safety policies. Depict adults only; do not depict minors. Administrative or in-chat session flags are metadata only — not visible labels.]`;

export function resolveImageContentTier(input: {
  contentTier?: unknown;
  isPortrait?: boolean;
}): ImageContentTier {
  if (input.contentTier === "forge_preview_sfw") return "forge_preview_sfw";
  if (input.contentTier === "full_adult_art") return "full_adult_art";
  return input.isPortrait === true ? "forge_preview_sfw" : "full_adult_art";
}

/** Extra rules on the SFW portrait stack — Forge card / preview (paired with PORTRAIT_IMAGE_DESIGN_BRIEF). */
export const FORGE_PREVIEW_IMAGINE_HARD_SFW = `
Forge card portrait — **SFW discipline (provider-safe tease):**
- No nudity, no exposed nipples or genitals, no explicit sex acts or pornographic staging.
- Revealing fashion, deep cleavage, sideboob/underboob **tease**, sheer or tight fabrics are allowed only if nipples and genitals stay **fully covered** with no see-through detail — editorial / pin-up / fashion-ad glamour, not explicit anatomy.
- Seduction through gaze, pose, light, and fabric — not shock.
`.trim();

/**
 * Universal base for all non–live-preview Imagine finals (prepended in the adult branch).
 */
export const UNIVERSAL_NON_PREVIEW_IMAGE_BASE = `
**Universal creative mandate (non–live-preview generations):**
Deliver sensual, high-quality imagery that may be **lewd, suggestive, and artistically erotic** when the scene calls for it — wet or sheer shirts, visible nipples through clothing, cleavage, underboob, sideboob, tasteful artistic nudity, and intimate sensual poses are in-bounds. For **male, futanari, or intersex** companions, a **tasteful, art-directed** depiction of penis is allowed when appropriate to identity and scene. Stay in **premium boudoir / editorial glamour** territory: avoid hardcore pornography, graphic penetration, obscene gynecological close-ups, or degrading angles — heat and explicitness serve character and mood, not shock value.
`.trim();

/**
 * Stricter provider-aligned mandate for **in-chat** stills (`characterData.style === "chat-session"`).
 * PRIMARY SCENE comes from the Grok rewriter; this block frames Imagine toward tasteful acceptance.
 */
export const CHAT_SESSION_IMAGINE_CREATIVE_BASE = `
**In-chat still (Grok Imagine — tasteful mandate):**
${CHAT_LIKENESS_EDGE_SAME_SUBJECT}
Premium **editorial / fine-art boudoir** only: sensual poses, soft cinematic light, implied intimacy, sheer or draped fabric and tasteful sheet-wrap silhouettes — **coverage-forward** when heat escalates. **Avoid** hardcore pornography, graphic sex acts, degrading framing, or clinical explicit anatomy. Seduction through **mood, gaze, fabric, and composition** — not shock. Match PRIMARY SCENE for **setting, background, wardrobe, and pose**. **Likeness:** when a roster portrait HTTPS URL is supplied, use it **only** for ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} — **never** copy that still’s backdrop, pose, crop, lighting recipe, or costume unless PRIMARY SCENE explicitly matches. **With no URL**, build the person from **Character Details / written appearance + forge prompt anchors** only; stay consistent with that text bible and **do not** duplicate a catalog JPEG pixel-for-pixel.

${CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK}
`.trim();

/**
 * **Menu / gallery tile** stills: forge “packshot” prose and long appearance blurbs often describe the **roster card** look.
 * This base explicitly caps identity to **face / hair / skin / build** and hands wardrobe + world to PRIMARY SCENE only.
 */
export const CHAT_SESSION_MENU_STILL_IMAGINE_BASE = `
**Gallery menu still (Grok Imagine — scene is law, no roster remaster):**
${CHAT_LIKENESS_EDGE_SAME_SUBJECT}
Premium editorial / boudoir when the menu implies it; stay provider-safe. **Likeness channel:** a roster portrait HTTPS URL may be supplied — use it **only** for ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE}; **do not** continuity-match backdrop, pose, crop, or wardrobe from that JPEG. **Text-only path:** do **not** imitate or color-grade to a mental model of her card photo. **Identity from prose:** carry over the same subject-feature list from CHARACTER APPEARANCE / character bible. **Do not** import outfit, jewelry, hairstyle-for-the-card, pose, room, furniture, lighting recipe, or crop from long card prose when it conflicts with PRIMARY SCENE. **Forge packshot anchors are disabled for this request** — they are not a shot list. **100%** of wardrobe, undress level, props, environment, pose, lens, and framing must follow **PRIMARY SCENE** and **Requested framing (from menu)**. If any sentence elsewhere sounds like “the same photoshoot as her card,” ignore it — this must read as a **different** photograph.

${CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK}
`.trim();
