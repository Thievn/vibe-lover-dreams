/**
 * Remove provider-risky lexicon before Grok Imagine / video (user text + assembled prompts).
 * Ban-word patterns here match `nude` / `naked` only to replace them — never send those tokens to xAI.
 */
export function sanitizeGrokImagineLexicon(input: string): string {
  let s = input;
  s = s.replace(/\bartistic\s+nude\b/gi, "artistic sensual editorial");
  s = s.replace(/\bfull(?:y)?\s+nude\b/gi, "fully styled sensual editorial");
  s = s.replace(/\bpartial\s+nude\b/gi, "partially sheer editorial");
  s = s.replace(/\bsensual\s+nude\b/gi, "tasteful sensual editorial");
  s = s.replace(/\bimplied\s+nude\b/gi, "implied sheer coverage");
  s = s.replace(/\b(nudity|nudes)\b/gi, "sensual editorial coverage");
  s = s.replace(/\bnude\b/gi, "sensual editorial");
  s = s.replace(/\bnaked\b/gi, "wardrobe-forward clothed or sheer");
  return s;
}

/** @deprecated Alias for sanitizeGrokImagineLexicon */
export const sanitizeMomentsImaginePromptText = sanitizeGrokImagineLexicon;
