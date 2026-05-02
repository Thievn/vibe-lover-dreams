import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import type { Companion } from "@/data/companions";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

type Props = {
  companion: Companion;
  imageUrl: string | null;
  headerAnimated: string | null;
  onVoiceClick?: () => void;
  className?: string;
  /** Shorter hero so the thread + composer get more vertical room on phones. */
  compact?: boolean;
};

/**
 * Mobile-only hero: large companion portrait so she’s the visual star (desktop uses `ChatLeftHeroPanel`).
 */
export function ChatMobilePortraitSpotlight({
  companion,
  imageUrl,
  headerAnimated,
  onVoiceClick,
  className,
  compact = false,
}: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        "relative z-[1] shrink-0 px-2 pt-0.5 pb-1 md:hidden",
        !compact && "px-3 pt-1 pb-2",
        className,
      )}
    >
      <div
        className="relative mx-auto w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/[0.12] bg-black/40 shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_24px_64px_-12px_rgba(0,0,0,0.65),0_0_80px_-20px_rgba(168,85,247,0.35)]"
        style={{ height: compact ? "min(26vh, 10.5rem)" : "min(42vh, 22rem)" }}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />
        <PortraitViewLightbox
          alt={companion.name}
          stillSrc={imageUrl}
          animatedSrc={headerAnimated}
          triggerClassName="block h-full w-full"
        >
          <div className="relative h-full min-h-[10rem] w-full">
            <div
              className="absolute inset-0"
              style={{
                background: imageUrl
                  ? undefined
                  : `linear-gradient(160deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
              }}
            />
            {imageUrl ? (
              <img
                src={imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover object-top"
                loading="eager"
                decoding="async"
                sizes="100vw"
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center font-gothic text-5xl font-bold text-white/90">
                {companion.name.charAt(0)}
              </span>
            )}
            {onVoiceClick ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onVoiceClick();
                }}
                className="absolute bottom-3 right-3 z-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/35 bg-black/75 text-primary shadow-lg backdrop-blur-sm transition-transform active:scale-95 hover:bg-primary/15"
                title="Voice & TTS"
                aria-label="Voice settings"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            ) : null}
          </div>
        </PortraitViewLightbox>
        <div className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-3 py-2 text-center">
          <p className="line-clamp-2 text-[11px] leading-tight text-white/85 drop-shadow-sm">{companion.tagline}</p>
        </div>
        <p className="pointer-events-none absolute bottom-2.5 left-0 right-0 text-center text-[9px] font-bold uppercase tracking-[0.2em] text-white/45">
          {normalizeCompanionRarity(companion.rarity)}
        </p>
      </div>
    </motion.div>
  );
}
