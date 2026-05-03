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
import { PORTRAIT_CARD_ASPECT_CLASS } from "@/lib/portraitAspect";

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
  /** Slight scale on vector frame so the rim / glow meets the card edge (stills + portrait video). */
  rarityFrameBleed?: boolean;
  /** Profile looping video — diagonal polish + stronger rim (same as `CompanionProfile` overlay pass). */
  profilePolish?: boolean;
  /** Merged onto `RarityBorderOverlay` (e.g. raise z-index when a video vignette sits above the default rim). */
  overlayClassName?: string;
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
  aspectClassName = `${PORTRAIT_CARD_ASPECT_CLASS} w-full`,
  neonEdgeBreathing = false,
  rarityFrameBleed = false,
  profilePolish = false,
  overlayClassName,
  className,
  children,
}: Props) {
  const isAbyssal = rarity === "abyssal";
  const innerRound = profileTierHaloInnerRoundClass(variant, frameStyle);
  const overlayBleed = rarityFrameBleed || Boolean(profilePolish);

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
      <div className={cn("relative min-h-0 overflow-hidden isolate", innerRound, aspectClassName)}>
        <RarityBorderOverlay
          rarity={rarity}
          overlayUrl={overlayUrl}
          abyssal={isAbyssal}
          frameStyle={frameStyle}
          frameBleed={overlayBleed}
          profilePolish={profilePolish}
          gradientFrom={gradientFrom}
          gradientTo={gradientTo}
          className={cn("z-0", innerRound, overlayClassName)}
        />
        <div className="relative z-[5] min-h-0 h-full w-full">{children}</div>
      </div>
    </ProfilePortraitTierHalo>
  );
}
