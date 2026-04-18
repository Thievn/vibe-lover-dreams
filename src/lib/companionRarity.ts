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

/**
 * CSS `filter` for the sharp rarity SVG on profile — colored rim glow (not a second stroke).
 * Keeps the vector as the single intentional edge; glow follows tier hue.
 */
export function rarityProfileVectorGlowFilter(rarity: CompanionRarity): string {
  switch (rarity) {
    case "common":
      return "brightness(1.06) contrast(1.02) drop-shadow(0 0 1px rgba(226,232,240,0.75)) drop-shadow(0 0 8px rgba(148,163,184,0.45)) drop-shadow(0 0 20px rgba(71,85,105,0.22))";
    case "rare":
      return "brightness(1.08) saturate(1.08) drop-shadow(0 0 1.5px rgba(34,211,238,0.95)) drop-shadow(0 0 12px rgba(56,189,248,0.6)) drop-shadow(0 0 28px rgba(14,165,233,0.35))";
    case "epic":
      return "brightness(1.08) saturate(1.1) drop-shadow(0 0 1.5px rgba(192,132,252,0.9)) drop-shadow(0 0 12px rgba(168,85,247,0.55)) drop-shadow(0 0 26px rgba(217,70,239,0.3))";
    case "legendary":
      return "brightness(1.1) saturate(1.12) drop-shadow(0 0 1.5px rgba(251,191,36,0.95)) drop-shadow(0 0 12px rgba(245,158,11,0.55)) drop-shadow(0 0 26px rgba(252,211,77,0.28))";
    case "mythic":
      return "brightness(1.08) saturate(1.12) drop-shadow(0 0 1.5px rgba(251,113,133,0.95)) drop-shadow(0 0 12px rgba(244,63,94,0.5)) drop-shadow(0 0 26px rgba(236,72,153,0.32))";
    case "abyssal":
      return "brightness(1.1) saturate(1.15) drop-shadow(0 0 2px rgba(255,45,123,0.95)) drop-shadow(0 0 14px rgba(192,132,252,0.65)) drop-shadow(0 0 22px rgba(0,255,212,0.35)) drop-shadow(0 0 36px rgba(168,85,247,0.35))";
    default:
      return "brightness(1.05) drop-shadow(0 0 8px rgba(148,163,184,0.4))";
  }
}

/** Softer under-glow layer (blurred duplicate) — tint only, no competing stroke. */
export function rarityProfileBloomFilter(rarity: CompanionRarity): string {
  switch (rarity) {
    case "rare":
      return "blur(14px) brightness(1.25) saturate(1.2) hue-rotate(-5deg)";
    case "epic":
      return "blur(14px) brightness(1.2) saturate(1.15)";
    case "legendary":
      return "blur(14px) brightness(1.25) saturate(1.1)";
    case "mythic":
      return "blur(14px) brightness(1.2) saturate(1.2)";
    case "abyssal":
      return "blur(16px) brightness(1.3) saturate(1.25)";
    default:
      return "blur(12px) brightness(1.15)";
  }
}

/**
 * Two CSS `filter` strings for profile-only glitch clones (RGB-ish split per tier).
 * Paired with `rarity-border-glitch-a` / `rarity-border-glitch-b` transforms in index.css.
 */
export function rarityGlitchLayerFilters(rarity: CompanionRarity): readonly [string, string] {
  switch (rarity) {
    case "common":
      return [
        "hue-rotate(-8deg) saturate(1.25) brightness(1.06) contrast(1.03)",
        "hue-rotate(22deg) saturate(1.2) brightness(1.04)",
      ];
    case "rare":
      return [
        "hue-rotate(-28deg) saturate(1.5) brightness(1.1) contrast(1.04)",
        "hue-rotate(18deg) saturate(1.4) brightness(1.06)",
      ];
    case "epic":
      return [
        "hue-rotate(-35deg) saturate(1.45) brightness(1.08)",
        "hue-rotate(25deg) saturate(1.5) brightness(1.07)",
      ];
    case "legendary":
      return [
        "hue-rotate(-18deg) saturate(1.5) brightness(1.12)",
        "hue-rotate(12deg) saturate(1.35) brightness(1.08)",
      ];
    case "mythic":
      return [
        "hue-rotate(-22deg) saturate(1.55) brightness(1.09)",
        "hue-rotate(20deg) saturate(1.45) brightness(1.07)",
      ];
    case "abyssal":
      return [
        "hue-rotate(-15deg) saturate(1.4) brightness(1.1)",
        "hue-rotate(35deg) saturate(1.35) brightness(1.06)",
      ];
    default:
      return [
        "hue-rotate(-10deg) saturate(1.2) brightness(1.05)",
        "hue-rotate(15deg) saturate(1.15) brightness(1.04)",
      ];
  }
}
