import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { RarityTierCaption } from "@/components/rarity/RarityTierCaption";
import { cn } from "@/lib/utils";
import { isVideoPortraitUrl } from "@/lib/companionMedia";
import type { CompanionRarity } from "@/lib/companionRarity";
import { PORTRAIT_CARD_ASPECT_CLASS, PROFILE_LOOP_VIDEO_ASPECT_CLASS } from "@/lib/portraitAspect";
import { profileTierHaloInnerRoundClass } from "@/lib/profilePortraitTierHalo";

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
 * WYSIWYG for Character management: same `TierHaloPortraitFrame` (clean card) as forge live preview + public profile.
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
  const portraitAspectClass = loopVideoActive
    ? PROFILE_LOOP_VIDEO_ASPECT_CLASS
    : PORTRAIT_CARD_ASPECT_CLASS;

  return (
    <div className={cn("w-full", shellClassName, className)}>
      <TierHaloPortraitFrame
        variant="card"
        frameStyle="clean"
        rarity={rarity}
        gradientFrom={gradientFrom}
        gradientTo={gradientTo}
        overlayUrl={overlayUrl}
        aspectClassName={cn(portraitAspectClass, "w-full")}
        rarityFrameBleed
        profilePolish={loopVideoActive}
        neonEdgeBreathing={false}
      >
        <div
          className={cn(
            "relative h-full min-h-0 w-full overflow-hidden",
            profileTierHaloInnerRoundClass("card", "clean"),
            loopVideoActive ? "bg-black" : "bg-transparent",
          )}
        >
          <div
            className="absolute inset-0 z-0"
            style={
              loopVideoActive
                ? { background: "#000" }
                : { background: `linear-gradient(160deg, ${gradientFrom}66, ${gradientTo}55)` }
            }
          />
          {loopVideoActive && animatedSrc ? (
            <video
              key={animatedSrc}
              className="absolute inset-0 z-[2] h-full w-full object-cover object-center"
              src={animatedSrc}
              poster={stillSrc ?? undefined}
              autoPlay
              muted
              loop
              playsInline
            />
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
          <RarityTierCaption rarity={rarity} />
        </div>
      </TierHaloPortraitFrame>
    </div>
  );
}
