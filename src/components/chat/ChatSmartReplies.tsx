import { cn } from "@/lib/utils";

type Props = {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
  /** Live Voice: tighter pills so the thread keeps more vertical space. */
  compact?: boolean;
};

export function ChatSmartReplies({ suggestions, onPick, disabled, loading, compact }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className={cn("flex min-w-0 flex-wrap px-1", compact ? "gap-1 pb-0.5" : "gap-2 pb-2")}>
      {suggestions.map((s, i) => (
        <button
          key={`${i}-${s.slice(0, 12)}`}
          type="button"
          disabled={disabled || loading}
          onClick={() => onPick(s)}
          className={cn(
            "max-w-full break-words rounded-xl border border-white/[0.1] bg-white/[0.04] text-left leading-snug text-foreground/90 backdrop-blur-sm transition-colors touch-manipulation",
            "hover:border-primary/35 hover:bg-primary/10 disabled:opacity-40 active:scale-[0.98]",
            compact
              ? "min-h-8 px-2 py-1 text-[10px] sm:rounded-full sm:px-2.5"
              : "min-h-12 px-3 py-2 text-xs sm:rounded-full sm:px-4",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
