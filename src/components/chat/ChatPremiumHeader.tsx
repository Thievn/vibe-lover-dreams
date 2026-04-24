import { ArrowLeft, AlertOctagon, Flame, Heart, Images, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { DbCompanion } from "@/hooks/useCompanions";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  companion: Companion;
  dbComp: DbCompanion | null | undefined;
  imageUrl: string | null;
  headerAnimated: string | null;
  mood: string;
  tokensBalance: number;
  isAdminUser: boolean;
  safeWord: string;
  onBack: () => void;
  onSafeWordInfo: () => void;
  onCompanionPortraitClick?: () => void;
  onOpenGallery?: () => void;
  affectionTier?: number;
  affectionProgress?: number;
  affectionProgressMax?: number;
  rightSlot?: ReactNode;
  sessionControls?: ReactNode;
  /** True on small screens when the left gallery rail is hidden — show a gallery icon in the header. */
  showMobileGalleryButton?: boolean;
  /** Short line for Lovense / toy state, e.g. "2 linked" or "No toy" */
  toyStatusLabel?: string;
};

/**
 * Immersive top region: large portrait as the hero, bond + mood as quiet status chips.
 * Designed to stay legible on short phones while feeling “premium” on desktop.
 */
export function ChatPremiumHeader({
  companion,
  dbComp,
  imageUrl,
  headerAnimated,
  mood,
  tokensBalance,
  isAdminUser,
  safeWord,
  onBack,
  onSafeWordInfo,
  onCompanionPortraitClick,
  onOpenGallery,
  affectionTier = 1,
  affectionProgress = 0,
  affectionProgressMax = 1,
  rightSlot,
  sessionControls,
  showMobileGalleryButton = true,
  toyStatusLabel,
}: Props) {
  const rarity = normalizeCompanionRarity(companion.rarity);
  const tier = Math.min(5, Math.max(1, affectionTier));
  const max = Math.max(1, affectionProgressMax);
  const prog = Math.min(max, Math.max(0, affectionProgress));
  const pct = tier >= 5 ? 100 : Math.round((prog / max) * 100);

  return (
    <header
      className="shrink-0 border-b border-white/[0.08] bg-gradient-to-b from-black/95 via-black/70 to-black/50 backdrop-blur-2xl"
      style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-start gap-2 px-2.5 pt-2 pb-1 md:px-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-1.5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground active:scale-[0.98] sm:h-11 sm:w-11 shrink-0 touch-manipulation"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {onOpenGallery && showMobileGalleryButton ? (
          <button
            type="button"
            onClick={onOpenGallery}
            className="mt-1.5 inline-flex h-10 w-10 items-center justify-center rounded-xl text-primary/90 transition-colors hover:bg-primary/10 active:scale-[0.98] md:hidden touch-manipulation"
            title="Gallery"
            aria-label="Open gallery"
          >
            <Images className="h-5 w-5" />
          </button>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col items-center gap-2.5 md:gap-3">
          {/* Breathing + glow on the hero portrait */}
          <div className="relative flex w-full max-w-sm flex-col items-center">
            <motion.div
              className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-center"
              aria-hidden
            >
              <motion.div
                className="h-[8.5rem] w-[8.5rem] rounded-full md:h-[10.5rem] md:w-[10.5rem]"
                style={{
                  background:
                    "radial-gradient(closest-side, rgba(255,45,123,0.22) 0%, rgba(123,45,142,0.12) 45%, transparent 70%)",
                }}
                animate={{ scale: [1, 1.04, 1], opacity: [0.5, 0.85, 0.5] }}
                transition={{ duration: 5.5, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
              />
            </motion.div>

            <motion.div
              className="relative h-[7.5rem] w-[7.5rem] md:h-[9.5rem] md:w-[9.5rem] shrink-0 p-0.5"
              animate={{ y: [0, -3, 0] }}
              transition={{ duration: 7, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <PortraitViewLightbox
                alt={companion.name}
                stillSrc={imageUrl}
                animatedSrc={headerAnimated}
                triggerClassName="h-full w-full rounded-full"
              >
                <TierHaloPortraitFrame
                  variant="avatar"
                  frameStyle="clean"
                  rarity={rarity}
                  gradientFrom={companion.gradientFrom}
                  gradientTo={companion.gradientTo}
                  overlayUrl={dbComp?.rarity_border_overlay_url ?? null}
                  aspectClassName="aspect-square h-full w-full"
                  className="rounded-full"
                  neonEdgeBreathing
                >
                  <div
                    className="absolute inset-0 z-0 rounded-full"
                    style={{
                      background: imageUrl
                        ? undefined
                        : `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                    }}
                  />
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt=""
                      className="absolute inset-0 z-[1] h-full w-full rounded-full object-cover object-top"
                    />
                  ) : (
                    <span className="absolute inset-0 z-[2] flex items-center justify-center rounded-full font-gothic text-3xl font-bold text-white/90 md:text-4xl">
                      {companion.name.charAt(0)}
                    </span>
                  )}
                </TierHaloPortraitFrame>
              </PortraitViewLightbox>
              {onCompanionPortraitClick ? (
                <button
                  type="button"
                  onClick={onCompanionPortraitClick}
                  className="absolute -bottom-0.5 -right-0.5 z-[8] flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-black/85 text-primary shadow-lg shadow-primary/20 hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:h-11 sm:w-11 touch-manipulation"
                  title="Voice settings"
                  aria-label="Voice settings"
                >
                  <Volume2 className="h-4 w-4" />
                </button>
              ) : null}
            </motion.div>

            <div className="mt-2.5 w-full min-w-0 text-center">
              <h1 className="font-gothic text-xl font-bold tracking-tight text-foreground drop-shadow-sm md:text-2xl">
                {companion.name}
              </h1>
              <p className="mt-0.5 text-xs font-medium leading-snug text-primary/88 md:text-sm line-clamp-2">
                {companion.tagline}
              </p>
            </div>
          </div>

          {/* Status — compact chips, soft pulse on live metrics */}
          <div className="flex w-full max-w-md flex-wrap items-center justify-center gap-1.5 px-1">
            <motion.span
              className="inline-flex max-w-full items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-primary/95"
              animate={{ boxShadow: ["0 0 0 0 rgba(255,45,123,0)", "0 0 16px 0 rgba(255,45,123,0.15)", "0 0 0 0 rgba(255,45,123,0)"] }}
              transition={{ duration: 3.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
            >
              <span className="truncate">{mood}</span>
            </motion.span>
            <span
              className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/40 px-2 py-0.5"
              title={tier >= 5 ? "Bond maxed" : `Bond · tier ${tier} of 5`}
            >
              {Array.from({ length: 5 }, (_, i) => (
                <Heart
                  key={i}
                  className={cn(
                    "h-2.5 w-2.5 sm:h-3 sm:w-3",
                    i < tier ? "fill-primary text-primary drop-shadow-[0_0_6px_hsl(320_85%_55%_/_0.4)]" : "text-white/12",
                  )}
                  aria-hidden
                />
              ))}
              <span className="ml-0.5 text-[8px] font-bold tabular-nums text-muted-foreground/90 sm:text-[9px]">
                {tier}/5
              </span>
            </span>
            {toyStatusLabel ? (
              <motion.span
                className="inline-flex max-w-[9rem] items-center truncate rounded-full border border-cyan-500/25 bg-cyan-950/35 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cyan-200/90"
                animate={{ opacity: [0.8, 1, 0.8] }}
                transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                title="Device status"
              >
                {toyStatusLabel}
              </motion.span>
            ) : null}
          </div>
          {tier < 5 ? (
            <div
              className="h-0.5 w-full max-w-[12rem] overflow-hidden rounded-full border border-white/[0.08] bg-white/[0.05]"
              title="Bond progress"
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary/80 to-fuchsia-500/90 transition-[width] duration-500 ease-out"
                style={{ width: `${pct}%` }}
              />
            </div>
          ) : null}

          {sessionControls ? <div className="mt-0.5 flex w-full max-w-sm justify-center px-1">{sessionControls}</div> : null}
        </div>

        <div className="mt-1.5 flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
          {rightSlot}
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/40 px-1.5 py-0.5 text-[10px] sm:px-2 sm:py-1 sm:text-xs">
            <Flame className="h-3 w-3 shrink-0 text-primary sm:h-3.5 sm:w-3.5" />
            <span
              className={cn(
                "font-semibold tabular-nums",
                !isAdminUser && tokensBalance < 100 ? "text-destructive" : "text-foreground",
              )}
            >
              {isAdminUser ? "∞" : tokensBalance.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={onSafeWordInfo}
            className="rounded-lg p-1.5 text-destructive/90 transition-colors hover:bg-destructive/10 sm:p-2"
            title="Safe word"
            aria-label="Safe word"
          >
            <AlertOctagon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>
      <p className="border-t border-white/[0.05] px-4 py-1.5 text-center text-[9px] text-muted-foreground/75 md:text-[10px]">
        {onCompanionPortraitClick ? (
          <span>
            <span className="text-foreground/80">Voice</span> on her badge ·{" "}
          </span>
        ) : null}
        <Link to={`/companions/${companion.id}`} className="text-primary/80 underline-offset-2 hover:underline">
          Full profile
        </Link>
        {onOpenGallery ? (
          <span className="hidden md:inline">
            {" "}
            ·{" "}
            <button
              type="button"
              onClick={onOpenGallery}
              className="text-primary/80 underline-offset-2 hover:underline"
            >
              Gallery
            </button>
          </span>
        ) : null}
      </p>
    </header>
  );
}
