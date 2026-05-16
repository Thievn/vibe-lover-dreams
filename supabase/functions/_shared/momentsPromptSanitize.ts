/**
 * Moments / chat-session stills: remove provider-risky and product-banned substrings
 * before Grok Imagine. Keeps "sensual / editorial / lingerie / sheer" vocabulary.
 */
export function sanitizeMomentsImaginePromptText(input: string): string {
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
