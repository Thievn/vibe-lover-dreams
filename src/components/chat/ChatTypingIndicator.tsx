import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { ChatTypingVariant } from "@/lib/chatTypingPersonality";

const CAPTIONS = (name: string) => [
  `${name} is close…`,
  `${name} is writing…`,
  `${name} is choosing her words…`,
  `${name} is leaning in…`,
];

const variantTiming: Record<ChatTypingVariant, { delay: number; minDuration: number }> = {
  /** Slow, heavy stagger — “dommy” */
  dominant: { delay: 0.5, minDuration: 0.6 },
  /** Bouncy, faster */
  playful: { delay: 0.2, minDuration: 0.3 },
  default: { delay: 0.35, minDuration: 0.45 },
};

export function ChatTypingIndicator({
  companionName,
  isImageRequest,
  variant = "default",
  companionImageUrl,
}: {
  companionName: string;
  isImageRequest: boolean;
  variant?: ChatTypingVariant;
  /** Small bubble avatar — optional, matches thread. */
  companionImageUrl?: string | null;
}) {
  const [idx, setIdx] = useState(0);
  const lines = CAPTIONS(companionName);
  const t = variantTiming[variant] ?? variantTiming.default;

  useEffect(() => {
    if (isImageRequest) return;
    const interval = 2400;
    const timer = setInterval(() => setIdx((i) => (i + 1) % lines.length), interval);
    return () => clearInterval(timer);
  }, [isImageRequest, lines.length]);

  return (
    <div className="flex min-w-0 justify-start gap-3 pl-0.5">
      <motion.div
        className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-primary/30 bg-zinc-900 shadow-[0_0_20px_rgba(168,85,247,0.2)] ring-2 ring-primary/10 sm:h-11 sm:w-11"
        aria-hidden
        animate={{ boxShadow: ["0 0 20px rgba(168,85,247,0.15)", "0 0 28px rgba(255,45,123,0.2)", "0 0 20px rgba(168,85,247,0.15)"] }}
        transition={{ duration: 2.2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        {companionImageUrl ? (
          <img src={companionImageUrl} alt="" width={44} height={44} className="h-full w-full object-cover object-top" />
        ) : (
          <span className="flex h-full w-full items-center justify-center font-gothic text-sm font-bold text-primary/90">
            {companionName.charAt(0)}
          </span>
        )}
      </motion.div>
      <div className="min-w-0 max-w-[min(100%,32rem)] rounded-[1.15rem] rounded-bl-md border border-primary/25 bg-gradient-to-br from-black/70 via-fuchsia-950/[0.18] to-black/60 px-4 py-3.5 shadow-[0_0_40px_-8px_rgba(168,85,247,0.18),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md sm:px-5 sm:py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">{companionName}</p>
        {isImageRequest ? (
          <p className="mt-1 text-sm font-medium italic text-primary">Crafting a visual for you…</p>
        ) : (
          <p className="mt-1 text-sm leading-snug text-foreground/90 line-clamp-2">{lines[idx]}</p>
        )}
        <div className="mt-2.5 flex h-2.5 items-end gap-1.5" aria-label={`${companionName} is typing`}>
          {[0, 1, 2, 3].map((d) => (
            <motion.span
              key={`typing-dot-${d}`}
              className="inline-block h-2 w-2 rounded-full bg-gradient-to-t from-primary to-fuchsia-400 shadow-[0_0_8px_rgba(255,45,123,0.5)]"
              animate={{ y: [0, -6, 0], scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: t.minDuration * 1.1 + d * 0.06,
                delay: t.delay * d * 0.15 + d * 0.1,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
