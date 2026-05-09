/**
 * Shared wording: roster portrait + CHARACTER APPEARANCE = **subject** only
 * (face, hair, eyes, lips, hands, legs, body, species). Outfit, pose, room,
 * props, and lighting come from the menu / USER SCENE — not the card background.
 *
 * Edge mirror: `supabase/functions/_shared/chatLikenessAnchors.ts` (keep `CHAT_LIKENESS_SUBJECT_FEATURES_INLINE` in sync).
 */

/** Features safe to mine from roster text or match from a likeness portrait URL. */
export const CHAT_LIKENESS_SUBJECT_FEATURES_INLINE =
  "face shape, eyes, brows, nose, lips, mouth, teeth, hair, skin, hands, fingers, nails, arms, legs, feet, body proportions, species markers, tattoos or scars, and art-style discipline";

/** What must not leak from a roster still or old card prose when the menu differs. */
export const CHAT_LIKENESS_SCENE_FORBIDDEN_INLINE =
  "backdrop, furniture, floor, sky, throne, bench, studio cyclorama, marketing set, props, crop geometry, catalog head-tilt pose, stare-into-lens portrait framing, or costume from that photo or card text";

/**
 * Opening block for menu-tier chat still prompts (`resolveChatImageGenerationPrompt`).
 * Keeps old + new cards consistent: subject vs scene.
 */
export const CHAT_LIKENESS_SUBJECT_ANCHOR = `**SUBJECT (read first):** The stored profile/roster picture is **not** a location or wardrobe brief. Use CHARACTER APPEARANCE (and the roster portrait URL when the pipeline supplies one) **only** for ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE}. **Do not import from roster imagery or long appearance blurbs:** ${CHAT_LIKENESS_SCENE_FORBIDDEN_INLINE}. The block under **Requested framing (from menu)** defines **outfit, room, pose, props, camera, and light** — it always overrides conflicting catalog prose.`;

/** Second paragraph merged after menu lines — reference URL may or may not exist server-side. */
export const CHAT_LIKENESS_SCENE_PRIMACY_FOOTER =
  "**Scene primacy (non-negotiable):** The block under **Requested framing (from menu)** is the **sole** authority for **location, background, architecture, time of day, weather, furniture, wardrobe, pose, props, interaction with props, lens height, and camera distance**. The **Exposure / tone context** section sets SFW vs lewd vs artistic-nude **band only** — it must **never** replace the menu’s place/outfit/pose with a generic bedroom, bathroom mirror, studio bust, or catalog three-quarter. **Likeness channel:** When a roster portrait HTTPS URL is available to the image model, use it **only** for " +
  CHAT_LIKENESS_SUBJECT_FEATURES_INLINE +
  "; **never** copy its backdrop, crop, pose, lighting recipe, or wardrobe unless this menu explicitly matches that shot. **With no URL**, likeness = CHARACTER APPEARANCE + body type + species **from words only** — still **forbidden:** remastering the catalog packshot layout. Each preset must read as a **different photoshoot** in that **exact** scenario.";

/** FAB wrap: reinforces anatomy list after pasted `appearance_reference` prose. */
export const CHAT_LIKENESS_WRAP_KEEP_LINE = `Change outfit, pose, background, and lighting completely while keeping the **same** ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} — **not** the old photo’s room, props, or costume.`;
