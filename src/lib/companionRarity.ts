export const COMPANION_RARITIES = [
  "common",
  "rare",
  "epic",
  "legendary",
  "mythic",
  "abyssal",
] as const;

export type CompanionRarity = (typeof COMPANION_RARITIES)[number];

/** Canonical neon palette for companion frames (CSS + overlays). Order: common → rare → epic → legendary → mythic → abyssal. */
export const RARITY_NEON = {
  common: { core: "#d4d4d8", outline: "#f4f4f5" },
  /** Rare: blue tier. */
  rare: { from: "#60a5fa", to: "#2563eb" },
  /** Epic: rich purple (distinct from rare blue and abyssal pink-violet). */
  epic: { from: "#a855f7", to: "#6d28d9" },
  /** Legendary: gold. */
  legendary: { from: "#fbbf24", to: "#d97706" },
  /** Mythic: dual tone — crimson red + dark violet (half-and-half energy in glows / sheen). */
  mythic: { from: "#dc2626", to: "#5b21b6" },
  /** Abyssal: purple → hot pink gradient (pairs with glitch on profile). */
  abyssal: { from: "#a855f7", to: "#f472b6" },
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

/** Default profile/card gradient for a tier (forge default for common; neon pair for rarer tiers). */
export function defaultProfileGradientForRarity(rarity: CompanionRarity | string): { from: string; to: string } {
  const r = normalizeCompanionRarity(rarity);
  if (r === "common") {
    return { from: "#7B2D8E", to: "#FF2D7B" };
  }
  const n = RARITY_NEON[r];
  return { from: n.from, to: n.to };
}

/** Profile / card caption (rarity names may change later). */
export function rarityDisplayLabel(rarity: CompanionRarity): string {
  const map: Record<CompanionRarity, string> = {
    common: "Common",
    rare: "Rare",
    epic: "Epic",
    legendary: "Legendary",
    mythic: "Mythic",
    abyssal: "Abyssal",
  };
  return map[rarity] ?? "Common";
}

/** Solid fill for tier caption; Abyssal uses `gradient-vice-text` in UI instead. */
export function rarityTierCaptionColor(rarity: CompanionRarity): string {
  const { common, rare, epic, legendary, mythic, abyssal } = RARITY_NEON;
  switch (rarity) {
    case "common":
      return "#ffffff";
    case "rare":
      return rare.from;
    case "epic":
      return epic.from;
    case "legendary":
      return legendary.from;
    case "mythic":
      return mythic.from;
    case "abyssal":
      return abyssal.from;
    default:
      return common.core;
  }
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
  /** ~2× drop-shadow radii vs earlier profile rim — reads as a thicker neon border on the SVG frame. */
  switch (rarity) {
    case "common":
      return `brightness(1.06) contrast(1.02) drop-shadow(0 0 2px ${common.outline}cc) drop-shadow(0 0 24px ${common.core}99) drop-shadow(0 0 54px ${common.core}50) drop-shadow(0 0 96px ${common.core}40)`;
    case "rare":
      return `brightness(1.08) saturate(1.12) drop-shadow(0 0 3px ${rare.to}) drop-shadow(0 0 28px ${rare.from}d0) drop-shadow(0 0 64px ${rare.to}72) drop-shadow(0 0 110px ${rare.from}50)`;
    case "epic":
      return `brightness(1.09) saturate(1.12) drop-shadow(0 0 3px ${epic.from}) drop-shadow(0 0 28px ${epic.to}b0) drop-shadow(0 0 60px ${epic.from}60) drop-shadow(0 0 118px ${epic.to}48)`;
    case "legendary":
      return `brightness(1.12) saturate(1.14) drop-shadow(0 0 3px ${legendary.from}) drop-shadow(0 0 32px ${legendary.to}d4) drop-shadow(0 0 72px ${legendary.from}62) drop-shadow(0 0 4px rgba(255,255,255,0.38)) drop-shadow(0 0 128px ${legendary.to}44)`;
    case "mythic":
      return `brightness(1.09) saturate(1.15) drop-shadow(0 0 3px ${mythic.from}) drop-shadow(0 0 28px ${mythic.to}c0) drop-shadow(0 0 64px ${mythic.from}72) drop-shadow(0 0 112px ${mythic.to}4e)`;
    case "abyssal":
      return `brightness(1.12) saturate(1.18) drop-shadow(0 0 4px ${abyssal.to}) drop-shadow(0 0 32px ${abyssal.from}e6) drop-shadow(0 0 64px ${abyssal.to}90) drop-shadow(0 0 92px ${abyssal.from}62) drop-shadow(0 0 140px ${abyssal.to}4e)`;
    default:
      return `brightness(1.05) drop-shadow(0 0 18px ${common.core}72)`;
  }
}

/** Vector frame on grid / list cards (static — pairs with RarityNeonGlowLayers). */
export function rarityCardOverlayGlowFilter(rarity: CompanionRarity): string {
  const { common, rare, epic, legendary, mythic, abyssal } = RARITY_NEON;
  switch (rarity) {
    case "common":
      return `brightness(1.04) drop-shadow(0 0 1.5px ${common.outline}b0) drop-shadow(0 0 10px ${common.core}86)`;
    case "rare":
      return `brightness(1.06) saturate(1.1) drop-shadow(0 0 1.5px ${rare.to}) drop-shadow(0 0 12px ${rare.from}b8)`;
    case "epic":
      return `brightness(1.07) saturate(1.1) drop-shadow(0 0 1.5px ${epic.from}) drop-shadow(0 0 12px ${epic.to}a6)`;
    case "legendary":
      return `brightness(1.1) saturate(1.12) drop-shadow(0 0 2px ${legendary.from}) drop-shadow(0 0 14px ${legendary.to}b0) drop-shadow(0 0 1px rgba(255,255,255,0.3))`;
    case "mythic":
      return `brightness(1.08) saturate(1.12) drop-shadow(0 0 1.5px ${mythic.from}) drop-shadow(0 0 12px ${mythic.to}b4)`;
    case "abyssal":
      return `brightness(1.1) saturate(1.15) drop-shadow(0 0 2.5px ${abyssal.to}) drop-shadow(0 0 15px ${abyssal.from}d8)`;
    default:
      return `brightness(1.04) drop-shadow(0 0 10px ${common.core}64)`;
  }
}

/** Softer under-glow layer (blurred duplicate) — tint only, no competing stroke. */
export function rarityProfileBloomFilter(rarity: CompanionRarity): string {
  switch (rarity) {
    case "rare":
      return "blur(14px) brightness(1.28) saturate(1.22) hue-rotate(-4deg)";
    case "epic":
      return "blur(14px) brightness(1.24) saturate(1.28) hue-rotate(8deg)";
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
        "hue-rotate(-14deg) saturate(1.45) brightness(1.1) contrast(1.08)",
        "hue-rotate(28deg) saturate(1.38) brightness(1.08) contrast(1.05)",
      ];
    case "rare":
      return [
        "hue-rotate(-38deg) saturate(1.65) brightness(1.14) contrast(1.1)",
        "hue-rotate(32deg) saturate(1.55) brightness(1.1) contrast(1.06)",
      ];
    case "epic":
      return [
        "hue-rotate(-42deg) saturate(1.62) brightness(1.12) contrast(1.08)",
        "hue-rotate(36deg) saturate(1.58) brightness(1.1) contrast(1.07)",
      ];
    case "legendary":
      return [
        "hue-rotate(-28deg) saturate(1.7) brightness(1.18) contrast(1.1)",
        "hue-rotate(22deg) saturate(1.5) brightness(1.12) contrast(1.08)",
      ];
    case "mythic":
      return [
        "hue-rotate(-32deg) saturate(1.75) brightness(1.14) contrast(1.1)",
        "hue-rotate(28deg) saturate(1.62) brightness(1.12) contrast(1.08)",
      ];
    case "abyssal":
      return [
        "hue-rotate(-24deg) saturate(1.68) brightness(1.14) contrast(1.1)",
        "hue-rotate(42deg) saturate(1.55) brightness(1.1) contrast(1.07)",
      ];
    default:
      return [
        "hue-rotate(-14deg) saturate(1.35) brightness(1.08) contrast(1.06)",
        "hue-rotate(22deg) saturate(1.28) brightness(1.06) contrast(1.04)",
      ];
  }
}
