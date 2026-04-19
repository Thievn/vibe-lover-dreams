import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { rarityNeonCardStaticGlow } from "@/lib/rarityNeonGlow";
import type { ProfilePortraitTierHaloVariant } from "@/lib/profilePortraitTierHalo";

type Props = {
  rarity: CompanionRarity;
  variant: ProfilePortraitTierHaloVariant;
  /** Companion profile hero — subtle breathe on the single edge glow. */
  profileBreathing?: boolean;
  roundClass: string;
};

/**
 * One edge-hugging glow (same system as Discovery / dashboard cards). No far outer bleed — avoids the black “gap” ring on profile.
 */
export function RarityNeonGlowLayers({ rarity, variant, profileBreathing, roundClass }: Props) {
  const glow = rarityNeonCardStaticGlow(rarity, variant);
  const breathe = profileBreathing === true;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 z-0",
        roundClass,
        breathe && "motion-reduce:animate-none animate-rarity-neon-outer-breathe",
      )}
      style={{ boxShadow: glow }}
    />
  );
}
