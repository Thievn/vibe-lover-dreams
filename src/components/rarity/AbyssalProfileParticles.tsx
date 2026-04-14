import { useMemo } from "react";
import { motion } from "framer-motion";

const COUNT = 42;

export function AbyssalProfileParticles() {
  const specs = useMemo(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        id: i,
        left: `${(Math.sin(i * 1.7) * 0.5 + 0.5) * 92 + 4}%`,
        top: `${(Math.cos(i * 2.1) * 0.5 + 0.5) * 88 + 6}%`,
        delay: (i % 12) * 0.12,
        duration: 4 + (i % 5) * 0.9,
        size: 1 + (i % 3),
        hue: i % 2 === 0 ? "rgba(255,45,123," : "rgba(0,255,212,",
      })),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit]" aria-hidden>
      {specs.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            background: `${p.hue}0.35)`,
            boxShadow: `0 0 ${6 + p.size * 2}px ${p.hue}0.25)`,
          }}
          initial={{ opacity: 0.15, y: 0 }}
          animate={{
            opacity: [0.12, 0.55, 0.15],
            y: [0, -14, 0],
            x: [0, (p.id % 3) - 1, 0],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: p.delay,
          }}
        />
      ))}
    </div>
  );
}
