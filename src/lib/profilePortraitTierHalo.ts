import { RARITY_NEON, type CompanionRarity } from "@/lib/companionRarity";

export type ProfilePortraitTierHaloVariant = "profile" | "card" | "compact" | "avatar";

/** Grid / list cards: one vector edge + soft glow; `full` keeps the legacy stacked ring + SVG. */
export type ProfilePortraitFrameStyle = "full" | "clean";

export type ProfileTierHaloRadius = {
  outer: string;
  mask: string;
  inner: string;
  gutter: string;
  ring: string;
};

export const PROFILE_TIER_HALO_RADIUS: Record<ProfilePortraitTierHaloVariant, ProfileTierHaloRadius> = {
  /** Single radius with the portrait — vector frame provides the colored edge (no inner black ring). */
  profile: {
    outer: "rounded-[1.35rem]",
    mask: "rounded-[1.35rem]",
    inner: "rounded-[1.35rem]",
    gutter: "",
    ring: "",
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

/** Single-pass frame: no inner mask ring; content flush to outer radius (SVG defines the colored edge). */
export const PROFILE_TIER_HALO_CLEAN: Record<
  Extract<ProfilePortraitTierHaloVariant, "card" | "compact" | "avatar">,
  ProfileTierHaloRadius
> = {
  card: {
    outer: "rounded-2xl",
    mask: "rounded-2xl",
    inner: "rounded-2xl",
    gutter: "",
    ring: "",
  },
  compact: {
    outer: "rounded-xl",
    mask: "rounded-xl",
    inner: "rounded-xl",
    gutter: "",
    ring: "",
  },
  avatar: {
    outer: "rounded-full",
    mask: "rounded-full",
    inner: "rounded-full",
    gutter: "",
    ring: "",
  },
};

export function profileTierHaloRadius(
  variant: ProfilePortraitTierHaloVariant,
  frameStyle: ProfilePortraitFrameStyle,
): ProfileTierHaloRadius {
  if (frameStyle === "clean" && variant !== "profile") {
    return PROFILE_TIER_HALO_CLEAN[variant];
  }
  return PROFILE_TIER_HALO_RADIUS[variant];
}

/** Match `RarityBorderOverlay` rounding to the halo inner shell. */
export function profileTierHaloInnerRoundClass(
  variant: ProfilePortraitTierHaloVariant,
  frameStyle: ProfilePortraitFrameStyle = "full",
): string {
  return profileTierHaloRadius(variant, frameStyle).inner;
}

/** Conic gradient for the profile-only rotating sheen behind the portrait ring. */
export function profileTierSheenGradient(rarity: CompanionRarity): string {
  const { common, rare, epic, legendary, mythic, abyssal } = RARITY_NEON;
  switch (rarity) {
    case "common":
      return `conic-gradient(from 0deg, ${common.core}99, ${common.outline}55, #a1a1aacc, ${common.core}aa, ${common.core}99)`;
    case "rare":
      return `conic-gradient(from 0deg, ${rare.from}, ${rare.to}, #93c5fd, ${rare.from}, ${rare.to})`;
    case "epic":
      return `conic-gradient(from 0deg, ${epic.from}, ${epic.to}, #c084fc, ${epic.from}, ${epic.to})`;
    case "legendary":
      return `conic-gradient(from 0deg, ${legendary.from}, ${legendary.to}, #fde68a, ${legendary.from}, ${legendary.to})`;
    case "mythic":
      return `conic-gradient(from 0deg, ${mythic.from}, ${mythic.to}, #ef4444, ${mythic.to}, ${mythic.from}, ${mythic.to})`;
    case "abyssal":
      return `conic-gradient(from 0deg, ${abyssal.from}, ${abyssal.to}, #e879f9, #f472b6, ${abyssal.from}, ${abyssal.to})`;
    default:
      return `conic-gradient(from 0deg, ${common.core}aa, ${common.outline}44, ${common.core}99)`;
  }
}
