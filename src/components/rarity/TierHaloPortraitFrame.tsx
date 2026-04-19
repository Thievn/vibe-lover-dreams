import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { ProfilePortraitTierHalo } from "@/components/rarity/ProfilePortraitTierHalo";
import {
  profileTierHaloInnerRoundClass,
  type ProfilePortraitFrameStyle,
  type ProfilePortraitTierHaloVariant,
} from "@/lib/profilePortraitTierHalo";
import { RarityBorderOverlay } from "@/components/rarity/RarityBorderOverlay";

type Props = {
  variant: Extract<ProfilePortraitTierHaloVariant, "card" | "compact" | "avatar">;
  frameStyle?: ProfilePortraitFrameStyle;
  rarity: CompanionRarity;
  gradientFrom: string;
  gradientTo: string;
  overlayUrl?: string | null;
  /** Defaults to trading-card portrait ratio. */
  aspectClassName?: string;
  /** Soft pulsing tier neon (e.g. chat header round portrait). */
  neonEdgeBreathing?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * Static tier halo + vector frame for grids, forge preview, and Nexus (not profile — no spin / pop).
 */
export function TierHaloPortraitFrame({
  variant,
  frameStyle = "full",
  rarity,
  gradientFrom,
  gradientTo,
  overlayUrl,
  aspectClassName = "aspect-[3/4] w-full",
  neonEdgeBreathing = false,
  className,
  children,
}: Props) {
  const isAbyssal = rarity === "abyssal";
  const innerRound = profileTierHaloInnerRoundClass(variant, frameStyle);

  return (
    <ProfilePortraitTierHalo
      variant={variant}
      frameStyle={frameStyle}
      rarity={rarity}
      isAbyssal={isAbyssal}
      gradientFrom={gradientFrom}
      gradientTo={gradientTo}
      neonEdgeBreathing={neonEdgeBreathing}
      className={className}
    >
      <div className={cn("relative", aspectClassName)}>
        {children}
        <RarityBorderOverlay
          rarity={rarity}
          overlayUrl={overlayUrl}
          abyssal={isAbyssal}
          frameStyle={frameStyle}
          className={innerRound}
        />
      </div>
    </ProfilePortraitTierHalo>
  );
}
