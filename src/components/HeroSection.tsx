import { motion } from "framer-motion";
import { Flame, Infinity, Lock, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useCompanions } from "@/hooks/useCompanions";
import { companionImages } from "@/data/companionImages";
import { companions } from "@/data/companions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { getStaticRarityForCatalog, normalizeCompanionRarity } from "@/lib/companionRarity";
import type { CompanionRarity } from "@/lib/companionRarity";
import { TierHaloPortraitFrame } from "@/components/rarity/TierHaloPortraitFrame";
import { supabase } from "@/integrations/supabase/client";

interface HeroSectionProps {
  onGetStarted: () => void;
}

type HeroCard = {
  id: string;
  name: string;
  subtitle: string;
  role: string;
  img: string | undefined;
  rarity: CompanionRarity;
  gradientFrom: string;
  gradientTo: string;
  rarityBorderOverlayUrl: string | null;
};

function shufflePickSix(pool: HeroCard[]): HeroCard[] {
  if (pool.length === 0) return [];
  const copy = [...pool].sort(() => Math.random() - 0.5);
  return copy.slice(0, Math.min(6, copy.length));
}

function fallbackFromAssets(): HeroCard[] {
  return Object.entries(companionImages).map(([id, url]) => {
    const staticC = companions.find((c) => c.id === id);
    return {
      id,
      name: id
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" "),
      subtitle: "LustForge catalog",
      role: staticC?.role ?? "Catalog",
      img: url,
      rarity: getStaticRarityForCatalog(id),
      gradientFrom: staticC?.gradientFrom ?? "#FF2D7B",
      gradientTo: staticC?.gradientTo ?? "#00b89a",
      rarityBorderOverlayUrl: null,
    };
  });
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const location = useLocation();
  const { data: dbList, isLoading } = useCompanions();
  const [shuffled, setShuffled] = useState<HeroCard[]>([]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffleTick, setShuffleTick] = useState(0);
  /** Portrait URLs that failed to load (expired signed links, etc.) — show gradient + initial instead. */
  const [brokenPortraitIds, setBrokenPortraitIds] = useState<Set<string>>(() => new Set());

  const pool = useMemo((): HeroCard[] => {
    const rows = dbList || [];
    if (rows.length === 0) return fallbackFromAssets();
    return rows.map((db) => ({
      id: db.id,
      name: db.name,
      subtitle: db.tagline || "AI companion",
      role: db.role?.trim() || "Companion",
      img: galleryStaticPortraitUrl(db, db.id),
      rarity: normalizeCompanionRarity(db.rarity),
      gradientFrom: db.gradient_from,
      gradientTo: db.gradient_to,
      rarityBorderOverlayUrl: db.rarity_border_overlay_url ?? null,
    }));
  }, [dbList]);

  const poolForgedApprox = useMemo(() => pool.filter((c) => c.id.startsWith("cc-")).length, [pool]);

  const { data: publicForgedCount } = useQuery({
    queryKey: ["public-forged-companion-count"],
    queryFn: async (): Promise<number | null> => {
      const { count, error } = await supabase
        .from("custom_characters")
        .select("*", { count: "exact", head: true })
        .eq("is_public", true)
        .eq("approved", true);
      if (error) {
        console.error("public forged count:", error);
        return null;
      }
      return count ?? 0;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const forgedCompanionTotal = publicForgedCount ?? poolForgedApprox;

  const reshuffle = useCallback(() => {
    setIsShuffling(true);
    setShuffleTick((v) => v + 1);
    setShuffled(shufflePickSix(pool));
    window.setTimeout(() => setIsShuffling(false), 320);
  }, [pool]);

  useEffect(() => {
    if (pool.length === 0) return;
    setShuffled(shufflePickSix(pool));
  }, [pool]);

  const navTopPad =
    "pt-[max(5.25rem,calc(3.25rem+env(safe-area-inset-top,0px)))] sm:pt-[max(5.5rem,calc(3.5rem+env(safe-area-inset-top,0px)))]";

  if (isLoading && (dbList === undefined || dbList.length === 0)) {
    return (
      <section
        className={`relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-6 overflow-x-hidden ${navTopPad}`}
      >
        <div className="text-center text-muted-foreground text-sm animate-pulse">Syncing forge catalog…</div>
      </section>
    );
  }

  if (pool.length === 0) {
    return (
      <section className={`relative min-h-[70vh] flex items-center justify-center px-4 ${navTopPad}`}>
        <p className="text-muted-foreground text-sm text-center">No companions in the forge yet. Check back soon.</p>
      </section>
    );
  }

  return (
    <section
      className={`relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-3 sm:px-6 overflow-x-hidden pb-8 ${navTopPad}`}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.09] via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(100vw,640px)] h-[min(100vw,640px)] max-h-[72vh] rounded-full bg-primary/[0.08] blur-[130px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[min(90vw,480px)] h-40 rounded-full bg-accent/[0.06] blur-[90px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto w-full">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 sm:mb-4">
          <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-primary/35 bg-primary/[0.14] backdrop-blur-md text-primary text-[11px] sm:text-xs font-medium shadow-[0_0_24px_rgba(255,45,123,0.12)]">
            <Flame className="h-3 w-3 shrink-0" /> Strictly 18+ · AI-Powered Companions
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          className="font-gothic text-3xl sm:text-5xl md:text-6xl font-bold mb-3 sm:mb-4 leading-tight px-1"
        >
          <span className="gradient-vice-text">LustForge</span> <span className="text-foreground">AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-base sm:text-lg md:text-xl text-muted-foreground/90 mb-2 italic px-2"
        >
          Forge Your Fantasies
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs sm:text-sm text-muted-foreground/88 mb-6 sm:mb-8 max-w-xl mx-auto px-2 leading-relaxed"
        >
          AI companions that talk, tease, and connect to your smart toys. Immersive roleplay with real-time device integration — every persona, every scenario, zero judgment.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="inline-block"
        >
          <button
            type="button"
            onClick={onGetStarted}
            className="px-6 sm:px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base sm:text-lg glow-pink inline-flex items-center gap-2 touch-manipulation shadow-lg shadow-primary/25 border border-white/10"
          >
            <Flame className="h-5 w-5 shrink-0" /> Join the Waitlist
          </button>
        </motion.div>

        <div className="mt-10 sm:mt-12 w-full max-w-md mx-auto px-3 sm:px-4">
          <div className="grid grid-cols-3 gap-2 sm:gap-6 text-center">
            <div className="flex min-w-0 flex-col items-center">
              <div className="flex min-h-[2.75rem] sm:min-h-[3.25rem] w-full items-center justify-center">
                <motion.div
                  key={forgedCompanionTotal}
                  initial={{ scale: 0.85, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="font-gothic text-2xl sm:text-3xl font-bold tabular-nums leading-none text-primary"
                >
                  {forgedCompanionTotal}
                </motion.div>
              </div>
              <p className="mt-2 text-[11px] sm:text-xs font-medium leading-snug text-muted-foreground/88">
                Forged companions
              </p>
            </div>
            <div className="flex min-w-0 flex-col items-center">
              <div className="flex min-h-[2.75rem] sm:min-h-[3.25rem] w-full items-center justify-center">
                <Infinity
                  className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 text-electric-teal drop-shadow-[0_0_14px_hsl(170_100%_50%_/_0.35)]"
                  strokeWidth={2.35}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-[11px] sm:text-xs font-medium leading-snug text-muted-foreground/88">Scenarios</p>
            </div>
            <div className="flex min-w-0 flex-col items-center">
              <div className="flex min-h-[2.75rem] sm:min-h-[3.25rem] w-full items-center justify-center">
                <Lock
                  className="h-9 w-9 sm:h-11 sm:w-11 shrink-0 text-amber-400 drop-shadow-[0_0_12px_rgba(251,191,36,0.35)]"
                  strokeWidth={2.2}
                  aria-hidden
                />
              </div>
              <p className="mt-2 text-[11px] sm:text-xs font-medium leading-snug text-muted-foreground/88">
                Private &amp; safe
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 sm:mt-14 relative max-w-2xl mx-auto w-full px-1">
          <motion.button
            type="button"
            onClick={reshuffle}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 360, damping: 20 }}
            className="absolute top-1 sm:-top-4 -right-2 sm:-right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-primary/25 bg-black/35 backdrop-blur-md text-primary/90 hover:bg-primary/14 hover:border-primary/45 transition-colors touch-manipulation shadow-[0_0_14px_rgba(255,45,123,0.12)]"
            aria-label="Shuffle companions"
          >
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-primary/30"
              animate={{ opacity: isShuffling ? [0.2, 0.55, 0.2] : [0.15, 0.3, 0.15] }}
              transition={{ duration: isShuffling ? 0.55 : 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.span
              animate={{ rotate: isShuffling ? 360 : 0 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
              className="relative z-[1]"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </motion.span>
          </motion.button>

          <motion.div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-2"
            animate={isShuffling ? { opacity: [1, 0.82, 1] } : { opacity: 1 }}
            transition={{ duration: 0.32, ease: "easeInOut" }}
          >
            {shuffled.map((comp, index) => (
              <motion.div
                key={`${comp.id}-${shuffleTick}`}
                layout
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: index * 0.04,
                  type: "spring",
                  stiffness: 360,
                  damping: 24,
                  layout: { type: "spring", stiffness: 260, damping: 26 },
                }}
                whileHover={{ y: -4, scale: 1.02 }}
                className="h-full text-left rounded-2xl border border-transparent bg-card/60 backdrop-blur-sm overflow-visible group shadow-lg shadow-black/20 transition-colors p-1.5 max-md:p-1"
              >
                <Link
                  to={`/companions/${comp.id}`}
                  state={{ from: `${location.pathname}${location.search}` }}
                  className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 rounded-2xl overflow-visible"
                >
                  <TierHaloPortraitFrame
                    variant="card"
                    frameStyle="clean"
                    rarity={comp.rarity}
                    gradientFrom={comp.gradientFrom}
                    gradientTo={comp.gradientTo}
                    overlayUrl={comp.rarityBorderOverlayUrl}
                    rarityFrameBleed
                  >
                    <div
                      className="absolute inset-0 z-0"
                      style={{
                        background: comp.img ? undefined : `linear-gradient(160deg, ${comp.gradientFrom}, ${comp.gradientTo})`,
                      }}
                    />
                    {comp.img && !brokenPortraitIds.has(comp.id) ? (
                      <img
                        src={comp.img}
                        alt=""
                        className="absolute inset-0 z-[1] h-full w-full origin-center scale-[1.02] object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenPortraitIds((prev) => {
                            const next = new Set(prev);
                            next.add(comp.id);
                            return next;
                          })
                        }
                      />
                    ) : (
                      <div className="absolute inset-0 z-[1] flex items-center justify-center">
                        <span className="font-gothic text-3xl sm:text-4xl text-white/90">{comp.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-0 z-[1] bg-gradient-to-t from-black/90 via-black/10 to-transparent" />
                    <div className="absolute top-2 right-2 z-[3] max-w-[52%] truncate px-1.5 py-0.5 rounded-md bg-black/60 border border-white/10 text-[8px] font-bold uppercase tracking-wide text-white/90">
                      {comp.role}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 z-[3] p-2.5 sm:p-3 space-y-0.5">
                      <p className="text-xs sm:text-sm font-bold text-white truncate font-gothic leading-tight">{comp.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-white/70 line-clamp-2 leading-snug">{comp.subtitle}</p>
                    </div>
                    <div className="absolute inset-0 z-[3] opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
                  </TierHaloPortraitFrame>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
