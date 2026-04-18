import { cn } from "@/lib/utils";

type Props = {
  suggestions: string[];
  onPick: (text: string) => void;
  disabled?: boolean;
  loading?: boolean;
};

export function ChatSmartReplies({ suggestions, onPick, disabled, loading }: Props) {
  if (!suggestions.length) return null;
  return (
    <div className="flex flex-wrap gap-2 px-1 pb-2">
      {suggestions.map((s, i) => (
        <button
          key={`${i}-${s.slice(0, 12)}`}
          type="button"
          disabled={disabled || loading}
          onClick={() => onPick(s)}
          className={cn(
            "max-w-full rounded-full border border-white/[0.1] bg-white/[0.04] px-3 py-1.5 text-left text-xs text-foreground/90 backdrop-blur-sm transition-colors",
            "hover:border-primary/35 hover:bg-primary/10 disabled:opacity-40",
          )}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
