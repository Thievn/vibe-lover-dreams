import { cn } from "@/lib/utils";

type Props = {
  enabled: boolean;
  onChange: (next: boolean) => void;
  className?: string;
  /** `profile` adds a soft card — chat uses a minimal bar line. */
  variant?: "bar" | "profile";
};

/**
 * Per-companion preference (localStorage): spend forge credits on image gens without a confirmation step.
 */
export function ChatAutoSpendImagesToggle({ enabled, onChange, className, variant = "bar" }: Props) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-2.5 text-[12px] leading-snug text-muted-foreground select-none",
        variant === "profile" && "rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5",
        variant === "bar" && "px-1",
        className,
      )}
    >
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border border-white/20 bg-black/40 accent-primary"
      />
      <span>
        <span className="font-medium text-foreground/90">Auto-use credits for pictures</span>
        {" — "}
        skip the extra confirm when you ask for selfies or scenes (typed or live voice).
      </span>
    </label>
  );
}
