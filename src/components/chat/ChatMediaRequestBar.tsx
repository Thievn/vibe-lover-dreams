import { Camera, Aperture, Sparkles, Video } from "lucide-react";
import { cn } from "@/lib/utils";

type Tier = "selfie_sfw" | "selfie_lewd" | "selfie_nude" | "nude_video";

type Props = {
  disabled?: boolean;
  videoDisabled?: boolean;
  videoCostLabel: string;
  imageCostLabel: string;
  onRequest: (tier: Tier) => void;
  className?: string;
};

export function ChatMediaRequestBar({
  disabled,
  videoDisabled,
  videoCostLabel,
  imageCostLabel,
  onRequest,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-2xl border border-white/[0.08] bg-black/35 px-3 py-2 backdrop-blur-md",
        className,
      )}
    >
      <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground w-full sm:w-auto">
        Media
      </span>
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
        onClick={() => onRequest("nude_video")}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#00ffd4]/35 bg-[#00ffd4]/10 px-2.5 py-1.5 text-[11px] font-semibold text-[#00ffd4] hover:bg-[#00ffd4]/16 disabled:opacity-40 touch-manipulation"
      >
        <Video className="h-3.5 w-3.5 shrink-0" />
        Nude video
        <span className="text-[9px] text-[#00ffd4]/80 font-normal">({videoCostLabel})</span>
      </button>
    </div>
  );
}
