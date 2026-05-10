import { motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { cn } from "@/lib/utils";

const MAGENTA = "rgba(236, 72, 153, 0.85)";
const PURPLE = "rgba(168, 85, 247, 0.75)";
const CYAN = "rgba(34, 211, 238, 0.65)";

function RitualPortrait({
  who,
  side,
}: {
  who: DbCompanion;
  side: "left" | "right";
}) {
  const url = galleryStaticPortraitUrl(who, who.id);
  const ring =
    side === "left"
      ? "ring-fuchsia-500/50 shadow-[0_0_32px_rgba(236,72,153,0.35)]"
      : "ring-cyan-400/40 shadow-[0_0_28px_rgba(34,211,238,0.28)]";

  return (
    <motion.div
      className="relative flex flex-col items-center gap-2"
      animate={{ y: [0, -6, 0] }}
      transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut", delay: side === "left" ? 0 : 0.6 }}
    >
      <motion.div
        className={cn(
          "pointer-events-none absolute -inset-3 rounded-full opacity-70 blur-xl",
          side === "left" ? "bg-fuchsia-600/35" : "bg-cyan-500/25",
        )}
        animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.92, 1.05, 0.92] }}
        transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden
      />
      <div
        className={cn(
          "relative h-[5.5rem] w-[5.5rem] shrink-0 overflow-hidden rounded-full ring-2 ring-offset-2 ring-offset-[#030208] sm:h-28 sm:w-28",
          ring,
        )}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover object-top" width={112} height={112} />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-gothic text-lg font-bold text-white"
            style={{
              background: `linear-gradient(135deg, ${who.gradient_from}, ${who.gradient_to})`,
            }}
          >
            {who.name.charAt(0)}
          </div>
        )}
      </div>
      <p className="max-w-[7rem] truncate text-center font-gothic text-xs font-semibold tracking-wide text-white/85 sm:text-sm">
        {who.name.split(/\s+/)[0]}
      </p>
    </motion.div>
  );
}

/**
 * Central orb, curved energy tendrils, slow rune ring — stays readable; motion is slow and smooth.
 */
