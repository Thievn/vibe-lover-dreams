import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import {
  defaultRarityBorderPath,
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
        <img
          src={src}
          alt=""
          className="absolute inset-0 z-0 h-full w-full scale-[1.05] object-fill mix-blend-screen motion-reduce:opacity-25 opacity-[0.36] motion-reduce:animate-none animate-[profile-frame-bloom-breathe_3s_ease-in-out_infinite]"
          style={{ filter: rarityProfileBloomFilter(rarity) }}
        />
      ) : null}
      <img
        src={src}
        alt=""
        className={cn(
          "absolute inset-0 z-[1] h-full w-full object-fill",
          clean ? "opacity-[0.93]" : profilePolish ? "opacity-[0.98]" : "opacity-[0.92]",
        )}
        style={profilePolish ? { filter: rarityProfileVectorGlowFilter(rarity) } : undefined}
      />
    </div>
  );
}
