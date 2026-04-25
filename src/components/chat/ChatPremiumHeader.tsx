import { motion } from "framer-motion";
import { ArrowLeft, AlertOctagon, Flame, Heart, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  companion: Companion;
  mood: string;
  tokensBalance: number;
  isAdminUser: boolean;
  safeWord: string;
  onBack: () => void;
  /** Hard stop: toys, ramp, and live voice. */
  onEmergencyStop: () => void;
  onOpenGallery?: () => void;
  affectionTier?: number;
  affectionProgress?: number;
  affectionProgressMax?: number;
  rightSlot?: ReactNode;
  sessionControls?: ReactNode;
  showMobileGalleryButton?: boolean;
  toyStatusLabel?: string;
  /** Shown in split layout: portrait lives in the left column, not here. */
  showHeroInLeftColumn?: boolean;
};

/**
 * Slim chat chrome — no large portrait (that’s on the left hero in split view).
 * Keeps navigation, identity, status chips, and credits on a short strip.
 */
export function ChatPremiumHeader({
  companion,
  mood,
  tokensBalance,
  isAdminUser,
  safeWord,
  onBack,
  onEmergencyStop,
  onOpenGallery,
  affectionTier = 1,
  affectionProgress = 0,
  affectionProgressMax = 1,
  rightSlot,
  sessionControls,
  showMobileGalleryButton = true,
  toyStatusLabel,
  showHeroInLeftColumn = true,
}: Props) {
  const tier = Math.min(5, Math.max(1, affectionTier));
  const max = Math.max(1, affectionProgressMax);
  const prog = Math.min(max, Math.max(0, affectionProgress));
  const pct = tier >= 5 ? 100 : Math.round((prog / max) * 100);
  const rarity = normalizeCompanionRarity(companion.rarity);

  return (
    <header
      className="shrink-0 border-b border-white/[0.08] bg-black/55 shadow-[0_4px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl"
      style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2 px-2 py-2.5 sm:px-4 sm:py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-foreground"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {onOpenGallery && showMobileGalleryButton ? (
          <button
            type="button"
            onClick={onOpenGallery}
            className={cn(
              "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary/90 transition-colors hover:bg-primary/10",
              "md:hidden",
            )}
            title="Gallery"
            aria-label="Open gallery"
          >
            <Images className="h-5 w-5" />
          </button>
        ) : null}

        <div className="min-w-0 flex-1 text-left">
          <h1
            className="font-gothic text-base font-bold leading-tight tracking-tight text-foreground sm:text-lg"
            title={companion.name}
          >
            {companion.name}
          </h1>
          <p className="line-clamp-1 text-[11px] text-primary/85 sm:text-xs" title={companion.tagline}>
            {companion.tagline}
          </p>
          {showHeroInLeftColumn && (
            <p className="mt-0.5 hidden text-[9px] text-muted-foreground/80 md:block sm:text-[10px]">
              Portrait is on the left on desktop{""}
              {onOpenGallery ? (
                <>
                  {" "}
                  ·{" "}
                  <button
                    type="button"
                    onClick={onOpenGallery}
                    className="text-primary/90 underline-offset-2 hover:underline"
                  >
                    Full gallery
                  </button>
                </>
              ) : null}
            </p>
          )}
        </div>

        <div className="hidden shrink-0 sm:block">{sessionControls}</div>

        <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
          {rightSlot}
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/50 bg-muted/30 px-2 py-0.5 text-[10px] sm:py-1 sm:text-xs">
            <Flame className="h-3 w-3 shrink-0 text-primary" />
            <span
              className={cn(
                "max-w-[5.5rem] truncate font-semibold tabular-nums",
                !isAdminUser && tokensBalance < 100 ? "text-destructive" : "text-foreground",
              )}
              title={isAdminUser ? "Admin" : `Forge credits: ${tokensBalance}`}
            >
              {isAdminUser ? "∞" : tokensBalance.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={onEmergencyStop}
            className="shrink-0 rounded-lg p-1.5 text-destructive/90 hover:bg-destructive/10"
            title="Emergency stop (same as your safe word)"
            aria-label="Emergency stop all activity"
          >
            <AlertOctagon className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-white/[0.05] px-2 py-1.5 sm:px-3 sm:py-2">
        <div className="sm:hidden w-full min-w-0 flex justify-center">{sessionControls}</div>
        <span
          className="inline-flex max-w-full items-center rounded-full border border-primary/30 bg-primary/8 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary/95"
          title="Mood"
        >
          <span className="truncate">{mood}</span>
        </span>
        <span
          className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-gradient-to-b from-primary/10 to-black/40 px-2.5 py-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-3 sm:py-1.5"
          title="Bond"
        >
          {Array.from({ length: 5 }, (_, i) => {
            const filled = i < tier;
            return (
              <motion.span
                key={i}
                initial={false}
                animate={
                  filled
                    ? { scale: [1, 1.15, 1], filter: ["brightness(1)", "brightness(1.25)", "brightness(1)"] }
                    : { scale: 1 }
                }
                transition={{ duration: 0.5, delay: i * 0.05, ease: "easeOut" }}
                className="inline-flex"
              >
                <Heart
                  className={cn(
                    "h-4 w-4 sm:h-5 sm:w-5",
                    filled
                      ? "fill-primary text-primary drop-shadow-[0_0_10px_rgba(255,45,123,0.45)]"
                      : "text-white/15",
                  )}
                  strokeWidth={filled ? 0 : 1.5}
                  aria-hidden
                />
              </motion.span>
            );
          })}
          <span className="ml-0.5 text-[9px] font-bold tabular-nums text-muted-foreground sm:text-[10px]">{tier}/5</span>
        </span>
        {toyStatusLabel ? (
          <span
            className="max-w-[10rem] truncate rounded-full border border-cyan-500/20 bg-cyan-950/25 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-cyan-200/90"
            title="Devices"
          >
            {toyStatusLabel}
          </span>
        ) : null}
        <span className="ml-auto text-[8px] uppercase text-muted-foreground/70">{rarity}</span>
      </div>
      {tier < 5 ? (
        <div
          className="mx-2 mb-1.5 h-1 max-w-sm overflow-hidden rounded-full bg-white/[0.08] sm:mx-3"
          title="Bond"
        >
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-primary/90 to-fuchsia-500/95 shadow-[0_0_12px_rgba(255,45,123,0.35)]"
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 22 }}
          />
        </div>
      ) : null}

      <p className="px-2 pb-1.5 text-center text-[9px] text-muted-foreground/80 sm:px-3 sm:text-[10px] sm:pb-2">
        <Link to={`/companions/${companion.id}`} className="text-primary/80 underline-offset-2 hover:underline">
          Full profile
        </Link>
        {onOpenGallery ? (
          <span>
            {" "}
            ·{" "}
            <button
              type="button"
              onClick={onOpenGallery}
              className="text-primary/80 underline-offset-2 hover:underline"
            >
              Gallery sheet
            </button>
          </span>
        ) : null}
        {safeWord ? <span className="text-muted-foreground/50"> · Safe: {safeWord}</span> : null}
      </p>
    </header>
  );
}
