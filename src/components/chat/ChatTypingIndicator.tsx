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
    <div className="flex justify-start gap-2.5 pl-0.5">
      <motion.div
        className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-primary/20 bg-black/50 shadow-[0_0_20px_rgba(255,45,123,0.12)]"
        animate={{ scale: [1, 1.04, 1] }}
        transition={{ duration: 2.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        aria-hidden
      >
        {companionImageUrl ? (
          <img src={companionImageUrl} alt="" className="h-full w-full object-cover object-top" />
        ) : (
          <span className="font-gothic text-xs font-bold text-primary/90">{companionName.charAt(0)}</span>
        )}
        <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-primary/15 to-transparent" />
      </motion.div>
      <div className="max-w-[min(90%,32rem)] rounded-2xl rounded-bl-md border border-primary/20 bg-gradient-to-br from-black/60 via-fuchsia-950/20 to-black/55 px-4 py-3 shadow-inner backdrop-blur-md">
        <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground/80">
          {companionName}
        </p>
        {isImageRequest ? (
          <p className="mt-0.5 text-sm italic text-primary/95">Composing a visual for you…</p>
        ) : (
          <p className="mt-0.5 text-sm text-foreground/85 line-clamp-2">{lines[idx]}</p>
        )}
        <div className="mt-2 flex h-2 items-end gap-1" aria-label={`${companionName} is typing`}>
          {[0, 1, 2].map((d) => (
            <motion.span
              key={`typing-dot-${d}`}
              className="inline-block h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(320_85%_55%_/_0.5)]"
              animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: t.minDuration * 1.2 + d * 0.08,
                delay: t.delay * d * 0.2,
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
