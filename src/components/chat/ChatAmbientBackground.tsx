import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  /** Bumps a subtle “pulse” (grid / glow) when the thread changes — e.g. new messages. */
  activityKey: number;
  className?: string;
};

/**
 * Faint cyber-goth atmosphere: moving gradient orbs, soft grid, occasional lightning.
 * Stays at very low contrast so it never competes with message text.
 */
export function ChatAmbientBackground({ activityKey, className }: Props) {
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (activityKey <= 0) return;
    setFlash((f) => f + 1);
  }, [activityKey]);

  return (
    <div
      className={cn("pointer-events-none absolute inset-0 z-0 select-none overflow-hidden", className)}
      aria-hidden
    >
      {/* Film grain / texture — ultra subtle */}
      <div
        className="absolute inset-0 opacity-[0.035] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* Base wash */}
      <div
        className="absolute inset-0 opacity-[0.42]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(123, 45, 142, 0.2), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(255, 45, 123, 0.1), transparent 50%)",
        }}
      />

      {/* Drifting glow orbs (AI-ish idle motion) */}
      <motion.div
        className="absolute -left-1/4 top-1/4 h-[40vmin] w-[40vmin] rounded-full blur-3xl"
        style={{ background: "hsla(300, 70%, 30%, 0.12)" }}
        animate={{ x: [0, 24, 0], y: [0, -12, 0] }}
        transition={{ duration: 18, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 bottom-0 h-[35vmin] w-[45vmin] rounded-full blur-3xl"
        style={{ background: "hsla(190, 100%, 45%, 0.08)" }}
        animate={{ x: [0, -30, 0], y: [0, 16, 0] }}
        transition={{ duration: 22, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />

      {/* Soft floating motes (very low opacity) */}
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-fuchsia-400/20 blur-[1px]"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${12 + i * 19}%`,
            top: `${18 + (i * 13) % 40}%`,
          }}
          animate={{
            y: [0, -40, 0],
            x: [0, i % 2 === 0 ? 20 : -15, 0],
            opacity: [0.15, 0.4, 0.15],
          }}
          transition={{
            duration: 8 + i * 1.2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
            delay: i * 0.7,
          }}
        />
      ))}

      {/* Neon grid */}
      <div
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: `linear-gradient(rgba(0, 255, 212, 0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 45, 123, 0.2) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `linear-gradient(rgba(168, 85, 247, 0.3) 1px, transparent 1px)`,
          backgroundSize: "48px 48px",
        }}
        animate={{ y: [0, 48] }}
        transition={{ duration: 12, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
      />

      {/* One subtle lightning tick on activity */}
      <AnimatePresence>
        {flash > 0 ? (
          <motion.svg
            key={flash}
            className="absolute right-[8%] top-[12%] h-24 w-10 text-cyan-400/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.5, 0.15, 0] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            viewBox="0 0 32 64"
            fill="none"
          >
            <path
              d="M18 2 L8 30 L20 32 L4 64 L16 22 L4 20 Z"
              fill="currentColor"
            />
          </motion.svg>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
