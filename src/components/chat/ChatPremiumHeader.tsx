import { ArrowLeft, AlertOctagon, Flame, Heart, Images, Volume2 } from "lucide-react";
import { Link } from "react-router-dom";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { DbCompanion } from "@/hooks/useCompanions";
import type { ReactNode } from "react";

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
  /** Optional: tap companion portrait (voice settings). */
  onCompanionPortraitClick?: () => void;
  /** Opens in-chat companion gallery (generated images). */
  onOpenGallery?: () => void;
  /** Chat bond tier 1–5 (optional). */
  affectionTier?: number;
  affectionProgress?: number;
  affectionProgressMax?: number;
  rightSlot?: ReactNode;
  /** e.g. Classic / Live Voice toggle */
  sessionControls?: ReactNode;
};

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
}: Props) {
  const rarity = normalizeCompanionRarity(companion.rarity);
  const tier = Math.min(5, Math.max(1, affectionTier));
  const max = Math.max(1, affectionProgressMax);
  const prog = Math.min(max, Math.max(0, affectionProgress));
  const pct = tier >= 5 ? 100 : Math.round((prog / max) * 100);

  return (
    <header
      className="shrink-0 border-b border-white/[0.08] bg-gradient-to-b from-black/80 to-black/40 backdrop-blur-2xl"
      style={{ paddingTop: "max(0.35rem, env(safe-area-inset-top))" }}
    >
      <div className="flex items-start gap-3 px-3 pt-3 pb-2 md:px-5 md:pt-4">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-colors shrink-0 touch-manipulation active:scale-[0.98]"
          title="Back"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-col items-center flex-1 min-w-0 gap-2">
          <div className="relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-visible p-1 md:h-28 md:w-28">
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
                    background: imageUrl ? undefined : `linear-gradient(135deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                  }}
                />
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full rounded-full object-cover object-top"
                  />
                ) : (
                  <span className="absolute inset-0 z-[2] flex items-center justify-center rounded-full font-gothic text-2xl font-bold text-white/90">
                    {companion.name.charAt(0)}
                  </span>
                )}
              </TierHaloPortraitFrame>
            </PortraitViewLightbox>
            {onCompanionPortraitClick ? (
              <button
                type="button"
                onClick={onCompanionPortraitClick}
                className="absolute -bottom-1 -right-1 z-[8] flex h-11 w-11 items-center justify-center rounded-full border border-primary/40 bg-black/80 text-primary shadow-lg hover:bg-primary/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 touch-manipulation"
                title="Voice settings"
                aria-label="Voice settings"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="text-center w-full min-w-0">
            <h1 className="font-gothic text-lg md:text-xl font-bold text-foreground truncate">{companion.name}</h1>
            <p className="text-[11px] md:text-xs text-primary/90 truncate">{companion.tagline}</p>
            <p className="mt-1 inline-flex items-center justify-center rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
              {mood}
            </p>
            {sessionControls ? (
              <div className="mt-2 flex w-full justify-center px-1">{sessionControls}</div>
            ) : null}
            <div
              className="mt-2 w-full max-w-[14rem] mx-auto flex flex-col gap-1"
              title={tier >= 5 ? "Bond maxed" : `Bond · tier ${tier} of 5`}
            >
              <div className="flex items-center justify-center gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Heart
                    key={i}
                    className={`h-3.5 w-3.5 shrink-0 ${
                      i < tier ? "fill-primary text-primary drop-shadow-[0_0_6px_hsl(320_85%_55%_/_0.45)]" : "text-white/15"
                    }`}
                    aria-hidden
                  />
                ))}
                <span className="ml-1 text-[9px] font-semibold tabular-nums text-muted-foreground/90">
                  {tier}/5
                </span>
              </div>
              {tier < 5 ? (
                <div className="h-1 w-full rounded-full bg-white/[0.06] overflow-hidden border border-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary/80 to-fuchsia-500/90 transition-[width] duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              ) : (
                <div className="h-1 w-full rounded-full bg-gradient-to-r from-primary/50 via-fuchsia-500/40 to-primary/50 opacity-90" />
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
          {rightSlot}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/50 text-xs border border-border/50">
            <Flame className="h-3.5 w-3.5 text-primary shrink-0" />
            <span
              className={`font-semibold tabular-nums ${!isAdminUser && tokensBalance < 100 ? "text-destructive" : "text-foreground"}`}
            >
              {isAdminUser ? "∞" : tokensBalance.toLocaleString()}
            </span>
          </div>
          <button
            type="button"
            onClick={onSafeWordInfo}
            className="p-2 rounded-xl text-destructive/90 hover:bg-destructive/10 transition-colors"
            title="Safe word"
          >
            <AlertOctagon className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="flex items-center justify-center gap-3 pb-2 px-4 flex-wrap">
        <p className="text-[10px] text-center text-muted-foreground/80">
          {onCompanionPortraitClick ? "Voice on portrait · " : null}
          <Link to={`/companions/${companion.id}`} className="text-primary/90 hover:underline">
            Profile
          </Link>
        </p>
        {onOpenGallery ? (
          <button
            type="button"
            onClick={onOpenGallery}
            className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-primary hover:bg-primary/15 transition-colors touch-manipulation"
          >
            <Images className="h-3.5 w-3.5" />
            Gallery
          </button>
        ) : null}
      </div>
    </header>
  );
}
