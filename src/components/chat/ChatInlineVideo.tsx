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
 * 2:3 card-style inline player; optional fullscreen dialog for comfortable viewing.
 * Clips loop and stay muted in-chat (no surprise audio).
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

  const inner = (
    <video
      src={videoUrl}
      controls
      playsInline
      loop
      muted
      defaultMuted
      className="absolute inset-0 h-full w-full object-cover bg-black"
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
          className="absolute right-2 top-2 z-[2] inline-flex h-8 w-8 items-center justify-center rounded-lg bg-black/55 text-white backdrop-blur-sm hover:bg-black/75 touch-manipulation"
          title="Larger view"
          aria-label="Larger view"
        >
          <Expand className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {onSaveBackup ? (
          <button
            type="button"
            onClick={() => onSaveBackup()}
            disabled={backupSaved || backupBusy}
            className="inline-flex h-9 min-w-[44px] items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.06] px-3 text-[11px] font-semibold text-foreground/95 hover:bg-white/[0.1] disabled:opacity-50 touch-manipulation"
          >
            {backupBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bookmark className="h-3.5 w-3.5 shrink-0 text-primary" />
            )}
            {backupSaved ? "Saved to your vault" : "Save clip"}
          </button>
        ) : null}
        <p className="text-[11px] text-foreground/55">
          Loops silently · expand for a larger view
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
                loop
                muted
                defaultMuted
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
