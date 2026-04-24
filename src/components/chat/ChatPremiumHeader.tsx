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
  onSafeWordInfo: () => void;
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
  onSafeWordInfo,
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
      className="shrink-0 border-b border-white/[0.08] bg-black/60 backdrop-blur-xl"
      style={{ paddingTop: "max(0.25rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-center gap-2 px-2 py-2 sm:px-3">
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
            onClick={onSafeWordInfo}
            className="shrink-0 rounded-lg p-1.5 text-destructive/90 hover:bg-destructive/10"
            title="Safe word"
            aria-label="Safe word"
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
          className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-black/30 px-2 py-0.5"
          title="Bond"
        >
          {Array.from({ length: 5 }, (_, i) => (
            <Heart
              key={i}
              className={cn("h-2.5 w-2.5", i < tier ? "fill-primary text-primary" : "text-white/12")}
              aria-hidden
            />
          ))}
          <span className="ml-0.5 text-[8px] font-bold tabular-nums text-muted-foreground">{tier}/5</span>
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
          className="mx-2 mb-1.5 h-0.5 max-w-sm overflow-hidden rounded-full bg-white/[0.05] sm:mx-3"
          title="Bond"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-fuchsia-500/90"
            style={{ width: `${pct}%` }}
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
