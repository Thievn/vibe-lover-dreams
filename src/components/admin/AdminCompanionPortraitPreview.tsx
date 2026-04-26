import { ProfilePortraitTierHalo } from "@/components/rarity/ProfilePortraitTierHalo";
import { RarityBorderOverlay } from "@/components/rarity/RarityBorderOverlay";
import { RarityTierCaption } from "@/components/rarity/RarityTierCaption";
import { cn } from "@/lib/utils";
import { isVideoPortraitUrl } from "@/lib/companionMedia";
import type { CompanionRarity } from "@/lib/companionRarity";

type Props = {
  name: string;
  stillSrc: string | null;
  animatedSrc: string | null;
  /** Mirrors `shouldShowProfileLoopVideo` on the public profile. */
  profileLoopEnabled: boolean;
  rarity: CompanionRarity;
  isAbyssal: boolean;
  gradientFrom: string;
  gradientTo: string;
  overlayUrl: string | null;
  className?: string;
  /** Sizing: admin editor column uses a modest width. */
  shellClassName?: string;
};

/**
 * WYSIWYG for Character management: same `ProfilePortraitTierHalo` + `RarityBorderOverlay` path as
 * `CompanionProfile` (profile polish, 9:16 + frame bleed when a looping MP4 is on).
 */
export function AdminCompanionPortraitPreview({
  name,
  stillSrc,
  animatedSrc,
  profileLoopEnabled,
  rarity,
  isAbyssal,
  gradientFrom,
  gradientTo,
  overlayUrl,
  className,
  shellClassName,
}: Props) {
  const loopVideoActive = Boolean(
    profileLoopEnabled && animatedSrc && isVideoPortraitUrl(animatedSrc),
  );
  const portraitAspectClass = loopVideoActive ? "aspect-[9/16]" : "aspect-[3/4]";

  return (
    <div className={cn("w-full", shellClassName, className)}>
      <ProfilePortraitTierHalo
        rarity={rarity}
        isAbyssal={isAbyssal}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
      >
        <div
          className={cn("relative w-full overflow-hidden rounded-[1.35rem] bg-black/15", portraitAspectClass)}
        >
          <div
            className="absolute inset-0 z-0"
            style={{ background: `linear-gradient(160deg, ${gradientFrom}66, ${gradientTo}55)` }}
          />
          {loopVideoActive && animatedSrc ? (
            <>
              {stillSrc ? (
                <img
                  src={stillSrc}
                  alt=""
                  className="absolute inset-0 z-[1] h-full w-full object-cover object-center"
                />
              ) : null}
              <video
                key={animatedSrc}
                className="absolute inset-0 z-[2] h-full w-full object-cover object-center"
                src={animatedSrc}
                autoPlay
                muted
                loop
                playsInline
              />
            </>
          ) : animatedSrc && !isVideoPortraitUrl(animatedSrc) ? (
            <img
              src={animatedSrc}
              alt=""
              className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.08] object-cover object-top"
            />
          ) : stillSrc ? (
            <img
              src={stillSrc}
              alt=""
              className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.08] object-cover object-top"
            />
          ) : (
            <div className="absolute inset-0 z-[1] flex items-center justify-center">
              <span className="font-gothic text-5xl font-bold text-white/90">{name.charAt(0)}</span>
            </div>
          )}
          <div
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent",
              loopVideoActive ? "z-[3]" : "z-[1]",
            )}
          />
          <RarityBorderOverlay
            rarity={rarity}
            overlayUrl={overlayUrl}
            abyssal={isAbyssal}
            profilePolish
            gradientFrom={gradientFrom}
            gradientTo={gradientTo}
            frameBleed={loopVideoActive}
            className={loopVideoActive ? "z-[4]" : undefined}
          />
          <RarityTierCaption rarity={rarity} />
        </div>
      </ProfilePortraitTierHalo>
    </div>
  );
}
