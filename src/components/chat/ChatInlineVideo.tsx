import { useState } from "react";
import { Bookmark, Expand, Loader2, Repeat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  videoUrl: string;
  companionName: string;
  /** When true, show copy that the clip is in the companion gallery. */
  showGalleryHint?: boolean;
  onSaveBackup?: () => void;
  backupSaved?: boolean;
  backupBusy?: boolean;
  className?: string;
};

const LOOP_PREF_KEY = "lustforge-chat-video-loop";

function readLoopDefault(): boolean {
  try {
    const v = localStorage.getItem(LOOP_PREF_KEY);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    /* ignore */
  }
  return true;
}

/**
 * 2:3 card-style inline player; optional fullscreen dialog for comfortable viewing.
 * Loop defaults on; user can disable per session (persisted).
 */
export function ChatInlineVideo({
  videoUrl,
  companionName,
  showGalleryHint,
  onSaveBackup,
  backupSaved,
  backupBusy,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [loopOn, setLoopOn] = useState(readLoopDefault);

  const persistLoop = (next: boolean) => {
    setLoopOn(next);
    try {
      localStorage.setItem(LOOP_PREF_KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  };

  const inner = (
    <video
      src={videoUrl}
      controls
      playsInline
      loop={loopOn}
      className="absolute inset-0 h-full w-full object-contain bg-black"
      preload="metadata"
    />
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative mx-auto w-full max-w-[min(92vw,280px)] aspect-[2/3] overflow-hidden rounded-xl bg-black">
        {inner}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-[2] inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 touch-manipulation"
          title="Larger view"
          aria-label="Larger view"
        >
          <Expand className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => persistLoop(!loopOn)}
          className={cn(
            "inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-xs font-semibold touch-manipulation transition-colors",
            loopOn
              ? "border-primary/40 bg-primary/15 text-primary"
              : "border-white/15 bg-white/[0.06] text-foreground/85 hover:bg-white/[0.1]",
          )}
          title={loopOn ? "Loop on" : "Loop off"}
          aria-pressed={loopOn}
        >
          <Repeat className={cn("h-4 w-4 shrink-0", loopOn && "text-primary")} />
          {loopOn ? "Loop on" : "Loop off"}
        </button>
        {onSaveBackup ? (
          <button
            type="button"
            onClick={() => onSaveBackup()}
            disabled={backupSaved || backupBusy}
            className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-foreground/95 hover:bg-white/[0.1] disabled:opacity-50 touch-manipulation"
          >
            {backupBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark className="h-4 w-4 shrink-0 text-primary" />
            )}
            {backupSaved ? "Saved to your vault" : "Save clip"}
          </button>
        ) : null}
        <p className="text-xs text-foreground/55">
          clip — expand for a centered picture-in-picture view
          {showGalleryHint ? (
            <>
              {" "}
              · auto-saved to {companionName}&apos;s gallery
            </>
          ) : null}
        </p>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[min(96vw,560px)] border-0 bg-transparent p-4 shadow-none sm:max-w-[min(96vw,560px)] sm:p-6">
          <DialogTitle className="sr-only">Video clip</DialogTitle>
          <div className="flex max-h-[min(88vh,820px)] w-full items-center justify-center">
            <div className="relative w-full max-h-[min(88vh,820px)] overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
              <video
                src={videoUrl}
                controls
                playsInline
                loop={loopOn}
                autoPlay
                className="mx-auto block max-h-[min(88vh,820px)] w-full object-contain"
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
