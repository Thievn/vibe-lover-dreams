/**
 * True when the user line is only the emergency/safe word (ignores light punctuation / wrapping quotes).
 */
export function matchesSafeWord(message: string, word: string): boolean {
  const w = word.trim();
  if (!w) return false;
  const t = message.trim();
  if (!t) return false;
  const dequote = (s: string) =>
    s
      .replace(/^[\s"'`]+|[\s"'`.,!?…]+$/g, "")
      .trim();
  if (dequote(t).toUpperCase() === w.toUpperCase()) return true;
  const noEndPunct = t.replace(/[.!…?]+$/g, "").trim();
  if (noEndPunct.toUpperCase() === w.toUpperCase()) return true;
  return false;
}
