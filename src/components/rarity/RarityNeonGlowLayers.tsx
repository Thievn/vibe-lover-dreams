import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { rarityNeonInnerBoxShadow, rarityNeonOuterBoxShadow } from "@/lib/rarityNeonGlow";
import type { ProfilePortraitTierHaloVariant } from "@/lib/profilePortraitTierHalo";

type Props = {
  rarity: CompanionRarity;
  variant: ProfilePortraitTierHaloVariant;
  /** Companion profile hero only — 4s breathe on outer + inner. */
  profileBreathing?: boolean;
  roundClass: string;
};

function outerBleedClass(variant: ProfilePortraitTierHaloVariant): string {
  switch (variant) {
    case "profile":
      return "max-md:-inset-[8px] md:-inset-[12px]";
    case "compact":
      return "max-md:-inset-[6px] md:-inset-[8px]";
    case "avatar":
      return "max-md:-inset-[3px] md:-inset-[4px]";
    default:
      return "max-md:-inset-[8px] md:-inset-[10px]";
  }
}

export function RarityNeonGlowLayers({ rarity, variant, profileBreathing, roundClass }: Props) {
  const outer = rarityNeonOuterBoxShadow(rarity, variant);
  const inner = rarityNeonInnerBoxShadow(rarity, variant);
  const breathe = profileBreathing === true;

  return (
    <>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute z-0",
          roundClass,
          outerBleedClass(variant),
          breathe && "motion-reduce:animate-none animate-rarity-neon-outer-breathe",
        )}
        style={{ boxShadow: outer }}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 z-0",
          roundClass,
          breathe && "motion-reduce:animate-none animate-rarity-neon-inner-breathe",
        )}
        style={{ boxShadow: inner }}
      />
    </>
  );
}
