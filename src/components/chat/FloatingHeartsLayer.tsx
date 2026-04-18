import { AnimatePresence, motion } from "framer-motion";

type Burst = { id: number; x: string };

export function FloatingHeartsLayer({ bursts }: { bursts: Burst[] }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] h-[45vh] overflow-hidden motion-reduce:hidden"
      aria-hidden
    >
      <AnimatePresence>
        {bursts.map((b) => (
          <motion.span
            key={b.id}
            initial={{ opacity: 0.85, y: 0, x: 0, scale: 0.7 }}
            animate={{ opacity: 0, y: -220, x: [0, 8, -6, 0], scale: [0.8, 1.1, 1] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2.4, ease: "easeOut" }}
            className="absolute bottom-6 text-2xl select-none"
            style={{ left: b.x }}
          >
            💗
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
