import { useState } from "react";
import { ChevronLeft, ImageIcon, Loader2, Maximize2, MessageSquarePlus, Sparkles, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { PortraitViewLightbox } from "@/components/PortraitViewLightbox";
import type { Companion } from "@/data/companions";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { loadImageNaturalSize, isPortraitNineSixteen } from "@/lib/chatImageSettings";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type Props = {
  companion: Companion;
  imageUrl: string | null;
  headerAnimated: string | null;
  onVoiceClick?: () => void;
  images: CompanionGalleryRow[];
  loading: boolean;
  currentPortraitUrl: string | null | undefined;
  onSetAsPortrait: (url: string) => Promise<void>;
  onOpenFullGallery: () => void;
  onAddReferenceLine: (line: string) => void;
  /** If set, the gallery “To chat” action runs a new still (similar heat) instead of only prepending a line. */
  onRequestSimilarStill?: (imageUrl: string) => void;
  hasGalleryUser: boolean;
  className?: string;
};

/**
 * Split-screen left column: one large main portrait (crisp, no header duplication) + recent stills.
 * Shown at `md+` with the thread on the right.
 */
export function ChatLeftHeroPanel({
  companion,
  imageUrl,
  headerAnimated,
  onVoiceClick,
  images,
  loading,
  currentPortraitUrl,
  onSetAsPortrait,
  onOpenFullGallery,
  onAddReferenceLine,
  onRequestSimilarStill,
  hasGalleryUser,
  className,
}: Props) {
  const [expanded, setExpanded] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const normalizedCurrent = currentPortraitUrl ? stablePortraitDisplayUrl(currentPortraitUrl) : null;
  const recent = hasGalleryUser ? images.filter((r) => !r.is_video).slice(0, 10) : [];

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
        "relative hidden h-full min-h-0 min-w-0 flex-col border-r border-white/[0.08] bg-[hsl(280_28%_6%)] md:flex",
        expanded ? "w-[min(44vw,26rem)] max-w-lg flex-[0_0_min(44vw,26rem)]" : "w-12 flex-[0_0_3rem]",
        className,
      )}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-2 py-1.5">
        {expanded ? (
          <span className="truncate pl-1 text-[9px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            {companion.name.split(" ")[0] ?? "Her"}
          </span>
        ) : null}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => setExpanded((e) => !e)}
          className="h-9 w-9 shrink-0 text-muted-foreground hover:text-foreground"
          title={expanded ? "Collapse" : "Expand"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", !expanded && "rotate-180")} />
        </Button>
      </div>

      {expanded ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 p-2">
          <div
            className="relative w-full shrink-0 overflow-hidden rounded-[1.65rem] border border-white/[0.12] bg-black/50 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05),0_20px_56px_-12px_rgba(0,0,0,0.55),0_0_64px_-16px_rgba(168,85,247,0.22)]"
            style={{ height: "min(58vh, 36rem)" }}
          >
            <PortraitViewLightbox
              alt={companion.name}
              stillSrc={imageUrl}
              animatedSrc={headerAnimated}
              triggerClassName="block h-full w-full"
            >
              <div className="relative h-full min-h-[12rem] w-full">
                <div
                  className="absolute inset-0"
                  style={{
                    background: imageUrl
                      ? undefined
                      : `linear-gradient(160deg, ${companion.gradientFrom}, ${companion.gradientTo})`,
                  }}
                />
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-top"
                    loading="eager"
                    decoding="async"
                    sizes="(max-width: 1200px) 44vw, 420px"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center font-gothic text-4xl font-bold text-white/90">
                    {companion.name.charAt(0)}
                  </span>
                )}
                {onVoiceClick ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVoiceClick();
                    }}
                    className="absolute bottom-2 right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-black/80 text-primary shadow-md hover:bg-primary/15"
                    title="Voice & TTS"
                    aria-label="Voice settings"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            </PortraitViewLightbox>
            <p className="pointer-events-none absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-widest text-white/80">
              {normalizeCompanionRarity(companion.rarity)}
            </p>
          </div>

          <div className="min-h-0 flex flex-[0_1_45%] flex-col border-t border-white/[0.06] pt-1">
            <p className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Recent</p>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden [-webkit-overflow-scrolling:touch] pr-0.5">
              {loading && hasGalleryUser ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-5 w-5 animate-spin text-primary/80" />
                </div>
              ) : !hasGalleryUser || !recent.length ? (
                <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-center">
                  <ImageIcon className="mx-auto h-4 w-4 text-muted-foreground/50" />
                  <p className="mt-1 text-[9px] leading-tight text-muted-foreground/90">
                    {hasGalleryUser
                      ? "Stills you generate will appear here."
                      : "Sign in to build a still library for her."}
                  </p>
                  {hasGalleryUser ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="mt-2 h-7 w-full border-primary/20 text-[10px]"
                      onClick={onOpenFullGallery}
                    >
                      Open gallery
                    </Button>
                  ) : null}
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
                    return (
                      <li key={row.id}>
                        <div
                          className={cn(
                            "group relative flex aspect-[3/4] w-full overflow-hidden rounded-lg border border-white/10 bg-black/40",
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
                                `*that look from the still — the pose, the mood, all of it.*`,
                              )
                            }
                          />
                          {row.is_video ? (
                            <video
                              src={display}
                              muted
                              playsInline
                              className="pointer-events-none h-full w-full object-cover object-top"
                            />
                          ) : (
                            <img
                              src={display}
                              alt=""
                              className="pointer-events-none h-full w-full object-cover object-top"
                            />
                          )}
                          <div className="absolute inset-x-0 bottom-0 z-[1] flex flex-col gap-0.5 bg-gradient-to-t from-black/90 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                            <button
                              type="button"
                              className="rounded bg-white/15 px-1.5 py-0.5 text-[8px] font-bold uppercase text-white"
                              onClick={() => {
                                const d = display.split("?")[0] || display;
                                if (onRequestSimilarStill) {
                                  onRequestSimilarStill(d);
                                } else {
                                  onAddReferenceLine(
                                    `Let's go back to that look — the energy in that still.`,
                                  );
                                }
                              }}
                            >
                              <MessageSquarePlus className="mb-0.5 inline h-2.5 w-2.5" />
                              Similar still
                            </button>
                            <button
                              type="button"
                              disabled={Boolean(row.is_video) || busyId === row.id}
                              onClick={() => void handleSetPortrait(row)}
                              className="rounded bg-primary/40 px-1.5 py-0.5 text-[8px] font-bold uppercase text-primary-foreground"
                            >
                              <Sparkles className="mb-0.5 inline h-2.5 w-2.5" />
                              {busyId === row.id ? "…" : "Portrait"}
                            </button>
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
                      className="h-7 w-full gap-1 text-[9px] text-primary/90"
                    >
                      <Maximize2 className="h-3 w-3" />
                      All
                    </Button>
                  </li>
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
