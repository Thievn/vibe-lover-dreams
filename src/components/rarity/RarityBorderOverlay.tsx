import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import {
  defaultRarityBorderPath,
  rarityCardOverlayGlowFilter,
  rarityProfileVectorGlowFilter,
} from "@/lib/companionRarity";
import type { ProfilePortraitFrameStyle } from "@/lib/profilePortraitTierHalo";

/** Same-origin SVG paths work as CSS masks; remote URLs often cannot mask cross-origin. */
function canUseSrcAsCssMask(src: string): boolean {
  if (src.startsWith("/")) return true;
  if (typeof window === "undefined") return false;
  try {
    const u = new URL(src, window.location.href);
    return u.origin === window.location.origin;
  } catch {
    return false;
  }
}

type Props = {
  rarity: CompanionRarity;
  /** Optional PNG/SVG URL from DB — replaces default frame asset. */
  overlayUrl?: string | null;
  className?: string;
  /** Extra wrapper class for Abyssal outer glow. */
  abyssal?: boolean;
  /** Profile sheet — diagonal mask + main vector rim (no duplicate glitch layers; avoids “floating” frame on tall portraits). */
  profilePolish?: boolean;
  /** Companion accent colors for a sharp 135° diagonal split on the profile frame. */
  gradientFrom?: string;
  gradientTo?: string;
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
  gradientFrom,
  gradientTo,
  frameBleed,
}: Props) {
  const src = (overlayUrl && overlayUrl.trim()) || defaultRarityBorderPath(rarity);
  const clean = frameStyle === "clean";
  /** Keep rim aligned to the portrait box — extra scale was clipping the frame SVG and showed a “floating” corner. */
  const profileFrameScale = frameBleed ? "scale-[1.075]" : "scale-100";

  const from = gradientFrom?.trim();
  const to = gradientTo?.trim();
  const maskOk = Boolean(
    profilePolish && from && to && canUseSrcAsCssMask(src),
  );

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
          {maskOk ? (
            <div
              className={cn(
                "pointer-events-none absolute left-1/2 top-1/2 z-0 h-full w-full -translate-x-1/2 -translate-y-1/2 origin-center mix-blend-screen opacity-[0.92]",
                profileFrameScale,
              )}
              style={{
                background: `linear-gradient(135deg, ${from} 0%, ${from} 50%, ${to} 50%, ${to} 100%)`,
                WebkitMaskImage: `url(${src})`,
                maskImage: `url(${src})`,
                maskSize: "100% 100%",
                WebkitMaskSize: "100% 100%",
                maskRepeat: "no-repeat",
                maskPosition: "center",
                WebkitMaskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
              }}
            />
          ) : null}
          <img
            src={src}
            alt=""
            className={cn(
              "absolute left-1/2 top-1/2 z-[1] h-full w-full -translate-x-1/2 -translate-y-1/2 origin-center object-fill opacity-[0.98]",
              profileFrameScale,
            )}
            style={{ filter: rarityProfileVectorGlowFilter(rarity) }}
          />
        </>
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
