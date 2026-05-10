import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import {
  galleryStaticPortraitUrl,
  profileAnimatedPortraitUrl,
  isEligibleLoopPortraitVideoUrl,
  isVideoPortraitUrl,
} from "@/lib/companionMedia";
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

/** Looping profile video, animated still, or breathing still — always some motion in-frame. */
function MergeAnchorPortrait({ who }: { who: DbCompanion }) {
  const still = galleryStaticPortraitUrl(who, who.id);
  const anim = profileAnimatedPortraitUrl(who);
  const loopVideo = Boolean(anim && isEligibleLoopPortraitVideoUrl(anim, who.profile_loop_video_enabled));
  const animatedStill = Boolean(anim && !loopVideo && !isVideoPortraitUrl(anim));

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden rounded-2xl bg-black/40">
      {loopVideo && anim ? (
        <video
          key={anim}
          className="h-full w-full scale-[1.02] object-cover object-top"
          src={anim}
          poster={still}
          autoPlay
          muted
          playsInline
          loop
          preload="metadata"
        />
      ) : animatedStill ? (
        <motion.img
          src={anim}
          alt=""
          className="h-full w-full object-cover object-top"
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : still ? (
        <motion.img
          src={still}
          alt=""
          className="h-full w-full object-cover object-top"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <motion.div
          className="flex h-full w-full items-center justify-center font-gothic text-2xl font-bold text-white sm:text-3xl"
          style={{ background: `linear-gradient(135deg, ${who.gradient_from}, ${who.gradient_to})` }}
          animate={{ opacity: [0.88, 1, 0.88] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        >
          {who.name.charAt(0)}
        </motion.div>
      )}
    </div>
  );
}

function MergeAnchor({ who, side }: { who: DbCompanion; side: "alpha" | "omega" }) {
  const short = who.name.trim().split(/\s+/)[0] ?? who.name;
  const ring =
    side === "alpha"
      ? "ring-cyan-400/40 shadow-[0_0_32px_rgba(34,211,238,0.28)]"
      : "ring-fuchsia-500/45 shadow-[0_0_34px_rgba(236,72,153,0.3)]";
  const veinLabel = side === "alpha" ? "First hunger" : "Answering hunger";

  return (
    <motion.div
      className="flex w-[min(42vw,11.5rem)] max-w-[13rem] shrink-0 flex-col items-center gap-2 sm:w-40 md:w-48"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut", delay: side === "omega" ? 0.85 : 0 }}
    >
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-2xl ring-2 ring-offset-[3px] ring-offset-[#030208] sm:rounded-3xl sm:ring-[3px] sm:ring-offset-4",
          ring,
        )}
      >
        <MergeAnchorPortrait who={who} />
      </div>
      <span className="w-full truncate text-center font-gothic text-sm font-semibold tracking-wide text-white/90 sm:text-base">
        {short}
      </span>
      <span className="text-center text-[8px] font-medium uppercase leading-tight tracking-[0.22em] text-fuchsia-200/45 sm:text-[9px]">
        {veinLabel}
      </span>
    </motion.div>
  );
}

/**
 * Merge-only hero: **tall twin portraits** (loop / breathe) + **vertical convergence** + **hex gate** —
 * same palette family as the breeding covenant; distinct layout from the covenant orb.
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
      ? "Two hungers lean into the same dark — ink and ache braid until only one silhouette remains."
      : "The still shivers awake — motion crawls the sigil until her pulse matches yours on the glass.";

  return (
    <div className="w-full max-w-3xl px-1 sm:max-w-4xl sm:px-2 md:max-w-5xl">
      <div className="flex min-w-0 flex-col items-center justify-center gap-8 md:flex-row md:items-center md:justify-between md:gap-6 lg:gap-10">
        <MergeAnchor who={parentA} side="alpha" />

        <div className="relative flex min-h-[200px] w-full min-w-0 max-w-[min(100%,15rem)] flex-1 flex-col items-center justify-center sm:min-h-[220px] sm:max-w-[17rem] md:max-w-[19rem]">
          {/* Vertical convergence beam */}
          <motion.div
            className="pointer-events-none absolute inset-x-[38%] top-[6%] bottom-[18%] rounded-full opacity-80"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, rgba(34,211,238,0.24) 38%, rgba(236,72,153,0.34) 58%, transparent 100%)",
              filter: "blur(1px)",
            }}
            animate={{ opacity: [0.5, 0.9, 0.5], scaleX: [0.9, 1.08, 0.9] }}
            transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
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
                stroke="rgba(168,85,247,0.2)"
                strokeWidth="1"
                strokeDasharray="4 6"
                filter="url(#merge-hex-glow)"
              />
              <polygon
                points="100,48 138,66 138,110 100,128 62,110 62,66"
                fill="none"
                stroke="rgba(34,211,238,0.14)"
                strokeWidth="0.6"
                strokeDasharray="2 5"
              />
            </motion.g>
          </svg>

          <div className="relative z-[2] flex h-40 w-40 flex-col items-center justify-center sm:h-44 sm:w-44 md:h-48 md:w-48">
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
                  "0 0 36px rgba(34,211,238,0.2)",
                  `0 0 52px ${NEON}28`,
                  "0 0 36px rgba(34,211,238,0.2)",
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
            <OrbitGlyph className="relative z-[3] h-12 w-12 text-cyan-200 sm:h-14 sm:w-14 md:h-16 md:w-16" />
          </div>
        </div>

        <MergeAnchor who={parentB} side="omega" />
      </div>

      <p className="mx-auto mt-5 max-w-lg px-2 text-center text-[11px] leading-relaxed tracking-wide text-muted-foreground/90 sm:mt-6 sm:max-w-xl sm:text-xs">
        {blurb}
      </p>
    </div>
  );
}
