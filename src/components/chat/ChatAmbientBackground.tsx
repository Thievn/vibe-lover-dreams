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
      {/* Base wash */}
      <div
        className="absolute inset-0 opacity-[0.4]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(123, 45, 142, 0.18), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 80%, rgba(255, 45, 123, 0.08), transparent 50%)",
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
