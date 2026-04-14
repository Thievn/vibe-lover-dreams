export const COMPANION_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "abyssal",
] as const;

export type CompanionRarity = (typeof COMPANION_RARITIES)[number];

const STATIC_RARITY: Partial<Record<string, CompanionRarity>> = {
  "lilith-vesper": "abyssal",
  "raven-nox": "mythic",
  "jax-harlan": "legendary",
  "kira-lux": "epic",
  "marcus-vale": "rare",
  "elara-moon": "legendary",
  "zara-eclipse": "epic",
};

export function normalizeCompanionRarity(raw: string | null | undefined): CompanionRarity {
  const v = (raw || "common").toLowerCase().trim();
  if ((COMPANION_RARITIES as readonly string[]).includes(v)) return v as CompanionRarity;
  return "common";
}

/** When Supabase has no row (static catalog), assign showcase tiers for UI. */
export function getStaticRarityForCatalog(id: string): CompanionRarity {
  return STATIC_RARITY[id] ?? "common";
}

export function defaultRarityBorderPath(rarity: CompanionRarity): string {
  return `/rarity-borders/${rarity}.svg`;
}
