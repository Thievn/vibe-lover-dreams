import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { galleryStaticPortraitUrl } from "@/lib/companionMedia";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";

function OrbitGlyph({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.95" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" opacity="0.45" transform="rotate(-18 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4" stroke="currentColor" strokeWidth="1.2" opacity="0.35" transform="rotate(62 12 12)" />
      <circle cx="19" cy="9" r="1.5" fill="currentColor" opacity="0.65" />
      <circle cx="6" cy="16" r="1.2" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function MergeAnchor({ who, side }: { who: DbCompanion; side: "alpha" | "omega" }) {
  const url = galleryStaticPortraitUrl(who, who.id);
  const short = who.name.trim().split(/\s+/)[0] ?? who.name;
  const ring =
    side === "alpha"
      ? "ring-cyan-400/35 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
      : "ring-fuchsia-500/40 shadow-[0_0_22px_rgba(236,72,153,0.22)]";

  return (
    <motion.div
      className="flex w-[4.5rem] shrink-0 flex-col items-center gap-1.5 sm:w-[5.25rem]"
      animate={{ y: [0, -4, 0] }}
      transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut", delay: side === "omega" ? 0.9 : 0 }}
    >
      <div
        className={cn(
          "relative h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-offset-2 ring-offset-[#030208] sm:h-16 sm:w-16",
          ring,
        )}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover object-top" width={64} height={64} />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center font-gothic text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${who.gradient_from}, ${who.gradient_to})` }}
          >
            {who.name.charAt(0)}
          </div>
        )}
      </div>
      <span className="w-full truncate text-center text-[9px] font-semibold uppercase tracking-[0.18em] text-white/55 sm:text-[10px]">
        {short}
      </span>
      <span className="text-[8px] uppercase tracking-[0.28em] text-cyan-200/35">{side === "alpha" ? "α thread" : "ω thread"}</span>
    </motion.div>
  );
}

/**
 * Merge-only hero: **twin squared anchors** + **vertical convergence beam** + **hex gate** —
 * same palette family as the breeding covenant, different geometry (not orb + horizontal tendrils).
 */
export function NexusMergeWeaveHero({
  parentA,
  parentB,
  mergeSubphase,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  mergeSubphase: "fusion" | "video";
}) {
  const blurb =
    mergeSubphase === "fusion"
      ? "Two signatures collapse toward one — ink first, motion queued."
      : "Loop imprint phase — motion is being braided into the ascendant shell.";

  return (
    <div className="w-full max-w-xl px-1 sm:max-w-2xl sm:px-2">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <MergeAnchor who={parentA} side="alpha" />

        <div className="relative flex min-h-[200px] min-w-0 flex-1 flex-col items-center justify-center sm:min-h-[220px]">
          {/* Vertical convergence beam — merge-specific (not lateral tendrils) */}
          <motion.div
            className="pointer-events-none absolute inset-x-[40%] top-[8%] bottom-[20%] rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.22) 38%, rgba(236,72,153,0.32) 58%, transparent 100%)",
              filter: "blur(1px)",
            }}
            animate={{ opacity: [0.5, 0.88, 0.5], scaleX: [0.92, 1.05, 0.92] }}
            transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          />

          <svg
            className="pointer-events-none absolute inset-0 overflow-visible"
            viewBox="0 0 200 200"
            preserveAspectRatio="xMidYMid meet"
            aria-hidden
          >
            <defs>
              <filter id="merge-hex-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="1.2" result="b" />
                <feMerge>
                  <feMergeNode in="b" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            <motion.g
              style={{ transformOrigin: "100px 100px" }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 220, repeat: Infinity, ease: "linear" }}
            >
              <polygon
                points="100,34 152,58 152,118 100,142 48,118 48,58"
                fill="none"
                stroke="rgba(168,85,247,0.18)"
                strokeWidth="1"
                strokeDasharray="4 6"
                filter="url(#merge-hex-glow)"
              />
              <polygon
                points="100,48 138,66 138,110 100,128 62,110 62,66"
                fill="none"
                stroke="rgba(34,211,238,0.12)"
                strokeWidth="0.6"
                strokeDasharray="2 5"
              />
            </motion.g>
          </svg>

          <div className="relative z-[2] flex h-44 w-44 flex-col items-center justify-center sm:h-52 sm:w-52">
            <motion.div
              className="absolute inset-[6%] rounded-full"
              style={{
                background: `conic-gradient(from 140deg, transparent 0%, ${NEON}18 32%, hsl(190 90% 42% / 0.16) 55%, transparent 72%)`,
              }}
              animate={{ rotate: -360 }}
              transition={{ duration: 36, repeat: Infinity, ease: "linear" }}
            />
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute rounded-full border border-white/[0.1]"
                style={{
                  inset: `${10 + i * 11}%`,
                  borderTopColor: i === 0 ? "rgba(34,211,238,0.55)" : i === 1 ? `${NEON}88` : "hsl(285 55% 52% / 0.4)",
                  borderRightColor: "transparent",
                  borderBottomColor: "transparent",
                  borderLeftColor: "transparent",
                }}
                animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
                transition={{
                  duration: 14 + i * 4,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            ))}
            <motion.div
              className="absolute inset-[26%] rounded-full border border-white/[0.1] bg-gradient-to-b from-black/85 via-[hsl(265_32%_12%/0.95)] to-black/90"
              animate={{
                boxShadow: [
                  "0 0 36px rgba(34,211,238,0.18)",
                  `0 0 52px ${NEON}28`,
                  "0 0 36px rgba(34,211,238,0.18)",
                ],
              }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute inset-[30%] rounded-full blur-xl opacity-60"
              style={{
                background: `radial-gradient(circle, ${NEON}55 0%, transparent 62%)`,
              }}
              animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.65, 0.4] }}
              transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <OrbitGlyph className="relative z-[3] h-14 w-14 text-cyan-200 sm:h-16 sm:w-16" />
          </div>
        </div>

        <MergeAnchor who={parentB} side="omega" />
      </div>

      <p className="mx-auto mt-4 max-w-md px-2 text-center text-[11px] leading-relaxed tracking-wide text-muted-foreground/90 sm:text-xs">
        {blurb}
      </p>
    </div>
  );
}
