import type { CSSProperties } from "react";
import { motion } from "framer-motion";
import type { DbCompanion } from "@/hooks/useCompanions";
import { NexusRealmBackdrop } from "@/components/nexus/NexusRealmBackdrop";
import { NexusBreedingDirtyChat } from "@/components/nexus/NexusBreedingDirtyChat";
import { cn } from "@/lib/utils";

const NEON = "#FF2D7B";

function NexusPortalSwirl({ mergeSubphase }: { mergeSubphase: "fusion" | "video" }) {
  const blurbs =
    mergeSubphase === "fusion"
      ? "Essence entwining — portrait ink follows desire."
      : "Motion binds to skin — your ascendant’s loop is forging.";

  return (
    <div className="relative flex flex-col items-center justify-center px-4">
      <div className="relative h-44 w-44 sm:h-52 sm:w-52 flex items-center justify-center">
        <motion.div
          className="absolute inset-[6%] rounded-full"
          style={{
            background: `conic-gradient(from 210deg, transparent 0%, ${NEON}22 35%, hsl(170 90% 42% / 0.14) 58%, transparent 78%)`,
          }}
          animate={{ rotate: 360 }}
          transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
        />
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-white/[0.14]"
            style={{
              inset: `${10 + i * 11}%`,
              borderTopColor: i === 0 ? `${NEON}99` : i === 1 ? "hsl(170 85% 48% / 0.55)" : "hsl(285 55% 52% / 0.45)",
              borderRightColor: "transparent",
              borderBottomColor: "transparent",
              borderLeftColor: "transparent",
            }}
            animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
            transition={{
              duration: 12 + i * 5,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
        <motion.div
          className="absolute inset-[26%] rounded-full bg-gradient-to-br from-black/80 via-[hsl(280_35%_14%/0.92)] to-black/90 border border-white/[0.12] shadow-[0_0_48px_rgba(255,45,123,0.22)]"
          animate={{
            boxShadow: [
              `0 0 38px ${NEON}33`,
              `0 0 58px hsl(170 100% 42% / 0.22)`,
              `0 0 38px ${NEON}33`,
            ],
          }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-[34%] rounded-full blur-xl opacity-70 pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${NEON}66 0%, transparent 65%)`,
          }}
          animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.75, 0.45] }}
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <OrbitGlyph className="relative z-[2] h-14 w-14 sm:h-16 sm:w-16 text-primary opacity-95" style={{ color: NEON }} />
      </div>
      <p className="mt-6 text-center text-[11px] sm:text-xs text-muted-foreground max-w-xs leading-relaxed tracking-wide">
        {blurbs}
      </p>
    </div>
  );
}

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

export function NexusMergeRitualOverlay({
  parentA,
  parentB,
  mergeSubphase,
}: {
  parentA: DbCompanion;
  parentB: DbCompanion;
  mergeSubphase: "fusion" | "video";
}) {
  const phaseTitle = mergeSubphase === "fusion" ? "Fusion pulse" : "Motion binding";
  const phaseSubtitle =
    mergeSubphase === "fusion"
      ? "The Nexus weaves both threads — nothing is revealed until the ritual completes."
      : "Your portrait exists — now the veil learns to move with them.";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[120] flex flex-col items-center justify-center p-4 sm:p-8"
      role="alertdialog"
      aria-live="polite"
      aria-busy="true"
      aria-label="Nexus merge in progress"
    >
      <div className="absolute inset-0 bg-black/88 backdrop-blur-[2px]" />
      <NexusRealmBackdrop className="absolute inset-0" />

      <div className="relative z-[2] w-full max-w-5xl grid lg:grid-cols-[minmax(0,1fr)_minmax(280px,340px)] gap-6 lg:gap-10 items-center">
        <div className="flex flex-col items-center text-center space-y-4 order-2 lg:order-1">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.45em] text-muted-foreground font-medium">
              The Nexus · breeding covenant
            </p>
            <h3 className="font-gothic text-2xl sm:text-3xl gradient-vice-text">{phaseTitle}</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{phaseSubtitle}</p>
          </div>
          <NexusPortalSwirl mergeSubphase={mergeSubphase} />
        </div>

        <div className="order-1 lg:order-2 w-full max-w-md mx-auto lg:max-w-none lg:w-full">
          <NexusBreedingDirtyChat parentA={parentA} parentB={parentB} active className="max-h-[min(52vh,380px)]" />
        </div>
      </div>

      <p
        className={cn(
          "relative z-[2] mt-8 text-[10px] uppercase tracking-[0.35em] text-muted-foreground/85 text-center max-w-lg px-4",
        )}
      >
        Please keep this tab open · closing may interrupt the forge
      </p>
    </motion.div>
  );
}
