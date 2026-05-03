import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { defaultRarityBorderPath, rarityCardOverlayGlowFilter } from "@/lib/companionRarity";
import type { ProfilePortraitFrameStyle } from "@/lib/profilePortraitTierHalo";

type Props = {
  rarity: CompanionRarity;
  /** Optional PNG/SVG URL from DB — replaces default frame asset. */
  overlayUrl?: string | null;
  className?: string;
  /** Extra wrapper class for Abyssal outer glow. */
  abyssal?: boolean;
  /** Profile looping video — same rim asset as cards, minimal glow (portrait stays on top). */
  profilePolish?: boolean;
  /** Grid cards: single vector pass, no stacked Abyssal pulse on the wrapper. */
  frameStyle?: ProfilePortraitFrameStyle;
  /** Profile hero — vector frame art can sit inset; slight scale pulls the rim flush with the image edges. */
  frameBleed?: boolean;
};

export function RarityBorderOverlay({
  rarity,
  overlayUrl,
  className,
  abyssal,
  profilePolish,
  frameStyle = "full",
  frameBleed,
}: Props) {
  const src = (overlayUrl && overlayUrl.trim()) || defaultRarityBorderPath(rarity);
  const clean = frameStyle === "clean";
  /** Keep rim aligned to the portrait box — extra scale was clipping the frame SVG and showed a “floating” corner. */
  const profileFrameScale = frameBleed ? "scale-[1.075]" : "scale-100";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-0 rounded-[inherit]",
        abyssal && !clean && !profilePolish && "animate-[abyssal-pulse_3.2s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden
    >
      {profilePolish ? (
        <img
          src={src}
          alt=""
          className={cn(
            "absolute left-1/2 top-1/2 z-[1] h-full w-full -translate-x-1/2 -translate-y-1/2 origin-center object-fill opacity-[0.95]",
            profileFrameScale,
          )}
          style={{ filter: rarityCardOverlayGlowFilter(rarity) }}
        />
      ) : (
        <img
          src={src}
          alt=""
          className={cn(
            "absolute z-[1] h-full w-full object-fill",
            frameBleed
              ? "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 origin-center scale-[1.12]"
              : "inset-0",
            clean ? "opacity-[0.93]" : "opacity-[0.92]",
          )}
          style={{ filter: rarityCardOverlayGlowFilter(rarity) }}
        />
      )}
    </div>
  );
}
