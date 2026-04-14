import type { Companion } from "@/data/companions";
const MAX_PARAS = 4;
const MIN_PARAS = 2;

type BackstoryFields = { backstory?: string | null };

/**
 * Prefer DB `backstory` (split on blank lines). Otherwise derive 2–4 paragraphs from `bio`.
 */
export function getCompanionBackstoryParagraphs(companion: Companion, db: BackstoryFields | undefined): string[] {
  const fromDb = db?.backstory?.trim();
  if (fromDb) {
    const parts = fromDb
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts.slice(0, MAX_PARAS);
  }
  return paragraphsFromBio(companion.bio);
}

function paragraphsFromBio(bio: string): string[] {
  const text = bio.trim();
  if (!text) return ["Their story is still being written in the forge."];

  const sentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.length > 0);
  if (sentences.length <= MIN_PARAS) {
    const mid = Math.ceil(sentences.length / 2) || 1;
    const a = sentences.slice(0, mid).join(" ");
    const b = sentences.slice(mid).join(" ");
    return b ? [a, b] : [a];
  }

  const targetCount = Math.min(MAX_PARAS, Math.max(MIN_PARAS, Math.round(sentences.length / 2)));
  const per = Math.max(1, Math.ceil(sentences.length / targetCount));
  const out: string[] = [];
  for (let i = 0; i < sentences.length && out.length < MAX_PARAS; i += per) {
    out.push(sentences.slice(i, i + per).join(" "));
  }
  return out;
}
