import { motion } from "framer-motion";

const NEON = "#FF2D7B";
const TEAL = "hsl(170 100% 42%)";

/**
 * Reusable dark sensual Nexus atmosphere: soft orbs, drifting embers, slow color breathing.
 * No video assets — pure CSS/SVG so it ships light and loops forever.
 */
export function NexusRealmBackdrop({ className }: { className?: string }) {
  return (
    <div className={className ?? "absolute inset-0 overflow-hidden pointer-events-none"} aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse 85% 55% at 50% -15%, ${NEON}2e, transparent 52%),
            radial-gradient(ellipse 70% 45% at 100% 80%, ${TEAL}14, transparent 50%),
            radial-gradient(ellipse 55% 40% at 0% 60%, hsl(290 45% 28% / 0.22), transparent 48%),
            #030206`,
        }}
      />

      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full blur-[72px] opacity-[0.35]"
          style={{
            width: `${38 + i * 14}%`,
            height: `${28 + i * 8}%`,
            left: `${i * 22}%`,
            top: `${12 + i * 18}%`,
            background:
              i === 0
                ? `radial-gradient(circle, ${NEON}55 0%, transparent 68%)`
                : i === 1
                  ? `radial-gradient(circle, ${TEAL}40 0%, transparent 65%)`
                  : `radial-gradient(circle, hsl(300 60% 42% / 0.4) 0%, transparent 62%)`,
          }}
          animate={{
            x: [0, i % 2 === 0 ? 28 : -22, 0],
            y: [0, i % 2 === 0 ? -18 : 24, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{
            duration: 18 + i * 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <svg className="absolute inset-0 w-full h-full opacity-[0.2]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="nexus-ember" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={NEON} stopOpacity="0.55" />
            <stop offset="100%" stopColor={NEON} stopOpacity="0" />
          </radialGradient>
        </defs>
        {Array.from({ length: 48 }).map((_, i) => {
          const x = ((i * 79) % 100) + (i % 7) * 0.4;
          const y = ((i * 53) % 100) + ((i * 11) % 17);
          const r = 0.35 + (i % 5) * 0.2;
          return (
            <motion.circle
              key={i}
              cx={`${x}%`}
              cy={`${y}%`}
              r={r}
              fill="url(#nexus-ember)"
              animate={{ opacity: [0.08, 0.45, 0.1] }}
              transition={{
                duration: 8 + (i % 11),
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.15,
              }}
            />
          );
        })}
      </svg>

      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
