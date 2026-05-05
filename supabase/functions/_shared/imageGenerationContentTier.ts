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
Premium **editorial / fine-art boudoir** only: sensual poses, soft cinematic light, implied intimacy, artistic partial or full nude when the scene warrants it, draped or sheer fabric, perfume-ad glamour. **Avoid** hardcore pornography, graphic sex acts, degrading framing, or clinical explicit anatomy. Seduction through **mood, gaze, fabric, and composition** — not shock. Match PRIMARY SCENE for **setting, background, wardrobe, and pose**. **No reference photograph is supplied** — build the person from **Character Details / written appearance + forge prompt anchors** only; stay consistent with that text bible, but **do not** try to duplicate a catalog or profile JPEG pixel-for-pixel.
`.trim();

/**
 * **Menu / gallery tile** stills: forge “packshot” prose and long appearance blurbs often describe the **roster card** look.
 * This base explicitly caps identity to **face / hair / skin / build** and hands wardrobe + world to PRIMARY SCENE only.
 */
export const CHAT_SESSION_MENU_STILL_IMAGINE_BASE = `
**Gallery menu still (Grok Imagine — scene is law, no roster remaster):**
Premium editorial / boudoir when the menu implies it; stay provider-safe. **No reference photograph is uploaded** — do **not** imitate, continuity-match, or color-grade to match any profile / catalog / roster JPEG you might imagine from the product. **Identity caps (text only):** carry over **face shape, hair, eyes, skin, species markers, and body-type scale** from CHARACTER APPEARANCE / character bible. **Do not** import outfit, jewelry, hairstyle-for-the-card, pose, room, furniture, lighting recipe, or crop from that prose when it conflicts with PRIMARY SCENE. **Forge packshot anchors are disabled for this request** — they are not a shot list. **100%** of wardrobe, undress level, props, environment, pose, lens, and framing must follow **PRIMARY SCENE** and **Requested framing (from menu)**. If any sentence elsewhere sounds like “the same photoshoot as her card,” ignore it — this must read as a **different** photograph.
`.trim();
