export const COMPANION_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "abyssal",
] as const;

export type CompanionRarity = (typeof COMPANION_RARITIES)[number];

/** Canonical neon palette for companion frames (CSS + overlays). */
export const RARITY_NEON = {
  common: { core: "#E5E5E5", outline: "#FFFFFF" },
  rare: { from: "#A020F0", to: "#00D4FF" },
  epic: { from: "#00F7FF", to: "#00FF9F" },
  legendary: { from: "#FFD700", to: "#FF8C00" },
  mythic: { from: "#FF00FF", to: "#FF1493" },
  abyssal: { from: "#6B00B3", to: "#FF0033" },
} as const;

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
  const { common, rare, epic, legendary, mythic, abyssal } = RARITY_NEON;
  switch (rarity) {
    case "common":
      return `brightness(1.06) contrast(1.02) drop-shadow(0 0 1px ${common.outline}cc) drop-shadow(0 0 10px ${common.core}99) drop-shadow(0 0 24px ${common.core}44)`;
    case "rare":
      return `brightness(1.08) saturate(1.12) drop-shadow(0 0 1.5px ${rare.to}) drop-shadow(0 0 12px ${rare.from}cc) drop-shadow(0 0 28px ${rare.to}66)`;
    case "epic":
      return `brightness(1.09) saturate(1.12) drop-shadow(0 0 1.5px ${epic.from}) drop-shadow(0 0 12px ${epic.to}aa) drop-shadow(0 0 26px ${epic.from}55)`;
    case "legendary":
      return `brightness(1.12) saturate(1.14) drop-shadow(0 0 1.5px ${legendary.from}) drop-shadow(0 0 14px ${legendary.to}cc) drop-shadow(0 0 32px ${legendary.from}55) drop-shadow(0 0 2px rgba(255,255,255,0.35))`;
    case "mythic":
      return `brightness(1.09) saturate(1.15) drop-shadow(0 0 1.5px ${mythic.from}) drop-shadow(0 0 12px ${mythic.to}bb) drop-shadow(0 0 28px ${mythic.from}66)`;
    case "abyssal":
      return `brightness(1.12) saturate(1.18) drop-shadow(0 0 2px ${abyssal.to}) drop-shadow(0 0 14px ${abyssal.from}dd) drop-shadow(0 0 28px ${abyssal.to}88) drop-shadow(0 0 40px ${abyssal.from}55)`;
    default:
      return `brightness(1.05) drop-shadow(0 0 8px ${common.core}66)`;
  }
}

/** Vector frame on grid / list cards (static — pairs with RarityNeonGlowLayers). */
export function rarityCardOverlayGlowFilter(rarity: CompanionRarity): string {
  const { common, rare, epic, legendary, mythic, abyssal } = RARITY_NEON;
  switch (rarity) {
    case "common":
      return `brightness(1.04) drop-shadow(0 0 1px ${common.outline}aa) drop-shadow(0 0 8px ${common.core}77)`;
    case "rare":
      return `brightness(1.06) saturate(1.1) drop-shadow(0 0 1px ${rare.to}) drop-shadow(0 0 10px ${rare.from}aa)`;
    case "epic":
      return `brightness(1.07) saturate(1.1) drop-shadow(0 0 1px ${epic.from}) drop-shadow(0 0 10px ${epic.to}99)`;
    case "legendary":
      return `brightness(1.1) saturate(1.12) drop-shadow(0 0 1.5px ${legendary.from}) drop-shadow(0 0 12px ${legendary.to}aa) drop-shadow(0 0 1px rgba(255,255,255,0.25))`;
    case "mythic":
      return `brightness(1.08) saturate(1.12) drop-shadow(0 0 1px ${mythic.from}) drop-shadow(0 0 10px ${mythic.to}aa)`;
    case "abyssal":
      return `brightness(1.1) saturate(1.15) drop-shadow(0 0 2px ${abyssal.to}) drop-shadow(0 0 12px ${abyssal.from}cc)`;
    default:
      return `brightness(1.04) drop-shadow(0 0 8px ${common.core}55)`;
  }
}

/** Softer under-glow layer (blurred duplicate) — tint only, no competing stroke. */
export function rarityProfileBloomFilter(rarity: CompanionRarity): string {
  switch (rarity) {
    case "rare":
      return "blur(14px) brightness(1.28) saturate(1.25) hue-rotate(-8deg)";
    case "epic":
      return "blur(14px) brightness(1.22) saturate(1.2) hue-rotate(12deg)";
    case "legendary":
      return "blur(14px) brightness(1.3) saturate(1.15) hue-rotate(-6deg)";
    case "mythic":
      return "blur(14px) brightness(1.24) saturate(1.22) hue-rotate(8deg)";
    case "abyssal":
      return "blur(16px) brightness(1.32) saturate(1.28) hue-rotate(-4deg)";
    default:
      return "blur(12px) brightness(1.18) saturate(1.05)";
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
