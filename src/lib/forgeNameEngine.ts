import type { SupabaseClient } from "@supabase/supabase-js";
import type { ForgePersonalityProfile } from "./forgePersonalityProfile";
import {
  BANK_80S,
  BANK_APOC,
  BANK_CYBER,
  BANK_DARK,
  BANK_EGYPT,
  BANK_GREEK,
  BANK_JAPAN,
  BANK_MEDIEVAL,
  BANK_MODERN,
  BANK_VICTORIAN,
  type NameBank,
  type NameGender,
  type SurnamePool,
  GOTH_TOKENS,
  QUIRKY_MODERN_F,
  QUIRKY_MODERN_M,
  QUIRKY_MODERN_X,
  QUIRKY_CYBER,
  SURNAME_MEDIEVAL,
  SURNAME_VICTORIAN,
  SURNAME_DARK,
  SURNAME_JAPAN,
} from "./forgeNameBanks";
import { DEFAULT_FORGE_PERSONALITY } from "./forgePersonalityProfile";

export function normalizeNameKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

type BankBundle = { bank: NameBank; surnames: SurnamePool; era: string };

function bundleForEra(period: string): BankBundle {
  switch (period) {
    case "Modern Day":
      return { bank: BANK_MODERN, surnames: null, era: "Modern Day" };
    case "Medieval Fantasy":
      return { bank: BANK_MEDIEVAL, surnames: SURNAME_MEDIEVAL, era: "Medieval Fantasy" };
    case "Ancient Greece/Mythology":
      return { bank: BANK_GREEK, surnames: null, era: "Greek" };
    case "Victorian Era":
      return { bank: BANK_VICTORIAN, surnames: SURNAME_VICTORIAN, era: "Victorian" };
    case "Cyberpunk/Futuristic":
      return { bank: BANK_CYBER, surnames: null, era: "Cyber" };
    case "Post-Apocalyptic":
      return { bank: BANK_APOC, surnames: null, era: "Wasteland" };
    case "Dark Fantasy":
      return { bank: BANK_DARK, surnames: SURNAME_DARK, era: "Dark" };
    case "Ancient Egypt":
      return { bank: BANK_EGYPT, surnames: null, era: "Egypt" };
    case "1980s Retro":
      return { bank: BANK_80S, surnames: null, era: "80s" };
    case "Feudal Japan":
      return { bank: BANK_JAPAN, surnames: SURNAME_JAPAN, era: "Japan" };
    default:
      return { bank: BANK_MODERN, surnames: null, era: "Modern Day" };
  }
}

export function inferNameGenderBucket(gender: string): NameGender {
  const g = gender.toLowerCase();
  if (/(female|woman|girl|femboy|demigirl|wife|girlfriend)/.test(g) && !/male(?!$)/.test(g)) return "f";
  if (/(^|\b)male|man|boy|himb|daddy|husband|stud|demiboy|butch|himbo|masc(\b|inal)/.test(g)) return "m";
  return "x";
}

function softPersonaMix(p: ForgePersonalityProfile): boolean {
  const softP = new Set(["Shy & Innocent", "Sweet & Loving", "Gentle & Caring"]);
  const softE = p.sexualEnergy === "Pure & Innocent";
  const darkEra = p.timePeriod === "Dark Fantasy" || p.timePeriod === "Post-Apocalyptic";
  return (softP.has(p.personalityType) || softE) && !darkEra;
}

function isTooGothicForSoft(name: string, p: ForgePersonalityProfile): boolean {
  if (!softPersonaMix(p)) return false;
  if (p.timePeriod === "Dark Fantasy") return false; // full pool is gothic-appropriate
  const n = name.toLowerCase();
  for (const t of GOTH_TOKENS) {
    if (n.includes(t)) return true;
  }
  return false;
}

function wantsQuirky(p: ForgePersonalityProfile, period: string): boolean {
  const pz = new Set(["Wild & Unhinged", "Bratty & Teasing", "Playful & Flirty"]);
  const pty = pz.has(p.personalityType);
  const psp = p.speechStyle === "Playful & Witty" || p.speechStyle === "Teasing & Sarcastic";
  const mod = period === "Modern Day" || period === "1980s Retro" || period === "Cyberpunk/Futuristic";
  return pty || (psp && mod) || (p.speechStyle === "Vulgar & Crude" && mod);
}

function useSurname(p: ForgePersonalityProfile, surnames: SurnamePool): boolean {
  if (!surnames?.length) return false;
  const formal =
    p.speechStyle === "Elegant & Refined" || p.speechStyle === "Fantasy/Archaic" || p.speechStyle === "Soft & Gentle";
  const rel = new Set(["Loyal Wife", "Possessive Yandere", "Devoted Girlfriend", "Secret Forbidden Love"]);
  const pHigh = p.personalityType === "Dominant & Seductive" || p.personalityType === "Obsessive & Possessive";
  return formal || pHigh || rel.has(p.relationshipVibe) || p.timePeriod === "Victorian Era" || p.timePeriod === "Feudal Japan";
  // Japan + medieval: random subset use surname
}

function listForGen(bucket: NameGender, bank: NameBank): readonly string[] {
  if (bucket === "f") return bank.f;
  if (bucket === "m") return bank.m;
  return bank.x;
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function makeRng(seed?: number): () => number {
  let s = (seed ?? Math.floor(Math.random() * 0x7fff_ffff)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s & 0xffff_ffff) / 0x1_0000_0000;
  };
}

