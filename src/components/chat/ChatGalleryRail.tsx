import { useState } from "react";
import { ChevronLeft, ImageIcon, Loader2, Maximize2, MessageSquarePlus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { loadImageNaturalSize, isPortraitNineSixteen } from "@/lib/chatImageSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  companionName: string;
  images: CompanionGalleryRow[];
  loading: boolean;
  currentPortraitUrl: string | null | undefined;
  onSetAsPortrait: (url: string) => Promise<void>;
  onOpenFullGallery: () => void;
  /** Dropped / “send to chat” line prepended to the composer. */
  onAddReferenceLine: (line: string) => void;
  className?: string;
};

/**
 * Collapsible left rail: recent stills for quick pick without leaving the thread.
 * Desktop / tablet — hidden on small viewports; use the gallery sheet on phones.
 */
export function ChatGalleryRail({
  companionName,
  images,
  loading,
  currentPortraitUrl,
  onSetAsPortrait,
  onOpenFullGallery,
  onAddReferenceLine,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const normalizedCurrent = currentPortraitUrl ? stablePortraitDisplayUrl(currentPortraitUrl) : null;
  const recent = images.filter((r) => !r.is_video).slice(0, 12);

  const handleSetPortrait = async (row: CompanionGalleryRow) => {
    if (row.is_video) {
      toast.error("Pick a still for her portrait.");
      return;
    }
    const url = stablePortraitDisplayUrl(row.image_url) ?? row.image_url;
    setBusyId(row.id);
    try {
      const { width, height } = await loadImageNaturalSize(url);
      if (width >= height) {
        toast.error("Portraits need a vertical 9∶16 look — try another from the full gallery.");
        return;
      }
      if (!isPortraitNineSixteen(width, height)) {
        toast.error("Aspect must be 9∶16 (tall) for a chat portrait.");
        return;
      }
      await onSetAsPortrait(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not set portrait.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <aside
      className={cn(
        "relative hidden h-full min-h-0 flex-col border-r border-white/[0.08] bg-black/40 md:flex",
        expanded ? "w-[11.5rem]" : "w-12",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-2 py-1.5">
        {expanded ? (
          <span className="truncate pl-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Stills
          </span>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setExpanded((e) => !e)}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title={expanded ? "Collapse" : "Expand stills"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !expanded && "rotate-180")} />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 [-webkit-overflow-scrolling:touch]">
        {loading ? (
          <div className="flex flex-1 items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary/80" />
          </div>
        ) : !recent.length ? (
          <div
            className={cn("rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-center", !expanded && "p-1")}
          >
            {expanded ? (
              <>
                <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground/50" />
                <p className="mt-1 text-[9px] leading-tight text-muted-foreground/90">
                  Generate in chat to fill this strip.
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="mt-2 h-7 w-full border-primary/20 text-[10px]"
                  onClick={onOpenFullGallery}
                >
                  Open gallery
                </Button>
              </>
            ) : (
              <ImageIcon className="mx-auto h-4 w-4 text-muted-foreground/50" />
            )}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {recent.map((row) => {
              const display = stablePortraitDisplayUrl(row.image_url) ?? row.image_url;
              const isActive =
                !row.is_video &&
                normalizedCurrent &&
                (stablePortraitDisplayUrl(row.image_url) === normalizedCurrent ||
                  row.image_url.split("?")[0] === normalizedCurrent.split("?")[0]);
              if (!expanded) {
                return (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() =>
                        onAddReferenceLine(
                          `Remember the look in this shot — the vibe, the pose, what you were doing to me in that scene.`,
                        )
                      }
                      className="relative h-8 w-8 overflow-hidden rounded-lg border border-white/10"
                      title="Reference in chat"
                    >
                      {row.is_video ? (
                        <video src={display} muted playsInline className="h-full w-full object-cover" />
                      ) : (
                        <img src={display} alt="" className="h-full w-full object-cover object-top" />
                      )}
                    </button>
                  </li>
                );
              }
              return (
                <li key={row.id}>
                  <div
                    className={cn(
                      "group relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/[0.1] bg-black/50 shadow-md transition-transform duration-300 will-change-transform group-hover:-translate-y-0.5",
                      isActive && "ring-1 ring-primary/50",
                    )}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/uri-list", display);
                      e.dataTransfer.setData("application/lustforge-gallery", display);
                      e.dataTransfer.effectAllowed = "copy";
                    }}
                  >
                    <button
                      type="button"
                      className="absolute inset-0 z-0"
                      onClick={() =>
                        onAddReferenceLine(
                          `*thinking about the shot where you looked like that — the energy we had in that still.*`,
                        )
                      }
                    />
                    {row.is_video ? (
                      <video src={display} muted playsInline className="pointer-events-none h-full w-full object-cover" />
                    ) : (
                      <img src={display} alt="" className="pointer-events-none h-full w-full object-cover object-top" />
                    )}
                    <div className="absolute inset-0 z-[1] flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/0 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          className="inline-flex min-h-8 w-full items-center justify-center gap-0.5 rounded-md bg-white/10 text-[8px] font-bold uppercase text-white backdrop-blur"
                          onClick={() =>
                            onAddReferenceLine(
                              `Let's revisit that look — the pose, the mood, everything about that still.`,
                            )
                          }
                        >
                          <MessageSquarePlus className="h-2.5 w-2.5" />
                          Chat
                        </button>
                        <button
                          type="button"
                          disabled={Boolean(row.is_video) || busyId === row.id}
                          onClick={() => void handleSetPortrait(row)}
                          className="inline-flex min-h-8 w-full items-center justify-center gap-0.5 rounded-md bg-primary/30 text-[8px] font-bold uppercase text-primary-foreground"
                        >
                          <Sparkles className="h-2.5 w-2.5" />
                          {busyId === row.id ? "…" : "Portrait"}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
            <li>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={onOpenFullGallery}
                className="h-8 w-full gap-1 text-[9px] text-primary/90"
              >
                <Maximize2 className="h-3 w-3" />
                All in gallery
              </Button>
            </li>
          </ul>
        )}
      </div>
      {expanded && recent.length > 0 ? (
        <p className="border-t border-white/[0.06] px-2 py-1.5 text-[8px] leading-tight text-muted-foreground/80">
          Drag a still into the field below or tap to drop a tease line, {companionName.split(" ")[0]}&apos;s watching.
        </p>
      ) : null}
    </aside>
  );
}
