/** Advanced mood detector for chat header - v2 */
const MOODS = [
  "Teasing", 
  "Horny", 
  "Loving", 
  "Possessive", 
  "Playful", 
  "Needy", 
  "Dominant", 
  "Soft", 
  "Seductive",
  "Bratty",
  "Intense",
  "Shy",
  "Craving"
] as const;

type Mood = typeof MOODS[number];

export function deriveChatMood(
  affectionLevel: number,
  lastAssistantText: string,
  companionPersonality: string = "",   // e.g. "bratty dominant caring mommy"
  recentContext: string[] = []         // Optional: last 2-3 messages for better context
): Mood {

  const text = (lastAssistantText + " " + recentContext.join(" ")).toLowerCase();
  const personality = companionPersonality.toLowerCase();

  // === High Priority Signals (strongest keywords first) ===
  if (/(\b(love|darling|baby|sweetheart|my love|forever)\b)/.test(text)) return "Loving";
  if (/(\b(possess|mine|only mine|claim|marked|belong to me)\b)/.test(text)) return "Possessive";
  if (/(\b(rough|hard|pin|control|kneel|obey|good girl|good boy|sir|ma'am)\b)/.test(text)) return "Dominant";
  if (/(\b(brat|tease|edge|deny|beg|please|more)\b)/.test(text)) return "Teasing";
  if (/(\b(horny|wet|ache|need|crave|fuck|cock|pussy|cum|throb)\b)/.test(text)) return "Horny";
  if (/(\b(hehe|lol|play|game|fun|ticklish|mischief)\b)/.test(text)) return "Playful";
  if (/(\b(shy|blush|nervous|embarrassed)\b)/.test(text)) return "Shy";

  // === Personality-aware boosts ===
  if (personality.includes("brat") && /tease|brat|deny/i.test(text)) return "Bratty";
  if (personality.includes("dominant") && affectionLevel > 65) return "Dominant";
  if (personality.includes("caring") && affectionLevel > 70) return "Loving";

  // === Affection + Context fallback ===
  const a = Math.max(0, Math.min(100, affectionLevel));

  if (a >= 90) return "Loving";
  if (a >= 75) return affectionLevel > 82 ? "Seductive" : "Loving";
  if (a >= 60) return /horny|wet|ache/i.test(text) ? "Horny" : "Seductive";
  if (a >= 45) return "Teasing";
  if (a >= 30) return "Playful";
  if (a >= 15) return "Needy";

  return "Soft";
}