/**
 * xAI chat models that accept `image_url` in `/v1/chat/completions`.
 * Keep in sync with `scripts/backfill-character-reference.mjs` (`VISION_MODEL_FALLBACKS`).
 *
 * Prefer `grok-4.3` first — many accounts no longer expose `grok-2-vision*` slugs (HTTP 400 model not found).
 * Override with `GROK_VISION_MODEL` when your team enables a specific vision id in the xAI console.
 */
export const GROK_VISION_IMAGE_MODEL_FALLBACKS: readonly string[] = [
  "grok-4.3",
  "grok-2-vision-latest",
  "grok-2-vision",
];

export function grokVisionImageModelCandidates(
  getEnv: (k: string) => string | undefined,
): string[] {
  const env =
    getEnv("GROK_VISION_MODEL")?.trim() ||
    getEnv("GROK_APPEARANCE_VISION_MODEL")?.trim();
  return [...new Set([env, ...GROK_VISION_IMAGE_MODEL_FALLBACKS].filter(Boolean))] as string[];
}

/** Portrait realistic vs stylized — prefers classify-specific env, then shared vision env. */
export function grokVisionClassifyModelCandidates(
  getEnv: (k: string) => string | undefined,
): string[] {
  const env =
    getEnv("GROK_VISION_CLASSIFY_MODEL")?.trim() ||
    getEnv("GROK_VISION_MODEL")?.trim() ||
    getEnv("GROK_APPEARANCE_VISION_MODEL")?.trim();
  return [...new Set([env, ...GROK_VISION_IMAGE_MODEL_FALLBACKS].filter(Boolean))] as string[];
}
