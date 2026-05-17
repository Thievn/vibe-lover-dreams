import { Aperture, Camera, ChevronDown, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOMENTS_GALLERY_SUBTITLE } from "@/lib/chatMomentsBrand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Phase 1 — Media bar: three mood buckets, each with Picture / Video.
 * Wire `onRequest` to image + clip generation (Grok Imagine for stills; clip path in `generate-chat-companion-video`).
 */
export type ChatMediaBarAction =
  | "selfie_picture"
  | "selfie_video"
  | "lewd_picture"
  | "lewd_video";

type Props = {
  disabled?: boolean;
  videoDisabled?: boolean;
  videoCostLabel: string;
  imageCostLabel: string;
  onRequest: (action: ChatMediaBarAction) => void;
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
            Stills = Grok Imagine ({MOMENTS_GALLERY_SUBTITLE.toLowerCase()}). {CHAT_VIDEO_TIMING_USER_NOTE} Type in chat is detected automatically — no
            &quot;generating…&quot; spam.
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[11px] font-semibold text-foreground/95 hover:bg-white/[0.08] disabled:opacity-40 touch-manipulation"
            >
              <Camera className="h-3.5 w-3.5 text-primary shrink-0" />
              Selfie
              <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[12rem] border border-white/10 bg-[hsl(280_25%_10%)]/98 text-foreground"
          >
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm"
              disabled={disabled}
              onSelect={(e) => e.preventDefault()}
              onClick={() => onRequest("selfie_picture")}
            >
              <Camera className="h-3.5 w-3.5" />
              Selfie picture
              <span className="ml-auto text-[10px] text-muted-foreground">{imageCostLabel}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm"
              disabled={disabled || videoDisabled}
              onSelect={(e) => e.preventDefault()}
              onClick={() => onRequest("selfie_video")}
            >
              <Video className="h-3.5 w-3.5 text-[#00ffd4]" />
              Selfie video
              <span className="ml-auto text-[10px] text-[#00ffd4]/80">{videoCostLabel}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className="inline-flex items-center gap-1.5 rounded-xl border border-primary/25 bg-primary/[0.08] px-2.5 py-1.5 text-[11px] font-semibold text-primary/95 hover:bg-primary/[0.12] disabled:opacity-40 touch-manipulation"
            >
              <Aperture className="h-3.5 w-3.5 shrink-0" />
              Lewd
              <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[12rem] border border-white/10 bg-[hsl(280_25%_10%)]/98 text-foreground"
          >
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm"
              disabled={disabled}
              onSelect={(e) => e.preventDefault()}
              onClick={() => onRequest("lewd_picture")}
            >
              <Aperture className="h-3.5 w-3.5" />
              Lewd picture
              <span className="ml-auto text-[10px] text-muted-foreground">{imageCostLabel}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer gap-2 text-sm"
              disabled={disabled || videoDisabled}
              onSelect={(e) => e.preventDefault()}
              onClick={() => onRequest("lewd_video")}
            >
              <Video className="h-3.5 w-3.5 text-[#00ffd4]" />
              Lewd video
              <span className="ml-auto text-[10px] text-[#00ffd4]/80">{videoCostLabel}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

      </div>
    </div>
  );
}
