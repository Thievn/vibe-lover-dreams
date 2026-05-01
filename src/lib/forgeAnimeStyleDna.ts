/**
 * Anime Temptation tab — dominant 2D style lock for Imagine prompts.
 * Keep string literals in sync with `supabase/functions/_shared/forgeAnimeStyleDna.ts`.
 */

/** User-specified core style DNA (full expression). */
export const FORGE_ANIME_STYLE_DNA_FULL =
  "masterpiece, best quality, ultra-detailed 2D anime style, beautiful anime girl, clean anime lineart, sharp linework, vibrant anime colors, large expressive anime eyes with detailed highlights, glossy lips, soft anime shading, cel-shading, anime screentones, anime aesthetic, perfect anime proportions, dramatic anime hair with strong highlights and lowlights, beautiful detailed anime face";

/** SFW forge preview / card — same 2D mandate, portrait-safe wording. */
export const FORGE_ANIME_STYLE_DNA_PREVIEW =
  "masterpiece, best quality, ultra-detailed 2D anime illustration, clean anime lineart, sharp linework, vibrant anime colors, large expressive anime eyes with detailed highlights, glossy lips, soft anime shading, cel-shading, anime screentones, anime aesthetic, perfect stylized anime proportions, dramatic anime hair with strong highlights and lowlights, beautiful detailed anime face, tasteful SFW pin-up framing, fully clothed or modest coverage";

/** One line after the positive DNA — fights 3D / photoreal drift. */
export const FORGE_ANIME_ANTI_REALISM_LINE =
  "Avoid photoreal skin, 3D CGI, Octane render, Unreal Engine, game-engine screenshot, or semi-realistic doll shading — flat or soft-cel 2D anime illustration only.";

const LEGACY_TAB_TO_CANONICAL: Record<string, string> = {
  anime: "anime_temptation",
};

export function canonicalizeForgeTabIdForStyle(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  return LEGACY_TAB_TO_CANONICAL[t] ?? t;
}

export function isAnimeTemptationForgeTabId(raw: unknown): boolean {
  return canonicalizeForgeTabIdForStyle(raw) === "anime_temptation";
}

export type ForgeAnimeStyleTier = "full" | "preview";

/** Positive DNA + anti-realism; used at the very start of final Imagine prompts when Anime tab is active. */
export function buildAnimeTemptationStyleLead(tier: ForgeAnimeStyleTier): string {
  const core = tier === "preview" ? FORGE_ANIME_STYLE_DNA_PREVIEW : FORGE_ANIME_STYLE_DNA_FULL;
  return `${core} ${FORGE_ANIME_ANTI_REALISM_LINE}`.trim();
}

/** Match whether a prompt already includes the dominant anime style lock (client + server). */
export const FORGE_ANIME_STYLE_LOCK_REGEX = /ultra-detailed\s+2D\s+anime\s+style/i;

/** Same tab resolution as Edge `effectiveForgeArtStyleLabelForCharacterData` (shallow characterData). */
export function effectiveForgeArtStyleLabelForCharacterData(
  artStyle: string,
  characterData: { selectedForgeTab?: unknown; selected_forge_tab?: unknown; activeForgeTab?: unknown },
): string {
  const tab =
    characterData.selectedForgeTab ?? characterData.selected_forge_tab ?? characterData.activeForgeTab ?? "";
  if (isAnimeTemptationForgeTabId(tab)) return "Anime Style";
  const s = String(artStyle ?? "").trim();
  return s || "Photorealistic";
}
