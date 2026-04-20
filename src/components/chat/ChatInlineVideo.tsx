import { useState } from "react";
import { Bookmark, Expand, Loader2 } from "lucide-react";
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

/**
 * 9:16 inline player — fills a tall frame with `object-cover` (no pillarboxing).
 * Optional fullscreen dialog for comfortable viewing.
 */
export function ChatInlineVideo({
  videoUrl,
  companionName,
  onSaveBackup,
  backupSaved,
  backupBusy,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(false);

  const inner = (
    <video
      src={videoUrl}
      controls
      playsInline
      className="absolute inset-0 h-full w-full object-cover"
      preload="metadata"
    />
  );

  return (
    <div className={cn("space-y-2", className)}>
      <div className="relative mx-auto w-full max-w-[min(92vw,280px)] aspect-[9/16] overflow-hidden rounded-xl bg-black">
        {inner}
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="absolute right-2 top-2 z-[2] inline-flex h-10 w-10 items-center justify-center rounded-xl bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 touch-manipulation"
          title="Expand"
          aria-label="Expand video"
        >
          <Expand className="h-5 w-5" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
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
          9:16 clip — tap expand for fullscreen
          {showGalleryHint ? (
            <>
              {" "}
              · auto-saved to {companionName}&apos;s gallery
            </>
          ) : null}
        </p>
      </div>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-lg border-0 bg-transparent p-0 shadow-none sm:max-w-md">
          <DialogTitle className="sr-only">Video clip</DialogTitle>
          <div className="overflow-hidden rounded-2xl bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              autoPlay
              className="max-h-[min(88vh,720px)] w-full object-contain"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
