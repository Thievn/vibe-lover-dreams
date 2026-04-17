import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { isVideoPortraitUrl } from "@/lib/companionMedia";

type Props = {
  alt: string;
  stillSrc: string | null | undefined;
  animatedSrc?: string | null | undefined;
  children: React.ReactNode;
  /** Extra classes on the clickable trigger wrapper */
  triggerClassName?: string;
};

/**
 * Wraps a portrait preview; clicking opens a large dialog (still image preferred, else non-video animated, else video).
 */
export function PortraitViewLightbox({ alt, stillSrc, animatedSrc, children, triggerClassName }: Props) {
  const [open, setOpen] = useState(false);

  const videoCandidate = animatedSrc && isVideoPortraitUrl(animatedSrc) ? animatedSrc : null;
  const still = (stillSrc && String(stillSrc).trim()) || null;
  const staticAnimated =
    animatedSrc && !isVideoPortraitUrl(animatedSrc) ? String(animatedSrc).trim() || null : null;
  const imgSrc = still || staticAnimated;
  const videoSrc = imgSrc ? null : videoCandidate;

  const enlargeable = Boolean(imgSrc || videoSrc);
  if (!enlargeable) {
    return <div className={triggerClassName}>{children}</div>;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button
        type="button"
        className={cn(
          "group relative block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left outline-none",
          "rounded-[inherit] focus-visible:ring-2 focus-visible:ring-primary/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          triggerClassName,
        )}
        aria-label={`Enlarge portrait: ${alt}`}
        onClick={() => setOpen(true)}
      >
        {children}
        <span className="pointer-events-none absolute bottom-2 right-2 z-[6] rounded-md bg-black/65 px-2 py-0.5 text-[10px] font-medium text-white/95 opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          View larger
        </span>
      </button>
      <DialogContent className="max-w-[min(96vw,56rem)] border-border/80 bg-black/92 p-2 sm:p-4">
        <div className="flex max-h-[min(90dvh,920px)] w-full items-center justify-center overflow-auto rounded-lg bg-black/40 p-1">
          {videoSrc && !imgSrc ? (
            <video
              src={videoSrc}
              className="max-h-[85dvh] w-auto max-w-full object-contain"
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : imgSrc ? (
            <img
              src={imgSrc}
              alt={alt}
              className="max-h-[85dvh] w-auto max-w-full object-contain object-top"
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
