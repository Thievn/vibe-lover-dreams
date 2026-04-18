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
      return { spread: 1.15, blur: 1.1, outer: 1.1 };
    default:
      return { spread: 1, blur: 1, outer: 1 };
  }
}

function joinShadows(parts: string[]): string {
  return parts.filter(Boolean).join(", ");
}

export function rarityNeonOuterBoxShadow(rarity: CompanionRarity, variant: ProfilePortraitTierHaloVariant): string {
  const scale = scaleForVariant(variant);
  const { spread, blur, outer } = glowIntensity(scale);
  const b = (n: number) => Math.round(n * blur);
  const o = (n: number) => Math.round(n * outer);
  const s = (n: number) => Math.max(1, Math.round(n * spread));

  switch (rarity) {
    case "common": {
      const c = RARITY_NEON.common.core;
      const w = RARITY_NEON.common.outline;
      return joinShadows([
        `0 0 ${b(18)}px rgba(229,229,229,${0.42 * outer})`,
        `0 0 ${b(36)}px rgba(229,229,229,${0.18 * outer})`,
        `0 0 ${b(6)}px rgba(255,255,255,${0.55 * outer})`,
        `inset 0 0 ${b(22)}px rgba(255,255,255,${0.07 * outer})`,
        `inset 0 0 0 ${s(1)}px rgba(255,255,255,${0.35 * outer})`,
      ]);
    }
    case "rare": {
      const a = RARITY_NEON.rare.from;
      const t = RARITY_NEON.rare.to;
      return joinShadows([
        `-${s(5)}px -${s(3)}px ${b(22)}px ${a}66`,
        `${s(5)}px ${s(4)}px ${b(24)}px ${t}77`,
        `0 0 ${b(32)}px rgba(160,32,240,${0.28 * outer})`,
        `0 0 ${o(48)}px rgba(0,212,255,${0.18 * outer})`,
      ]);
    }
    case "epic": {
      const f = RARITY_NEON.epic.from;
      const g = RARITY_NEON.epic.to;
      return joinShadows([
        `-${s(6)}px 0 ${b(22)}px ${f}88`,
        `${s(6)}px 0 ${b(22)}px ${g}88`,
        `0 -${s(3)}px ${b(18)}px ${f}55`,
        `0 ${s(4)}px ${b(20)}px ${g}55`,
        `0 0 ${b(36)}px rgba(0,247,255,${0.22 * outer})`,
      ]);
    }
    case "legendary": {
      const f = RARITY_NEON.legendary.from;
      const g = RARITY_NEON.legendary.to;
      return joinShadows([
        `0 0 ${b(14)}px ${f}cc`,
        `0 0 ${b(28)}px ${g}aa`,
        `0 0 ${b(48)}px rgba(255,140,0,${0.35 * outer})`,
        `0 0 ${b(72)}px rgba(255,215,0,${0.2 * outer})`,
        `-2px -2px ${b(16)}px rgba(255,255,255,${0.2 * outer})`,
      ]);
    }
    case "mythic": {
      const f = RARITY_NEON.mythic.from;
      const g = RARITY_NEON.mythic.to;
      return joinShadows([
        `-${s(7)}px 0 ${b(24)}px ${f}99`,
        `${s(7)}px 0 ${b(24)}px ${g}99`,
        `0 0 ${b(40)}px rgba(255,0,255,${0.28 * outer})`,
        `0 0 ${b(52)}px rgba(255,20,147,${0.22 * outer})`,
      ]);
    }
    case "abyssal":
    default: {
      const f = RARITY_NEON.abyssal.from;
      const g = RARITY_NEON.abyssal.to;
      return joinShadows([
        `0 0 ${b(20)}px ${f}cc`,
        `0 0 ${b(40)}px ${g}99`,
        `0 0 ${b(64)}px rgba(107,0,179,${0.45 * outer})`,
        `0 0 ${b(88)}px rgba(255,0,51,${0.32 * outer})`,
        `-${s(4)}px ${s(6)}px ${b(28)}px ${g}77`,
        `${s(5)}px -${s(4)}px ${b(26)}px ${f}77`,
      ]);
    }
  }
}

export function rarityNeonInnerBoxShadow(rarity: CompanionRarity, variant: ProfilePortraitTierHaloVariant): string {
  const scale = scaleForVariant(variant);
  const { blur, outer } = glowIntensity(scale);
  const b = (n: number) => Math.round(n * blur);

  switch (rarity) {
    case "common":
      return joinShadows([
        `inset 0 0 ${b(28)}px rgba(255,255,255,${0.09 * outer})`,
        `inset 0 0 ${b(8)}px rgba(229,229,229,${0.12 * outer})`,
      ]);
    case "rare":
      return joinShadows([
        `inset 0 0 ${b(26)}px rgba(160,32,240,${0.14 * outer})`,
        `inset 0 0 ${b(20)}px rgba(0,212,255,${0.1 * outer})`,
      ]);
    case "epic":
      return joinShadows([
        `inset ${b(3)}px 0 ${b(18)}px rgba(0,247,255,${0.12 * outer})`,
        `inset -${b(3)}px 0 ${b(18)}px rgba(0,255,159,${0.12 * outer})`,
      ]);
    case "legendary":
      return joinShadows([
        `inset 0 0 ${b(30)}px rgba(255,215,0,${0.18 * outer})`,
        `inset 0 0 ${b(12)}px rgba(255,140,0,${0.22 * outer})`,
        `inset 0 ${b(2)}px ${b(14)}px rgba(255,255,255,${0.12 * outer})`,
      ]);
    case "mythic":
      return joinShadows([
        `inset ${b(4)}px 0 ${b(20)}px rgba(255,0,255,${0.14 * outer})`,
        `inset -${b(4)}px 0 ${b(20)}px rgba(255,20,147,${0.14 * outer})`,
      ]);
    case "abyssal":
    default:
      return joinShadows([
        `inset 0 0 ${b(36)}px rgba(107,0,179,${0.22 * outer})`,
        `inset 0 0 ${b(22)}px rgba(255,0,51,${0.18 * outer})`,
      ]);
  }
}