export function BreedingRitualCovenantVisual({
  parentA,
  parentB,
  className,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  className?: string;
}) {
  return (
    <div className={cn("relative w-full select-none", className)}>
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 px-1 sm:gap-3 sm:px-2">
        <RitualPortrait who={parentA} side="left" />

        <div className="relative flex min-h-[200px] min-w-0 flex-1 items-center justify-center sm:min-h-[240px]">
          <svg
            className="absolute inset-0 h-full w-full overflow-visible"
            viewBox="0 0 320 200"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <filter id="breeding-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <linearGradient id="breed-tend-m" x1="0%" y1="50%" x2="100%" y2="50%">
                <stop offset="0%" stopColor={MAGENTA} stopOpacity="0.05" />
                <stop offset="45%" stopColor={MAGENTA} stopOpacity="0.95" />
                <stop offset="100%" stopColor={MAGENTA} stopOpacity="0.2" />
              </linearGradient>
              <linearGradient id="breed-tend-p" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor={PURPLE} stopOpacity="0.1" />
                <stop offset="50%" stopColor={PURPLE} stopOpacity="0.9" />
                <stop offset="100%" stopColor={PURPLE} stopOpacity="0.15" />
              </linearGradient>
              <linearGradient id="breed-tend-c" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={CYAN} stopOpacity="0.2" />
                <stop offset="55%" stopColor={CYAN} stopOpacity="0.85" />
                <stop offset="100%" stopColor={CYAN} stopOpacity="0.08" />
              </linearGradient>
            </defs>

            {/* Elegant curved tendrils — low frequency, not noisy */}
            <motion.path
              d="M 160 100 C 130 88, 95 82, 58 88 C 32 92, 14 98, 6 104"
              fill="none"
              stroke="url(#breed-tend-m)"
              strokeWidth="2.2"
              strokeLinecap="round"
              filter="url(#breeding-glow)"
              initial={{ pathLength: 0.92, opacity: 0.35 }}
              animate={{ pathLength: [0.88, 1, 0.88], opacity: [0.32, 0.58, 0.32] }}
              transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.path
              d="M 160 100 C 125 108, 88 112, 52 104 C 28 99, 12 96, 4 102"
              fill="none"
              stroke="url(#breed-tend-p)"
              strokeWidth="1.6"
              strokeLinecap="round"
              filter="url(#breeding-glow)"
              initial={{ pathLength: 0.9, opacity: 0.28 }}
              animate={{ pathLength: [0.86, 1, 0.86], opacity: [0.22, 0.48, 0.22] }}
              transition={{ duration: 9.2, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            />
            <motion.path
              d="M 160 100 C 190 92, 225 86, 262 92 C 288 96, 306 102, 314 108"
              fill="none"
              stroke="url(#breed-tend-m)"
              strokeWidth="2.2"
              strokeLinecap="round"
              filter="url(#breeding-glow)"
              initial={{ pathLength: 0.92, opacity: 0.32 }}
              animate={{ pathLength: [0.88, 1, 0.88], opacity: [0.28, 0.55, 0.28] }}
              transition={{ duration: 7.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
            />
            <motion.path
              d="M 160 100 C 198 110, 234 114, 268 106 C 292 101, 308 98, 316 104"
              fill="none"
              stroke="url(#breed-tend-c)"
              strokeWidth="1.5"
              strokeLinecap="round"
              filter="url(#breeding-glow)"
              initial={{ pathLength: 0.9, opacity: 0.22 }}
              animate={{ pathLength: [0.85, 1, 0.85], opacity: [0.18, 0.42, 0.18] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1.1 }}
            />

            {/* Slow rune ring under the orb */}
            <motion.g
              style={{ transformOrigin: "160px 118px" }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
            >
              <circle
                cx="160"
                cy="118"
                r="52"
                fill="none"
                stroke="rgba(168,85,247,0.12)"
                strokeWidth="1"
                strokeDasharray="3 7"
              />
              <circle
                cx="160"
                cy="118"
                r="58"
                fill="none"
                stroke="rgba(236,72,153,0.1)"
                strokeWidth="0.5"
                strokeDasharray="1 5"
              />
              {/* faint pseudo-runes as tick marks */}
              {Array.from({ length: 16 }).map((_, i) => {
                const a = (i / 16) * Math.PI * 2;
                const x1 = 160 + Math.cos(a) * 50;
                const y1 = 118 + Math.sin(a) * 50;
                const x2 = 160 + Math.cos(a) * 54;
                const y2 = 118 + Math.sin(a) * 54;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(34,211,238,0.15)"
                    strokeWidth="0.6"
                  />
                );
              })}
            </motion.g>
          </svg>

          {/* Core orb — layered glow, very slow pulse */}
          <div className="relative z-[1] flex items-center justify-center">
            <motion.div
              className="absolute h-28 w-28 rounded-full bg-fuchsia-600/25 blur-2xl sm:h-32 sm:w-32"
              animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.75, 0.5] }}
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute h-20 w-20 rounded-full bg-purple-500/30 blur-xl"
              animate={{ scale: [1.05, 0.95, 1.05], opacity: [0.4, 0.65, 0.4] }}
              transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            />
            <motion.div
              className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full sm:h-24 sm:w-24"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.14), transparent 42%), radial-gradient(circle at 50% 50%, hsl(300 45% 18%), hsl(270 50% 8%) 55%, #050308 100%)",
                boxShadow:
                  "inset 0 0 24px rgba(236,72,153,0.35), inset 0 -8px 20px rgba(0,0,0,0.65), 0 0 40px rgba(168,85,247,0.35)",
              }}
              animate={{ scale: [1, 1.04, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="pointer-events-none text-[10px] font-semibold uppercase tracking-[0.35em] text-fuchsia-100/50">
                ∅
              </span>
            </motion.div>
          </div>
        </div>

        <RitualPortrait who={parentB} side="right" />
      </div>
    </div>
  );
}
