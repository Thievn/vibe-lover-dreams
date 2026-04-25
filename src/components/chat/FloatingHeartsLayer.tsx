import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";

type Burst = { id: number; x: string };

export function FloatingHeartsLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] h-[50vh] overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.span
            key={b.id}
            initial={{ opacity: 0.9, y: 8, x: 0, scale: 0.45, rotate: -12, filter: "blur(0px)" }}
            animate={{
              opacity: 0,
              y: -280,
              x: [0, 14, -10, 6, 0],
              scale: [0.5, 1.45, 1.6, 1.35, 1.2],
              rotate: [0, 8, -4, 0],
              filter: ["blur(0px)", "blur(0.5px)", "blur(0px)"],
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.8, ease: [0.22, 0.9, 0.36, 1] }}
            className="absolute bottom-8 flex select-none drop-shadow-[0_0_24px_rgba(255,45,123,0.5)]"
            style={{ left: b.x }}
          >
            <Heart
              className="h-14 w-14 text-primary sm:h-16 sm:w-16"
              fill="currentColor"
              strokeWidth={0.5}
              stroke="hsl(320 90% 70% / 0.4)"
            />
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
