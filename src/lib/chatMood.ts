/** Heuristic mood chip for chat header (v1 — no extra API). */
const MOODS = ["Teasing", "Horny", "Loving", "Possessive", "Playful", "Needy", "Dominant", "Soft"] as const;

export function deriveChatMood(affectionLevel: number, lastAssistantText: string): string {
  const t = lastAssistantText.toLowerCase();
  const keyword = (re: RegExp) => re.test(t);

  if (keyword(/\b(love|darling|baby|sweetheart|mine|yours)\b/)) return "Loving";
  if (keyword(/\b(brat|tease|edge|deny|beg)\b/)) return "Teasing";
  if (keyword(/\b(rough|pin|control|obey|kneel|sir|ma'am)\b/)) return "Dominant";
  if (keyword(/\b(possess|mark|claim|only mine)\b/)) return "Possessive";
  if (keyword(/\b(hehe|lol|fun|game|play)\b/)) return "Playful";

  const a = Math.max(0, Math.min(100, affectionLevel));
  if (a >= 75) return "Loving";
  if (a >= 50) return MOODS[Math.floor((a / 25) % MOODS.length)] ?? "Playful";
  if (a >= 25) return "Teasing";
  return "Playful";
}
