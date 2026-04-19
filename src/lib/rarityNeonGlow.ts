import { RARITY_NEON, type CompanionRarity } from "@/lib/companionRarity";
import type { ProfilePortraitTierHaloVariant } from "@/lib/profilePortraitTierHalo";

type NeonTierScale = "profile" | "card" | "compact" | "avatar";

function scaleForVariant(variant: ProfilePortraitTierHaloVariant): NeonTierScale {
  if (variant === "profile") return "profile";
  if (variant === "compact") return "compact";
  if (variant === "avatar") return "avatar";
  return "card";
}

/** Blur/spread multipliers — smaller on avatars & compact rows; profile gets the full treatment. */
function glowIntensity(scale: NeonTierScale): { spread: number; blur: number; outer: number } {
  switch (scale) {
    case "avatar":
      return { spread: 1, blur: 0.55, outer: 0.5 };
    case "compact":
      return { spread: 0.85, blur: 0.8, outer: 0.75 };
    case "profile":
      return { spread: 1.05, blur: 1, outer: 1 };
    default:
      return { spread: 1, blur: 1, outer: 1 };
  }
}

function joinShadows(parts: string[]): string {
  return parts.filter(Boolean).join(", ");
}

/**
 * Profile hero only — ambient halo behind the frame. Kept to ~2 layers + inset so it doesn’t read as a black “third ring”.
 */
export function rarityNeonOuterBoxShadow(rarity: CompanionRarity, variant: ProfilePortraitTierHaloVariant): string {
  const scale = scaleForVariant(variant);
  const { spread, blur, outer } = glowIntensity(scale);
  const b = (n: number) => Math.round(n * blur);
  const s = (n: number) => Math.max(1, Math.round(n * spread));

  switch (rarity) {
    case "common": {
      return joinShadows([
        `0 0 ${b(22)}px rgba(255,255,255,${0.28 * outer})`,
        `0 0 ${b(10)}px rgba(255,255,255,${0.38 * outer})`,
        `inset 0 0 ${b(18)}px rgba(255,255,255,${0.06 * outer})`,
      ]);
    }
    case "rare": {
      const a = RARITY_NEON.rare.from;
      const t = RARITY_NEON.rare.to;
      return joinShadows([
        `0 0 ${b(26)}px ${a}77`,
        `0 0 ${b(14)}px ${t}88`,
        `-2px -1px ${b(18)}px ${a}55`,
      ]);
    }
    case "epic": {
      const f = RARITY_NEON.epic.from;
      const g = RARITY_NEON.epic.to;
      return joinShadows([
        `0 0 ${b(28)}px ${f}88`,
        `0 0 ${b(12)}px ${g}aa`,
        `${s(3)}px 0 ${b(20)}px ${f}44`,
      ]);
    }
    case "legendary": {
      const f = RARITY_NEON.legendary.from;
      const g = RARITY_NEON.legendary.to;
      return joinShadows([
        `0 0 ${b(22)}px ${f}bb`,
        `0 0 ${b(36)}px ${g}77`,
        `0 0 ${b(12)}px rgba(255,255,255,${0.22 * outer})`,
      ]);
    }
    case "mythic": {
      const f = RARITY_NEON.mythic.from;
      const g = RARITY_NEON.mythic.to;
      return joinShadows([
        `0 0 ${b(26)}px ${f}99`,
        `0 0 ${b(18)}px ${g}aa`,
        `-3px 2px ${b(22)}px ${f}55`,
      ]);
    }
    case "abyssal":
    default: {
      const f = RARITY_NEON.abyssal.from;
      const g = RARITY_NEON.abyssal.to;
      return joinShadows([
        `0 0 ${b(28)}px ${f}aa`,
        `0 0 ${b(20)}px ${g}99`,
        `2px -2px ${b(24)}px ${g}66`,
      ]);
    }
  }
}

type InnerOpts = { cardBoost?: boolean };