export type ForgeNameInput = {
  gender: string;
  forgePersonality: ForgePersonalityProfile;
  /** Extra names the generator must not output (e.g. existing vault). */
  exclude?: ReadonlySet<string> | null;
  /** Seeded run for tests */
  seed?: number;
};

/**
 * Synchronous weighted name: era pool + 5D personality, optional surname, quirky blend; avoids dark tokens for soft archetypes.
 */
export function generateForgeName(input: ForgeNameInput): string {
  const rng = makeRng(input.seed);
  const p = input.forgePersonality;
  const ex = new Set(
    (input.exclude ? [...input.exclude] : []).map((x) => normalizeNameKey(x)).filter(Boolean),
  );
  const bucket = inferNameGenderBucket(input.gender);
  const { bank, surnames } = bundleForEra(p.timePeriod);
  const quirkyEra = p.timePeriod === "Cyberpunk/Futuristic" || p.timePeriod === "Modern Day" || p.timePeriod === "1980s Retro";
  const baseList = listForGen(bucket, bank);
  const quirkyMod =
    bucket === "f" ? QUIRKY_MODERN_F : bucket === "m" ? QUIRKY_MODERN_M : QUIRKY_MODERN_X;
  const quirkyList =
    p.timePeriod === "Cyberpunk/Futuristic" ? listForGen(bucket, QUIRKY_CYBER as NameBank) : quirkyMod;
  const useQuirk = wantsQuirky(p, p.timePeriod) && rng() < 0.55 && quirkyEra;
  const primary: readonly string[] = useQuirk ? quirkyList : baseList;

  const trySurname = useSurname(p, surnames) && rng() < 0.42;
  const surname = trySurname && surnames?.length ? pick(surnames, rng) : null;

  const maxTry = 96;
  for (let t = 0; t < maxTry; t++) {
    const given = pick(primary, rng);
    if (isTooGothicForSoft(given, p)) continue;
    let out = given.trim();
    if (surname) {
      if (p.timePeriod === "Feudal Japan" && rng() < 0.65) {
        out = `${surname} ${given}`;
      } else {
        out = `${given} ${surname}`;
      }
    }
    const k = normalizeNameKey(out);
    if (k && !ex.has(k) && out.length >= 2 && out.length <= 64) {
      ex.add(k);
      return out;
    }
  }
  // Fallback: unblocked simple pick
  for (let t = 0; t < 32; t++) {
    const given = pick(listForGen(bucket, BANK_MODERN), rng);
    if (isTooGothicForSoft(given, p)) continue;
    const k = normalizeNameKey(given);
    if (!ex.has(k)) {
      ex.add(k);
      return given;
    }
  }
  const stamp = `Nom ${Math.floor(rng() * 900 + 100)}`;
  ex.add(normalizeNameKey(stamp));
  return stamp;
}

/**
 * Fetches existing `name` values for the user's forged companions to prevent duplicates.
 */
export async function fetchForgeNameExclusions(supabase: SupabaseClient, userId: string | null | undefined): Promise<Set<string>> {
  const out = new Set<string>();
  if (!userId) return out;
  const { data, error } = await supabase.from("custom_characters").select("name").eq("user_id", userId);
  if (error || !data) return out;
  for (const r of data) {
    if (r.name && typeof r.name === "string") {
      out.add(normalizeNameKey(r.name));
    }
  }
  return out;
}

/**
 * Picks a unique forge name from an already-merged exclusion set (normalized keys).
 * Call after `fetchForgeNameExclusions` (optionally wrapped in `withAsyncTimeout`) so Create never depends on an extra unbounded DB round-trip inside name picking.
 */
export function generateUniqueForgeNameFromMergedExclusions(
  input: Omit<ForgeNameInput, "exclude">,
  mergedNormalizedKeys: ReadonlySet<string>,
): string {
  const reserved = new Set(mergedNormalizedKeys);
  for (let round = 0; round < 5; round++) {
    const name = generateForgeName({ ...input, exclude: reserved, seed: Date.now() + round * 977 });
    const k = normalizeNameKey(name);
    if (!reserved.has(k)) {
      return name;
    }
  }
  const extra = ` ${Math.floor(1000 + Math.random() * 8999)}`;
  return generateForgeName({ ...input, exclude: reserved, seed: Date.now() + 13 }) + extra;
}

/**
 * Tries to generate a name not in `reserved` (merged with fresh DB read when userId is set).
 */
export async function generateUniqueForgeName(
  supabase: SupabaseClient,
  userId: string | null | undefined,
  input: Omit<ForgeNameInput, "exclude">,
  localReserved?: ReadonlySet<string>,
): Promise<string> {
  const db = await fetchForgeNameExclusions(supabase, userId);
  const merged = new Set([...db, ...(localReserved ? [...localReserved] : [])].map((x) => normalizeNameKey(x)));
  return generateUniqueForgeNameFromMergedExclusions(input, merged);
}

/**
 * When AI fails, still respect personality.
 */
export function fallbackForgeNameFromSeeds(
  gender: string,
  forgePersonality: ForgePersonalityProfile = DEFAULT_FORGE_PERSONALITY,
  exclude?: ReadonlySet<string>,
): string {
  return generateForgeName({ gender, forgePersonality, exclude: exclude ?? new Set() });
}
