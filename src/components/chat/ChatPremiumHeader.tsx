import { ArrowLeft, AlertOctagon, Flame, Images, Volume2 } from "lucide-react";
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
  rightSlot?: ReactNode;
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
  rightSlot,
}: Props) {
  const rarity = normalizeCompanionRarity(companion.rarity);

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
          <div className="relative shrink-0 w-[5.5rem] h-[5.5rem] md:w-28 md:h-28 overflow-visible p-1">
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
                aspectClassName="aspect-square w-full h-full"
                className="rounded-full"
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
                    className="absolute inset-0 z-[1] h-full w-full object-cover object-top rounded-full"
                  />
                ) : (
                  <span className="absolute inset-0 z-[2] flex items-center justify-center text-2xl font-gothic font-bold text-white/90 rounded-full">
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
