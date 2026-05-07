import type { DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl, isEligibleLoopPortraitVideoUrl, isVideoPortraitUrl } from "@/lib/companionMedia";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";

export type XMarketingHeroCardProps = {
  companion: DbCompanion;
  /** Primary still or image URL for the card interior. */
  mediaUrl: string | null;
  /**
   * When the hub prefers the looping selfie MP4 for X, pass it here so the card interior
   * matches what will be baked for Zernio (still may remain the catalog URL in `mediaUrl`).
   */
  loopVideoUrl?: string | null;
  pinCount?: number;
  className?: string;
  /** Outer wrapper — default matches roster / tweet column. */
  aspectClassName?: string;
};

/**
 * Discover-style marketing card: tier halo frame, rarity + forge badges, name + tagline,
 * portrait still or looping MP4 inside.
 */
export function XMarketingHeroCard({
  companion,
  mediaUrl,
  loopVideoUrl,
  pinCount = 0,
  className,
  aspectClassName = "aspect-[2/3] w-full max-h-[min(56vh,520px)] mx-auto",
}: XMarketingHeroCardProps) {
  const rarity = normalizeCompanionRarity(companion.rarity);
  const interiorUrl =
    loopVideoUrl?.trim() && isEligibleLoopPortraitVideoUrl(loopVideoUrl, companion.profile_loop_video_enabled)
      ? loopVideoUrl.trim()
      : mediaUrl?.trim() ?? null;
  const showVideo = Boolean(
    interiorUrl && isEligibleLoopPortraitVideoUrl(interiorUrl, companion.profile_loop_video_enabled),
  );
  const stillUrl =
    !showVideo && mediaUrl?.trim()
      ? mediaUrl.trim()
      : !showVideo
        ? galleryStaticPortraitUrl(companion, companion.id) ?? null
        : null;

  return (
    <div className={cn("relative", aspectClassName, className)}>
      <TierHaloPortraitFrame
        variant="card"
        frameStyle="clean"
        rarity={rarity}
        gradientFrom={companion.gradient_from}
        gradientTo={companion.gradient_to}
        overlayUrl={companion.rarity_border_overlay_url}
        rarityFrameBleed
      >
        <div
          className="absolute inset-0 z-0"
          style={{
            background: stillUrl || showVideo ? undefined : `linear-gradient(160deg, ${companion.gradient_from}, ${companion.gradient_to})`,
          }}
        />
        {showVideo && interiorUrl ? (
          <video
            src={interiorUrl}
            className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        ) : stillUrl ? (
          <img
            src={stillUrl}
            alt=""
            className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top"
          />
        ) : (
          <span className="absolute inset-0 z-[2] flex items-center justify-center font-gothic text-4xl text-white/85">
            {companion.name.charAt(0)}
          </span>
        )}
        <div className="absolute left-1.5 top-1.5 z-[4] flex flex-wrap gap-0.5">
          <span className="rounded bg-black/65 border border-white/10 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-white/90">
            {rarity}
          </span>
          {companion.id.startsWith("cc-") ? (
            <span className="rounded bg-black/65 border border-[#FF2D7B]/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[#ffb8d9]">
              Forge
            </span>
          ) : null}
        </div>
        {pinCount > 0 ? (
          <div className="absolute right-1.5 top-1.5 z-[4] rounded bg-black/65 border border-primary/30 px-1.5 py-0.5 text-[8px] font-bold text-primary">
            {pinCount}
          </div>
        ) : null}
        <div className="absolute inset-x-0 bottom-0 z-[4] bg-gradient-to-t from-black via-black/70 to-transparent p-2.5">
          <p className="font-gothic text-sm font-bold text-white line-clamp-2 leading-tight">{companion.name}</p>
          <p className="text-[11px] text-white/75 line-clamp-2 mt-0.5 leading-snug">{companion.tagline}</p>
        </div>
      </TierHaloPortraitFrame>
    </div>
  );
}