export function rarityNeonInnerBoxShadow(
  rarity: CompanionRarity,
  variant: ProfilePortraitTierHaloVariant,
  opts?: InnerOpts,
): string {
  const scale = scaleForVariant(variant);
  const { blur, outer } = glowIntensity(scale);
  const boost = opts?.cardBoost ? 1.28 : 1;
  const b = (n: number) => Math.round(n * blur * boost);

  switch (rarity) {
    case "common":
      return joinShadows([
        `inset 0 0 ${b(26)}px rgba(255,255,255,${0.1 * outer})`,
        `inset 0 0 ${b(10)}px rgba(212,212,216,${0.14 * outer})`,
      ]);
    case "rare": {
      const a = RARITY_NEON.rare.from;
      const t = RARITY_NEON.rare.to;
      return joinShadows([
        `inset 0 0 ${b(24)}px ${a}33`,
        `inset ${b(2)}px 0 ${b(16)}px ${t}28`,
      ]);
    }
    case "epic": {
      const f = RARITY_NEON.epic.from;
      const g = RARITY_NEON.epic.to;
      return joinShadows([
        `inset ${b(3)}px 0 ${b(20)}px ${f}30`,
        `inset -${b(3)}px 0 ${b(20)}px ${g}28`,
      ]);
    }
    case "legendary": {
      const f = RARITY_NEON.legendary.from;
      const g = RARITY_NEON.legendary.to;
      return joinShadows([
        `inset 0 0 ${b(28)}px ${f}35`,
        `inset 0 ${b(2)}px ${b(14)}px ${g}30`,
        `inset 0 0 ${b(8)}px rgba(255,255,255,${0.12 * outer})`,
      ]);
    }
    case "mythic": {
      const f = RARITY_NEON.mythic.from;
      const g = RARITY_NEON.mythic.to;
      return joinShadows([
        `inset ${b(4)}px 0 ${b(22)}px ${f}32`,
        `inset -${b(4)}px 0 ${b(22)}px ${g}30`,
      ]);
    }
    case "abyssal":
    default: {
      const f = RARITY_NEON.abyssal.from;
      const g = RARITY_NEON.abyssal.to;
      return joinShadows([
        `inset 0 0 ${b(32)}px ${f}38`,
        `inset 0 0 ${b(18)}px ${g}32`,
      ]);
    }
  }
}

/** Tight rim + boosted inset — no far-field bleed (used for grid/list cards). */
function rarityNeonCardRimOuter(rarity: CompanionRarity, variant: ProfilePortraitTierHaloVariant): string {
  const scale = scaleForVariant(variant);
  const { blur, outer } = glowIntensity(scale);
  const b = (n: number) => Math.round(n * blur * 1.05);
  const s = (n: number) => Math.max(1, Math.round(n * 0.9));

  switch (rarity) {
    case "common":
      return joinShadows([
        `0 0 ${b(8)}px rgba(255,255,255,${0.55 * outer})`,
        `0 0 ${b(3)}px rgba(255,255,255,${0.75 * outer})`,
      ]);
    case "rare": {
      const a = RARITY_NEON.rare.from;
      const t = RARITY_NEON.rare.to;
      return joinShadows([
        `0 0 ${b(12)}px ${a}99`,
        `0 0 ${b(6)}px ${t}aa`,
        `-${s(2)}px 0 ${b(10)}px ${a}66`,
      ]);
    }
    case "epic": {
      const f = RARITY_NEON.epic.from;
      const g = RARITY_NEON.epic.to;
      return joinShadows([
        `0 0 ${b(14)}px ${f}aa`,
        `0 0 ${b(7)}px ${g}bb`,
        `0 0 ${b(4)}px rgba(255,255,255,${0.35 * outer})`,
      ]);
    }
    case "legendary": {
      const f = RARITY_NEON.legendary.from;
      const g = RARITY_NEON.legendary.to;
      return joinShadows([
        `0 0 ${b(12)}px ${f}cc`,
        `0 0 ${b(8)}px ${g}99`,
        `0 0 ${b(4)}px rgba(255,255,255,${0.3 * outer})`,
      ]);
    }
    case "mythic": {
      const f = RARITY_NEON.mythic.from;
      const g = RARITY_NEON.mythic.to;
      return joinShadows([
        `0 0 ${b(14)}px ${f}aa`,
        `0 0 ${b(8)}px ${g}99`,
        `1px 1px ${b(10)}px ${f}77`,
      ]);
    }
    case "abyssal":
    default: {
      const f = RARITY_NEON.abyssal.from;
      const g = RARITY_NEON.abyssal.to;
      return joinShadows([
        `0 0 ${b(14)}px ${f}cc`,
        `0 0 ${b(9)}px ${g}bb`,
        `0 0 ${b(5)}px rgba(255,255,255,${0.22 * outer})`,
      ]);
    }
  }
}

/** Single combined glow for card / compact / avatar — edge-hugging, no distant “second halo”. */
export function rarityNeonCardStaticGlow(rarity: CompanionRarity, variant: ProfilePortraitTierHaloVariant): string {
  return joinShadows([
    rarityNeonCardRimOuter(rarity, variant),
    rarityNeonInnerBoxShadow(rarity, variant, { cardBoost: true }),
  ]);
}
