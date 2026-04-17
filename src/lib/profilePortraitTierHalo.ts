import type { CompanionRarity } from "@/lib/companionRarity";

export type ProfilePortraitTierHaloVariant = "profile" | "card" | "compact" | "avatar";

export const PROFILE_TIER_HALO_RADIUS: Record<
  ProfilePortraitTierHaloVariant,
  { outer: string; mask: string; inner: string; gutter: string; ring: string }
> = {
  profile: {
    outer: "rounded-[1.35rem]",
    mask: "rounded-[1.35rem]",
    inner: "rounded-[1.2rem]",
    gutter: "m-[3px]",
    ring: "border-[3px]",
  },
  card: {
    outer: "rounded-2xl",
    mask: "rounded-2xl",
    inner: "rounded-[calc(1rem-3px)]",
    gutter: "m-[3px]",
    ring: "border-[3px]",
  },
  compact: {
    outer: "rounded-xl",
    mask: "rounded-xl",
    inner: "rounded-[calc(0.75rem-3px)]",
    gutter: "m-[3px]",
    ring: "border-[3px]",
  },
  /** Small circular chips (e.g. chat header). */
  avatar: {
    outer: "rounded-full",
    mask: "rounded-full",
    inner: "rounded-full",
    gutter: "m-[2px]",
    ring: "border-[2px]",
  },
};

/** Match `RarityBorderOverlay` rounding to the halo inner shell. */
export function profileTierHaloInnerRoundClass(variant: ProfilePortraitTierHaloVariant): string {
  return PROFILE_TIER_HALO_RADIUS[variant].inner;
}

/** Conic gradient for the profile-only rotating sheen behind the portrait ring. */
export function profileTierSheenGradient(rarity: CompanionRarity): string {
  switch (rarity) {
    case "common":
      return "conic-gradient(from 0deg, hsl(220 12% 38%), hsl(240 8% 62%), hsl(220 10% 48%), hsl(240 6% 28%), hsl(220 12% 38%))";
    case "rare":
      return "conic-gradient(from 0deg, hsl(199 90% 48%), hsl(186 92% 42%), hsl(210 100% 58%), hsl(188 85% 52%), hsl(199 90% 48%))";
    case "epic":
      return "conic-gradient(from 0deg, hsl(280 75% 55%), hsl(310 85% 58%), hsl(265 80% 48%), hsl(330 70% 58%), hsl(280 75% 55%))";
    case "legendary":
      return "conic-gradient(from 0deg, hsl(43 96% 56%), hsl(28 92% 52%), hsl(48 100% 62%), hsl(20 88% 48%), hsl(43 96% 56%))";
    case "mythic":
      return "conic-gradient(from 0deg, hsl(350 82% 52%), hsl(320 78% 48%), hsl(12 90% 55%), hsl(285 70% 50%), hsl(350 82% 52%))";
    case "abyssal":
      return "conic-gradient(from 0deg, hsl(330 100% 58%), hsl(280 75% 52%), hsl(170 100% 48%), hsl(300 85% 55%), hsl(330 100% 58%))";
    default:
      return "conic-gradient(from 0deg, hsl(220 12% 38%), hsl(240 8% 55%), hsl(220 12% 38%))";
  }
}
