/**
 * Mirror `src/lib/chatLikenessAnchors.ts` — keep `CHAT_LIKENESS_SUBJECT_FEATURES_INLINE` in sync for Edge + Vite.
 * Roster portrait = subject likeness only; menu = scene.
 */

export const CHAT_LIKENESS_SUBJECT_FEATURES_INLINE =
  "face shape, eyes, brows, nose, lips, mouth, teeth, hair, ears, ear jewelry or mods, skin, hands, fingers, nails, arms, legs, feet, body proportions, species markers, tattoos or scars, and art-style discipline";

/** Mirror `src/lib/chatLikenessAnchors.ts` — chat Imagine anti–default-chair binding. */
export const CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK = `**No default chair (binding):** Unless the menu or user text **explicitly** names a chair, stool, throne, bench, or vehicle seat, do **not** seat the subject in a generic office chair, dining chair, or velvet armchair. Match the described scene: standing, doorway or wall lean, walking, vanity or mirror arm-length POV, shower steam, bed (surface interaction), balcony railing, gym mirror, kitchen island, car interior, beach, trail, snowfield, etc. A random lone chair as the hero prop is a failure mode unless requested.`;

/** One-line for Imagine execution heads — chat session stills. */
export const CHAT_LIKENESS_EDGE_SAME_SUBJECT =
  "**Same roster companion:** facial identity must match the portrait URL + CHARACTER APPEARANCE — not a different photoreal woman. Only pose/room/outfit/light from the menu may differ.";
