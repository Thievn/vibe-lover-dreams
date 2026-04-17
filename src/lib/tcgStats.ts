import type { CompanionRarity } from "@/lib/companionRarity";
import { normalizeCompanionRarity } from "@/lib/companionRarity";

export const TCG_STAT_KEYS = [
  "seduction",
  "passion",
  "fertility",
  "synergy",
  "dominance",
  "mystique",
  "wildness",
  "devotion",
] as const;

export type TcgStatKey = (typeof TCG_STAT_KEYS)[number];

export type TcgStatBlock = Partial<Record<TcgStatKey, number>>;

export const TCG_STAT_LABELS: Record<TcgStatKey, string> = {
  seduction: "Seduction",
  passion: "Passion",
  fertility: "Fertility",
  synergy: "Synergy",
  dominance: "Dominance",
  mystique: "Mystique",
  wildness: "Wildness",
  devotion: "Devotion",
};

/** One-line flavor for profile cards — Fertility & Synergy weighted in Nexus compatibility. */
export const TCG_STAT_DESCRIPTIONS: Record<TcgStatKey, string> = {
  seduction: "Pull of charm, tension, and invitation in conversation.",
  passion: "Heat, urgency, and emotional voltage they bring to a thread.",
  fertility: "Creative abundance — new ideas, scenes, and offspring concepts bloom easier.",
  synergy: "Resonance with another essence; drives Nexus weave strength when matched.",
  dominance: "Leadership, control, and scene direction in dynamics.",
  mystique: "Unreadable depth, secrets, and slow-reveal allure.",
  wildness: "Chaos appetite, risk, and rule-bending improvisation.",
  devotion: "Loyalty, fixation, and aftercare gravity toward their partner.",
};

const TIER_RANGE: Record<CompanionRarity, [number, number]> = {
  common: [38, 62],
  rare: [44, 74],
  epic: [50, 82],
  legendary: [56, 88],
  mythic: [60, 92],
  abyssal: [66, 98],
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function rollValue(seed: string, stat: TcgStatKey, rarity: CompanionRarity): number {
  const [lo, hi] = TIER_RANGE[rarity];
  const span = hi - lo + 1;
  const n = fnv1a32(`${seed}|${stat}`) % span;
  return lo + n;
}

/** Pick exactly 4 distinct stats, deterministic from seed (e.g. companion id). */
export function pickTcgStatKeys(seed: string): TcgStatKey[] {
  const scored = [...TCG_STAT_KEYS].map((k) => ({ k, s: fnv1a32(`${seed}#${k}`) }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, 4).map((x) => x.k);
}

export function generateTcgStatBlock(seed: string, rarityRaw: string | null | undefined): TcgStatBlock {
  const rarity = normalizeCompanionRarity(rarityRaw);
  const keys = pickTcgStatKeys(seed);
  const out: TcgStatBlock = {};
  for (const k of keys) {
    out[k] = rollValue(seed, k, rarity);
  }
  return out;
}

/** Merge parents’ TCG into child: average overlapping stats; fill missing from child seed+rarity. */
export function mergeTcgStatBlockForNexus(
  parentA: TcgStatBlock | null | undefined,
  parentB: TcgStatBlock | null | undefined,
  childSeed: string,
  childRarity: string | null | undefined,
): TcgStatBlock {
  const keys = pickTcgStatKeys(childSeed);
  const out: TcgStatBlock = {};
  const ra = parentA ?? {};
  const rb = parentB ?? {};
  for (const k of keys) {
    const va = ra[k];
    const vb = rb[k];
    if (typeof va === "number" && typeof vb === "number") {
      out[k] = Math.round((va + vb) / 2 + (fnv1a32(`${childSeed}~${k}`) % 7) - 3);
    } else if (typeof va === "number") {
      out[k] = Math.min(98, va + (fnv1a32(`${childSeed}a${k}`) % 5));
    } else if (typeof vb === "number") {
      out[k] = Math.min(98, vb + (fnv1a32(`${childSeed}b${k}`) % 5));
    } else {
      out[k] = rollValue(childSeed, k, normalizeCompanionRarity(childRarity));
    }
    const v = out[k]!;
    out[k] = Math.max(28, Math.min(99, v));
  }
  return out;
}

export function normalizeTcgStatBlock(raw: unknown): TcgStatBlock | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const out: TcgStatBlock = {};
  for (const k of TCG_STAT_KEYS) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) {
      out[k] = Math.max(0, Math.min(100, Math.round(v)));
    }
  }
  const count = Object.keys(out).length;
  if (count === 0) return null;
  return out;
}

export function tcgStatEntries(block: TcgStatBlock | null | undefined): { key: TcgStatKey; value: number }[] {
  if (!block) return [];
  return TCG_STAT_KEYS.filter((k) => typeof block[k] === "number").map((k) => ({
    key: k,
    value: block[k]!,
  }));
}
