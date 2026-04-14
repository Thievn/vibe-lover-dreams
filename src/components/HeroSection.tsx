import { motion } from "framer-motion";
import { Flame, RefreshCw } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { useCompanions } from "@/hooks/useCompanions";
import { companionImages } from "@/data/companionImages";

interface HeroSectionProps {
  onGetStarted: () => void;
}

type HeroCard = {
  id: string;
  name: string;
  subtitle: string;
  img: string | undefined;
};

function shufflePickSix(pool: HeroCard[]): HeroCard[] {
  if (pool.length === 0) return [];
  const copy = [...pool].sort(() => Math.random() - 0.5);
  return copy.slice(0, Math.min(6, copy.length));
}

function fallbackFromAssets(): HeroCard[] {
  return Object.entries(companionImages).map(([id, url]) => ({
    id,
    name: id
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" "),
    subtitle: "LustForge catalog",
    img: url,
  }));
}

export default function HeroSection({ onGetStarted }: HeroSectionProps) {
  const { data: dbList, isLoading } = useCompanions();
  const [shuffled, setShuffled] = useState<HeroCard[]>([]);

  const pool = useMemo((): HeroCard[] => {
    const rows = dbList || [];
    if (rows.length === 0) return fallbackFromAssets();
    return rows.map((db) => ({
      id: db.id,
      name: db.name,
      subtitle: db.tagline || "AI companion",
      img: db.image_url || companionImages[db.id],
    }));
  }, [dbList]);

  const totalCompanions = pool.length;

  const reshuffle = useCallback(() => {
    setShuffled(shufflePickSix(pool));
  }, [pool]);

  useEffect(() => {
    if (pool.length === 0) return;
    setShuffled(shufflePickSix(pool));
  }, [pool]);

  if (isLoading && (dbList === undefined || dbList.length === 0)) {
    return (
      <section className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-4 sm:px-6 overflow-x-hidden">
        <div className="text-center text-muted-foreground text-sm animate-pulse">Syncing forge catalog…</div>
      </section>
    );
  }

  if (totalCompanions === 0) {
    return (
      <section className="relative min-h-[70vh] flex items-center justify-center px-4">
        <p className="text-muted-foreground text-sm text-center">No companions in the forge yet. Check back soon.</p>
      </section>
    );
  }

  return (
    <section className="relative min-h-[70vh] sm:min-h-[80vh] flex items-center justify-center px-3 sm:px-6 overflow-x-hidden pb-8">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[min(100vw,600px)] h-[min(100vw,600px)] max-h-[70vh] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-3xl mx-auto w-full">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-3 sm:mb-4">
          <span className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] sm:text-xs font-medium">
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
          className="text-base sm:text-lg md:text-xl text-muted-foreground mb-2 italic px-2"
        >
          Forge Your Fantasies
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs sm:text-sm text-muted-foreground mb-6 sm:mb-8 max-w-xl mx-auto px-2 leading-relaxed"
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
            className="px-6 sm:px-8 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-base sm:text-lg glow-pink inline-flex items-center gap-2 touch-manipulation"
          >
            <Flame className="h-5 w-5 shrink-0" /> Join the Waitlist
          </button>
        </motion.div>

        <div className="mt-10 sm:mt-12 flex flex-wrap justify-center items-end gap-6 sm:gap-10 text-muted-foreground text-[11px] sm:text-xs px-2">
          <div className="text-center min-w-[5rem]">
            <motion.div
              key={totalCompanions}
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-2xl sm:text-3xl font-bold text-primary font-gothic tabular-nums"
            >
              {totalCompanions}
            </motion.div>
            <div className="mt-0.5">Companions live</div>
          </div>
          <div className="text-center min-w-[5rem]">
            <div className="text-2xl sm:text-3xl font-bold text-electric-teal font-gothic">∞</div>
            <div className="mt-0.5">Scenarios</div>
          </div>
          <div className="text-center min-w-[5rem]">
            <div className="text-2xl sm:text-3xl font-bold text-velvet-purple font-gothic">🔒</div>
            <div className="mt-0.5">Private &amp; safe</div>
          </div>
        </div>

        <div className="mt-10 sm:mt-14 relative max-w-2xl mx-auto w-full px-1">
          <motion.button
            type="button"
            onClick={reshuffle}
            whileTap={{ rotate: 180 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
            className="absolute -top-1 sm:-top-5 right-0 sm:right-1 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/25 bg-black/40 text-primary hover:bg-primary/15 hover:border-primary/50 transition-colors touch-manipulation"
            aria-label="Shuffle companions"
          >
            <RefreshCw className="h-4 w-4" />
          </motion.button>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 pt-2">
            {shuffled.map((comp, index) => (
              <motion.div
                key={`${comp.id}-${index}`}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, type: "spring", stiffness: 420, damping: 22 }}
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 500, damping: 12 } }}
                className="h-full"
              >
                <Link
                  to={`/companions/${comp.id}`}
                  className="block h-full rounded-2xl border border-border bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/50 transition-colors shadow-lg shadow-black/20 group touch-manipulation"
                >
                  <div
                    className="w-full aspect-[3/4] relative overflow-hidden"
                    style={{
                      background: comp.img ? undefined : "linear-gradient(135deg, #FF2D7B, #00b89a)",
                    }}
                  >
                    {comp.img ? (
                      <img
                        src={comp.img}
                        alt=""
                        className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500 ease-out"
                        loading="lazy"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-gothic text-3xl sm:text-4xl text-white/90">{comp.name.charAt(0)}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 sm:p-3">
                      <p className="text-xs sm:text-sm font-bold text-white truncate font-gothic">{comp.name}</p>
                      <p className="text-[10px] sm:text-[11px] text-white/75 line-clamp-2 leading-snug">{comp.subtitle}</p>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
