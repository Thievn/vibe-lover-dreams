import type { Companion } from "@/data/companions";
const MAX_PARAS = 4;
const MIN_PARAS = 3;

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

  const sentences = text.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return [text];

  const targetParas = Math.min(MAX_PARAS, Math.max(MIN_PARAS, 3));
  const per = Math.max(1, Math.ceil(sentences.length / targetParas));
  const out: string[] = [];
  for (let i = 0; i < sentences.length && out.length < MAX_PARAS; i += per) {
    out.push(sentences.slice(i, i + per).join(" "));
  }
  if (out.length === 1) {
    const s = out[0]!;
    const t = Math.max(80, Math.floor(s.length / 3));
    return [s.slice(0, t).trim(), s.slice(t, t * 2).trim(), s.slice(t * 2).trim()].filter(Boolean);
  }
  if (out.length === 2) {
    const [a, b] = out;
    const mid = Math.max(1, Math.floor(b.length / 2));
    return [a, b.slice(0, mid).trim(), b.slice(mid).trim()];
  }
  return out.slice(0, MAX_PARAS);
}
