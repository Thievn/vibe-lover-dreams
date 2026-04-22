import { Camera, Aperture, Sparkles, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "selfie_sfw" | "selfie_lewd" | "selfie_nude" | "lewd_video";

type Props = {
  disabled?: boolean;
  videoDisabled?: boolean;
  videoCostLabel: string;
  imageCostLabel: string;
  onRequest: (tier: Tier) => void;
  className?: string;
  /** Inline “auto-spend forge credits on pics” toggle (per-companion, caller persists). */
  autoSpendEnabled?: boolean;
  onAutoSpendChange?: (enabled: boolean) => void;
};

export function ChatMediaRequestBar({
  disabled,
  videoDisabled,
  videoCostLabel,
  imageCostLabel,
  onRequest,
  className,
  autoSpendEnabled,
  onAutoSpendChange,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2.5 backdrop-blur-md",
        className,
      )}
    >
      <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">
            Photos & clips
          </div>
          <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground/90">
            Presets or type in chat — images use Tensor with your wording.
          </p>
        </div>
        {typeof autoSpendEnabled === "boolean" && onAutoSpendChange ? (
          <label className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border border-white/[0.08] bg-black/30 px-2 py-1 text-[10px] text-foreground/90 select-none">
            <input
              type="checkbox"
              checked={autoSpendEnabled}
              onChange={(e) => onAutoSpendChange(e.target.checked)}
              className="h-3.5 w-3.5 shrink-0 rounded border border-white/20 bg-black/40 accent-primary"
            />
            <span className="font-medium">Auto-spend</span>
            <span className="hidden text-muted-foreground sm:inline" title="Skip the extra confirm when a message triggers a picture.">
              pics
            </span>
          </label>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest("selfie_sfw")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-foreground/95 hover:bg-white/[0.08] disabled:opacity-40 touch-manipulation"
      >
        <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
        Selfie
        <span className="text-[9px] text-muted-foreground font-normal">({imageCostLabel})</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest("selfie_lewd")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-primary/95 hover:bg-primary/[0.12] disabled:opacity-40 touch-manipulation"
      >
        <Aperture className="h-3.5 w-3.5 shrink-0" />
        Lewd selfie
        <span className="text-[9px] text-muted-foreground font-normal">({imageCostLabel})</span>
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onRequest("selfie_nude")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-fuchsia-500/30 bg-fuchsia-950/25 px-2.5 py-1.5 text-[11px] font-semibold text-fuchsia-100 hover:bg-fuchsia-950/40 disabled:opacity-40 touch-manipulation"
      >
        <Sparkles className="h-3.5 w-3.5 shrink-0" />
        Nude selfie
        <span className="text-[9px] text-muted-foreground font-normal">({imageCostLabel})</span>
      </button>
      <button
        type="button"
        disabled={disabled || videoDisabled}
        onClick={() => onRequest("lewd_video")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffd4]/35 bg-[#00ffd4]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#00ffd4] hover:bg-[#00ffd4]/16 disabled:opacity-40 touch-manipulation"
      >
        <Video className="h-3.5 w-3.5 shrink-0" />
        Lewd video
        <span className="text-[9px] text-[#00ffd4]/80 font-normal">({videoCostLabel})</span>
      </button>
      </div>
    </div>
  );
}
