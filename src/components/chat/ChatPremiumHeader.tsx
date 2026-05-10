import { motion } from "framer-motion";
import { ArrowLeft, AlertOctagon, Flame, Heart, Images } from "lucide-react";
import { Link } from "react-router-dom";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ChatPremiumHeaderVariant = "default" | "luxurySlim";

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
  /** Tighter header + hide bond bar / footer links — mobile chat shell. */
  mobileCompact?: boolean;
  /** Ultra-slim cyber-luxury strip (~56px) with avatar ring + status dot. */
  variant?: ChatPremiumHeaderVariant;
  /** Portrait / still URL for the glowing avatar ring (luxurySlim). */
  companionImageUrl?: string | null;
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
  mobileCompact = false,
  variant = "default",
  companionImageUrl = null,
}: Props) {
  const tier = Math.min(5, Math.max(1, affectionTier));
  const max = Math.max(1, affectionProgressMax);
  const prog = Math.min(max, Math.max(0, affectionProgress));
  const pct = tier >= 5 ? 100 : Math.round((prog / max) * 100);
  const rarity = normalizeCompanionRarity(companion.rarity);

  const compact = mobileCompact || variant === "luxurySlim";

  if (variant === "luxurySlim") {
    return (
      <header
        className="shrink-0 border-b border-fuchsia-500/[0.12] bg-[#050308]/80 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl"
        style={{ paddingTop: "max(0.2rem, env(safe-area-inset-top))" }}
      >
        <div className="flex min-h-[56px] max-h-[60px] items-center gap-1.5 px-2 py-1 sm:gap-2 sm:px-3">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] text-muted-foreground transition-colors hover:border-fuchsia-500/25 hover:bg-white/[0.04] hover:text-foreground"
            title="Back"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <div className="relative shrink-0">
            <div
              className="absolute -inset-0.5 rounded-full bg-gradient-to-tr from-fuchsia-600/50 via-purple-600/40 to-cyan-400/30 opacity-80 blur-[6px]"
              aria-hidden
            />
            <div className="relative h-9 w-9 overflow-hidden rounded-full ring-2 ring-fuchsia-500/45 ring-offset-2 ring-offset-[#050308] shadow-[0_0_18px_rgba(236,72,153,0.45)]">
              {companionImageUrl ? (
                <img src={companionImageUrl} alt="" className="h-full w-full object-cover object-top" width={36} height={36} />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-[11px] font-gothic font-bold text-white"
                  style={{
                    background: `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                  }}
                >
                  {companion.name.charAt(0)}
                </div>
              )}
            </div>
          </div>

          <div className="min-w-0 flex-1 text-left">
            <div className="flex items-center gap-1.5">
              <h1
                className="truncate font-gothic text-[0.95rem] font-semibold tracking-[0.02em] text-white/95 sm:text-base"
                title={companion.name}
              >
                {companion.name}
              </h1>
              <span className="relative flex h-2 w-2 shrink-0" title="Online">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/40 opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
              </span>
            </div>
            <p className="truncate text-[9px] font-medium uppercase tracking-[0.22em] text-fuchsia-200/55" title={mood}>
              {mood}
            </p>
          </div>

          <div className="flex max-w-[min(38vw,9.5rem)] shrink-0 items-center gap-0.5 overflow-x-auto py-0.5 sm:max-w-[13rem] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="flex shrink-0 scale-[0.92] items-center gap-1 origin-right sm:scale-100">{sessionControls}</div>
          </div>

          {onOpenGallery && showMobileGalleryButton ? (
            <button
              type="button"
              onClick={onOpenGallery}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.08] text-fuchsia-300/90 transition-colors hover:border-fuchsia-500/35 hover:bg-fuchsia-500/10 md:hidden"
              title="Gallery"
              aria-label="Open gallery"
            >
              <Images className="h-4 w-4" />
            </button>
          ) : null}

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            {rightSlot}
            <div className="inline-flex items-center gap-0.5 rounded-full border border-white/[0.08] bg-black/50 px-1.5 py-0.5 text-[9px] backdrop-blur-md sm:px-2 sm:text-[10px]">
              <Flame className="h-2.5 w-2.5 shrink-0 text-fuchsia-400" />
              <span
                className={cn(
                  "max-w-[2.75rem] truncate font-semibold tabular-nums sm:max-w-[3.25rem]",
                  !isAdminUser && tokensBalance < 100 ? "text-rose-300" : "text-white/90",
                )}
                title={isAdminUser ? "Admin" : `Forge credits: ${tokensBalance}`}
              >
                {isAdminUser ? "∞" : tokensBalance.toLocaleString()}
              </span>
            </div>
            <button
              type="button"
              onClick={onEmergencyStop}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-rose-500/15 text-rose-400/90 transition-colors hover:bg-rose-500/10"
              title="Emergency stop (same as your safe word)"
              aria-label="Emergency stop all activity"
            >
              <AlertOctagon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header
      className={cn(
        "shrink-0 border-b border-white/[0.08] bg-black/55 shadow-[0_4px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl",
        compact && "shadow-[0_2px_16px_rgba(0,0,0,0.25)]",
      )}
      style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
    >
      <div className={cn("flex items-center gap-2 px-2 sm:px-4", compact ? "py-1.5 sm:py-2" : "py-2.5 sm:py-3")}>
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
            className={cn(
              "font-gothic font-bold leading-tight tracking-tight text-foreground",
              compact ? "text-sm sm:text-base" : "text-base sm:text-lg",
            )}
            title={companion.name}
          >
            {companion.name}
          </h1>
          <p
            className={cn(
              "line-clamp-1 text-primary/85",
              compact ? "text-[10px] sm:text-[11px]" : "text-[11px] sm:text-xs",
            )}
            title={companion.tagline}
          >
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

      <div
        className={cn(
          "flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-white/[0.05] px-2 sm:px-3",
          compact ? "py-1 sm:py-1.5" : "gap-y-1.5 py-1.5 sm:py-2",
        )}
      >
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
        {!compact ? <span className="ml-auto text-[8px] uppercase text-muted-foreground/70">{rarity}</span> : null}
      </div>
      {!compact && tier < 5 ? (
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

      {!compact ? (
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
      ) : null}
    </header>
  );
}
