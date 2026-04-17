/** Split long single-block copy into readable paragraphs for profile cards. */
export function splitProseIntoParagraphs(text: string, targetCount = 3): string[] {
  const t = text.trim();
  if (!t) return [];
  const blocks = t.split(/\n\s*\n+/).map((p) => p.trim()).filter(Boolean);
  if (blocks.length >= targetCount) return blocks.slice(0, targetCount);
  if (blocks.length > 1) return blocks;

  const body = blocks[0] ?? t;
  const sentences = body.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length < targetCount) return [body];

  const per = Math.max(1, Math.ceil(sentences.length / targetCount));
  const out: string[] = [];
  for (let i = 0; i < sentences.length && out.length < targetCount + 1; i += per) {
    out.push(sentences.slice(i, i + per).join(" "));
  }
  return out.length ? out : [body];
}
