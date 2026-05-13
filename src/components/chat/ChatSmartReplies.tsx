import { cn } from "@/lib/utils";
import type { ChatVisualVariant } from "@/components/chat/chatVisualVariant";

type Props = {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Live Voice: tighter pills so the thread keeps more vertical space. */
  compact?: boolean;
  visualVariant?: ChatVisualVariant;
};

export function ChatSmartReplies({ suggestions, onPick, disabled, loading, compact, visualVariant = "default" }: Props) {
  if (!suggestions.length) return null;
  const luxury = visualVariant === "luxury";
  return (
    <div className={cn("flex min-w-0 flex-wrap px-1", compact ? "gap-1 pb-0.5" : luxury ? "gap-1 pb-0.5" : "gap-2 pb-2")}>
      {suggestions.map((s, i) => (
        <button
          key={`${i}-${s.slice(0, 12)}`}
          type="button"
          disabled={disabled || loading}
          onClick={() => onPick(s)}
          className={cn(
            "max-w-full break-words text-left leading-snug backdrop-blur-sm transition-colors touch-manipulation",
            luxury
              ? "rounded-full border border-fuchsia-500/15 bg-black/40 px-3 py-1.5 text-[10px] text-white/85 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:border-fuchsia-400/35 hover:bg-fuchsia-950/30"
              : "rounded-xl border border-white/[0.1] bg-white/[0.04] text-foreground/90 hover:border-primary/35 hover:bg-primary/10",
            "disabled:opacity-40 active:scale-[0.98]",
            !luxury &&
              (compact
                ? "min-h-8 px-2 py-1 text-[10px] sm:rounded-full sm:px-2.5"
                : "min-h-12 px-3 py-2 text-xs sm:rounded-full sm:px-4"),
            luxury && !compact && "min-h-8 px-3 py-1.5 text-[10px] sm:text-[11px]",
            luxury && compact && "min-h-8 px-2.5 py-1 text-[10px]",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
