import type { CompanionRarity } from "@/lib/companionRarity";

/** Official table for Companion Forge — must sum to 100. Rolled once per sealed companion (not during preview). */
export const COMPANION_FORGE_RARITY_DROP_PCT: Record<CompanionRarity, number> = {
  common: 35,
  rare: 28,
  epic: 20,
  legendary: 10,
  mythic: 5,
  abyssal: 2,
};

const ROLL_ORDER: readonly CompanionRarity[] = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "abyssal",
];

export function companionForgeRarityDropRows(): { rarity: CompanionRarity; pct: number }[] {
  return ROLL_ORDER.map((rarity) => ({ rarity, pct: COMPANION_FORGE_RARITY_DROP_PCT[rarity] }));
}

/** Weighted roll for a single finalized forge companion (user path). */
export function rollCompanionForgeRarity(): CompanionRarity {
  const u = Math.random() * 100;
  let acc = 0;
  for (const r of ROLL_ORDER) {
    acc += COMPANION_FORGE_RARITY_DROP_PCT[r];
    if (u < acc) return r;
  }
  return "abyssal";
}
