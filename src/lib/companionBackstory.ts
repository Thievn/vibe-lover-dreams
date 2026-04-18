import type { Companion } from "@/data/companions";

type BackstoryFields = { backstory?: string | null };

/**
 * Split DB or merged `backstory` into display paragraphs (blank-line separated).
 * Does not truncate — the full chronicle is shown.
 */
function splitBackstoryParagraphs(text: string): string[] {
  const parts = text
    .trim()
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length > 0) return parts;
  const single = text.trim();
  return single ? [single] : [];
}

/**
 * When there is no saved chronicle, show the bio as readable prose — never chop
 * a short line into fake "paragraphs" at fixed character indices.
 */
function fallbackParagraphsFromBio(bio: string): string[] {
  const text = bio.trim();
  if (!text) return ["Their story is still being written in the forge."];

  const byBlank = text
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (byBlank.length > 1) return byBlank;

  const block = byBlank[0] ?? text;
  // Long single block: split on sentence boundaries into a few readable chunks only
  if (block.length > 900) {
    const sentences = block.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length >= 6) {
      const n = Math.min(6, Math.ceil(sentences.length / 3));
      const out: string[] = [];
      const chunk = Math.ceil(sentences.length / n);
      for (let i = 0; i < sentences.length && out.length < 8; i += chunk) {
        out.push(sentences.slice(i, i + chunk).join(" "));
      }
      return out;
    }
  }

  return [block];
}

/**
 * Prefer DB `backstory`, then merged `companion.backstory`. Otherwise derive from `bio`
 * without mangling short copy.
 */
export function getCompanionBackstoryParagraphs(companion: Companion, db: BackstoryFields | undefined): string[] {
  const raw = (db?.backstory?.trim() || companion.backstory?.trim()) ?? "";
  if (raw) {
    const paras = splitBackstoryParagraphs(raw);
    if (paras.length > 0) return paras;
  }
  return fallbackParagraphsFromBio(companion.bio);
}
