/**
 * Forge "Personalities" section — one pick per sub-category.
 * Stored on `custom_characters.personality_forge` and surfaced in chat / Live Call prompts.
 */

const KEYS = [
  "timePeriod",
  "personalityType",
  "speechStyle",
  "sexualEnergy",
  "relationshipVibe",
] as const;

export type ForgePersonalityKey = (typeof KEYS)[number];

export type ForgePersonalityProfile = {
  timePeriod: string;
  personalityType: string;
  speechStyle: string;
  sexualEnergy: string;
  relationshipVibe: string;
};

export const FORGE_TIME_PERIODS = [
  "Modern Day",
  "Medieval Fantasy",
  "Ancient Greece/Mythology",
  "Victorian Era",
  "Cyberpunk/Futuristic",
  "Post-Apocalyptic",
  "Dark Fantasy",
  "Ancient Egypt",
  "1980s Retro",
  "Feudal Japan",
] as const;

export const FORGE_PERSONALITY_TYPES = [
  "Sweet & Loving",
  "Shy & Innocent",
  "Bratty & Teasing",
  "Playful & Flirty",
  "Dominant & Seductive",
  "Obsessive & Possessive",
  "Gentle & Caring",
  "Wild & Unhinged",
] as const;

export const FORGE_SPEECH_STYLES = [
  "Soft & Gentle",
  "Modern & Casual",
  "Playful & Witty",
  "Elegant & Refined",
  "Vulgar & Crude",
  "Teasing & Sarcastic",
  "Fantasy/Archaic",
] as const;

export const FORGE_SEXUAL_ENERGIES = [
  "Pure & Innocent",
  "Submissive & Eager",
  "Switch",
  "Sensual & Romantic",
  "Shameless Slut",
  "Dominant & Controlling",
  "Bratty Masochist",
  "Depraved & Extreme",
] as const;

export const FORGE_RELATIONSHIP_VIBES = [
  "Devoted Girlfriend",
  "Loyal Wife",
  "Playful FWB",
  "Possessive Yandere",
  "Secret Forbidden Love",
  "Worshiping Pet",
] as const;

export const FORGE_PERSONALITY_BY_KEY: Record<ForgePersonalityKey, readonly string[]> = {
  timePeriod: FORGE_TIME_PERIODS,
  personalityType: FORGE_PERSONALITY_TYPES,
  speechStyle: FORGE_SPEECH_STYLES,
  sexualEnergy: FORGE_SEXUAL_ENERGIES,
  relationshipVibe: FORGE_RELATIONSHIP_VIBES,
};

const LABELS: Record<ForgePersonalityKey, string> = {
  timePeriod: "Time / world",
  personalityType: "Personality",
  speechStyle: "Speech",
  sexualEnergy: "Sexual energy",
  relationshipVibe: "Relationship",
};

export const DEFAULT_FORGE_PERSONALITY: ForgePersonalityProfile = {
  timePeriod: FORGE_TIME_PERIODS[0]!,
  personalityType: FORGE_PERSONALITY_TYPES[0]!,
  speechStyle: FORGE_SPEECH_STYLES[0]!,
  sexualEnergy: FORGE_SEXUAL_ENERGIES[0]!,
  relationshipVibe: FORGE_RELATIONSHIP_VIBES[0]!,
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function matchPool(pool: readonly string[], value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const exact = pool.find((p) => p === v);
  if (exact) return exact;
  const lo = v.toLowerCase();
  return pool.find((p) => p.toLowerCase() === lo);
}

/**
 * Coerce API/DB json into a valid profile (fills missing keys from defaults).
 */
export function normalizeForgePersonality(raw: unknown): ForgePersonalityProfile {
  const out: ForgePersonalityProfile = { ...DEFAULT_FORGE_PERSONALITY };
  if (!raw || typeof raw !== "object") return out;
  const o = raw as Record<string, unknown>;
  for (const key of KEYS) {
    const pool = FORGE_PERSONALITY_BY_KEY[key];
    const str = typeof o[key] === "string" ? (o[key] as string) : "";
    const hit = matchPool(pool, str);
    if (hit) out[key] = hit;
  }
  return out;
}

export function randomForgePersonality(): ForgePersonalityProfile {
  return {
    timePeriod: pick([...FORGE_TIME_PERIODS]),
    personalityType: pick([...FORGE_PERSONALITY_TYPES]),
    speechStyle: pick([...FORGE_SPEECH_STYLES]),
    sexualEnergy: pick([...FORGE_SEXUAL_ENERGIES]),
    relationshipVibe: pick([...FORGE_RELATIONSHIP_VIBES]),
  };
}

/** Single-line label for legacy `personality` string and portrait prompts. */
export function forgePersonalityLabel(p: ForgePersonalityProfile): string {
  return [p.timePeriod, p.personalityType, p.speechStyle, p.sexualEnergy, p.relationshipVibe].join(" · ");
}

/** Readable lines for design-lab / system seeds. */
export function forgePersonalitySeedsProse(p: ForgePersonalityProfile): string {
  return KEYS.map((k) => `${LABELS[k]}: ${p[k]}`).join("\n");
}

function firstSubstantiveTokenMatch(pool: readonly string[], haystack: string): string | undefined {
  const t = haystack.toLowerCase();
  for (const opt of pool) {
    if (t.includes(opt.toLowerCase())) return opt;
  }
  for (const opt of pool) {
    const head = opt
      .split(/[&,]/)
      .map((s) => s.trim())
      .find((s) => s.length > 2);
    if (head && t.includes(head.toLowerCase())) return opt;
  }
  return undefined;
}

/**
 * Best-effort: infer picks from long-form Grok text (roulette) without clobbering on no match.
 */
export function inferForgePersonalityFromText(
  text: string,
  current: ForgePersonalityProfile,
): ForgePersonalityProfile {
  const t = (text || "").toLowerCase();
  if (t.length < 8) return current;
  return {
    timePeriod: firstSubstantiveTokenMatch(FORGE_TIME_PERIODS, t) ?? current.timePeriod,
    personalityType: firstSubstantiveTokenMatch(FORGE_PERSONALITY_TYPES, t) ?? current.personalityType,
    speechStyle: firstSubstantiveTokenMatch(FORGE_SPEECH_STYLES, t) ?? current.speechStyle,
    sexualEnergy: firstSubstantiveTokenMatch(FORGE_SEXUAL_ENERGIES, t) ?? current.sexualEnergy,
    relationshipVibe: firstSubstantiveTokenMatch(FORGE_RELATIONSHIP_VIBES, t) ?? current.relationshipVibe,
  };
}

/** Stable list for `personality_archetypes` column (compat). */
export function forgePersonalityToArchetypeList(p: ForgePersonalityProfile): string[] {
  return [p.timePeriod, p.personalityType, p.speechStyle, p.sexualEnergy, p.relationshipVibe];
}
