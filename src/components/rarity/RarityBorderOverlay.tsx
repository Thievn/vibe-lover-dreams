import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import {
  defaultRarityBorderPath,
  rarityCardOverlayGlowFilter,
  rarityGlitchLayerFilters,
  rarityProfileBloomFilter,
  rarityProfileVectorGlowFilter,
} from "@/lib/companionRarity";
import type { ProfilePortraitFrameStyle } from "@/lib/profilePortraitTierHalo";

type Props = {
  rarity: CompanionRarity;
  /** Optional PNG/SVG URL from DB — replaces default frame asset. */
  overlayUrl?: string | null;
  className?: string;
  /** Extra wrapper class for Abyssal outer glow. */
  abyssal?: boolean;
  /** Profile sheet only — soft bloom + breathe on the vector frame. */
  profilePolish?: boolean;
  /** Grid cards: single vector pass, no stacked Abyssal pulse on the wrapper. */
  frameStyle?: ProfilePortraitFrameStyle;
};

export function RarityBorderOverlay({
  rarity,
  overlayUrl,
  className,
  abyssal,
  profilePolish,
  frameStyle = "full",
}: Props) {
  const src = (overlayUrl && overlayUrl.trim()) || defaultRarityBorderPath(rarity);
  const clean = frameStyle === "clean";
  const [glitchFilterA, glitchFilterB] = rarityGlitchLayerFilters(rarity);
  const softGlitch = rarity === "abyssal";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] rounded-[inherit]",
        abyssal && !clean && !profilePolish && "animate-[abyssal-pulse_3.2s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden
    >
      {profilePolish ? (
        <>
          <img
            src={src}
            alt=""
            className="absolute inset-0 z-0 h-full w-full scale-[1.05] object-fill mix-blend-screen motion-reduce:opacity-25 opacity-[0.36] animate-profile-frame-bloom-breathe"
            style={{ filter: rarityProfileBloomFilter(rarity) }}
          />
          <div className="absolute inset-0 z-[1] motion-reduce:hidden" aria-hidden>
            <img
              src={src}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-fill mix-blend-screen will-change-transform",
                softGlitch ? "opacity-[0.34]" : "opacity-[0.44]",
              )}
              style={{
                filter: glitchFilterA,
                animation: "rarity-border-glitch-a 3.4s steps(8, end) infinite",
              }}
            />
            <img
              src={src}
              alt=""
              className={cn(
                "absolute inset-0 h-full w-full object-fill mix-blend-screen will-change-transform",
                softGlitch ? "opacity-[0.3]" : "opacity-[0.4]",
              )}
              style={{
                filter: glitchFilterB,
                animation: "rarity-border-glitch-b 3.65s steps(8, end) infinite",
              }}
            />
          </div>
          <img
            src={src}
            alt=""
            className="absolute inset-0 z-[3] h-full w-full object-fill opacity-[0.98]"
            style={{ filter: rarityProfileVectorGlowFilter(rarity) }}
          />
        </>
      ) : (
        <img
          src={src}
          alt=""
          className={cn("absolute inset-0 z-[1] h-full w-full object-fill", clean ? "opacity-[0.93]" : "opacity-[0.92]")}
          style={{ filter: rarityCardOverlayGlowFilter(rarity) }}
        />
      )}
    </div>
  );
}
