import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Loader2, Sparkles, Video, X } from "lucide-react";
import { toast } from "sonner";
import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";
import { portraitUrlsEquivalent, stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { ZoomableImageViewport } from "@/components/ZoomableImageViewport";
import { loadImageNaturalSize } from "@/lib/chatImageSettings";
import { isAcceptableChatPortraitUpload } from "@/lib/portraitAspect";
import { cn } from "@/lib/utils";

type Props = {
  companionName: string;
  images: CompanionGalleryRow[];
  loading?: boolean;
  currentPortraitUrl: string | null | undefined;
  onSetAsPortrait: (imageUrl: string) => Promise<void>;
  /** When set, this gallery row is the I2V source for “loop video” (optional). */
  selectedLoopSourceId?: string | null;
  onSelectForLoop?: (row: CompanionGalleryRow | null) => void;
  compact?: boolean;
};

export function CompanionGalleryGrid({
  companionName,
  images,
  loading,
  currentPortraitUrl,
  onSetAsPortrait,
  selectedLoopSourceId = null,
  onSelectForLoop,
  compact,
}: Props) {
  const [settingId, setSettingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<CompanionGalleryRow | null>(null);

  const normalizedCurrent = currentPortraitUrl ? stablePortraitDisplayUrl(currentPortraitUrl) : null;

  const handleSetPortrait = async (row: CompanionGalleryRow) => {
    if (row.is_video) {
      toast.error("Videos can’t be used as profile portraits. Pick a still image.");
      return;
    }
    const url = stablePortraitDisplayUrl(row.image_url) ?? row.image_url;
    setSettingId(row.id);
    try {
      const { width, height } = await loadImageNaturalSize(url);
      if (width >= height) {
        toast.error("Landscape images can’t be used as profile portraits. Pick a vertical 9∶16 image.");
        return;
      }
      if (!isAcceptableChatPortraitUpload(width, height)) {
        toast.error(
          "Profile portraits need a vertical card look (2:3 preferred; 3:4 or 9:16 also work). This image’s ratio doesn’t match.",
        );
        return;
      }
      await onSetAsPortrait(url);
      toast.success("Portrait updated — you'll see this in chat and on the profile.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update portrait.");
    } finally {
      setSettingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!images.length) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/35 backdrop-blur-xl px-6 py-14 text-center">
        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Nothing here yet. Chat generations and profile loop clips show up automatically once they&apos;re saved to this
          companion&apos;s gallery.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-3 sm:gap-4",
          compact ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        )}
      >
        {images.map((row, i) => {
          const display = stablePortraitDisplayUrl(row.image_url) ?? row.image_url;
          const isVideo = Boolean(row.is_video);
          const isActive =
            !isVideo &&
            Boolean(normalizedCurrent) &&
            portraitUrlsEquivalent(row.image_url, normalizedCurrent ?? undefined);
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="group relative aspect-[2/3] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/50 shadow-lg shadow-black/40"
            >
              <button
                type="button"
                onClick={() => setLightbox(row)}
                className="absolute inset-0 z-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                {isVideo ? (
                  <video
                    src={display}
                    muted
                    playsInline
                    preload="metadata"
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <img
                    src={display}
                    alt=""
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
              </button>
              {isActive ? (
                <span className="absolute top-2 left-2 z-[2] rounded-full border border-primary/50 bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Portrait
                </span>
              ) : null}
              {isVideo ? (
                <span className="absolute top-2 right-2 z-[2] rounded-full border border-white/20 bg-black/55 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/90">
                  Video
                </span>
              ) : null}
              {!isVideo && selectedLoopSourceId === row.id ? (
                <span className="absolute top-2 right-2 z-[2] rounded-full border border-violet-400/45 bg-violet-950/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-100/95">
                  Loop source
                </span>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 z-[2] p-2 flex flex-col gap-1.5">
                {onSelectForLoop && !isVideo ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectForLoop(selectedLoopSourceId === row.id ? null : row);
                    }}
                    className={cn(
                      "w-full flex items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold py-2 px-2 shadow-lg touch-manipulation transition-colors",
                      selectedLoopSourceId === row.id
                        ? "border-violet-400/55 bg-violet-600/35 text-violet-50 hover:bg-violet-600/45"
                        : "border-violet-500/35 bg-black/55 text-violet-100/95 hover:bg-violet-950/40",
                    )}
                  >
                    <Video className="h-3.5 w-3.5 shrink-0" />
                    {selectedLoopSourceId === row.id ? "Clear loop source" : "Use for loop video"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={settingId === row.id || isVideo}
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleSetPortrait(row);
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-primary/90 hover:bg-primary text-primary-foreground text-xs font-semibold py-2 px-2 shadow-lg disabled:opacity-60 touch-manipulation"
                >
                  {settingId === row.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Set as portrait
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence>
        {lightbox ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setLightbox(null)}
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.96 }}
              className="relative max-w-lg w-full max-h-[90vh] flex flex-col gap-3"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="absolute -top-1 -right-1 z-10 h-11 w-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="w-full rounded-2xl border border-white/10 bg-black/30 overflow-hidden max-h-[min(78vh,800px)]">
                {lightbox.is_video ? (
                  <video
                    src={stablePortraitDisplayUrl(lightbox.image_url) ?? lightbox.image_url}
                    controls
                    playsInline
                    autoPlay
                    className="w-full max-h-[min(78vh,800px)] object-contain bg-black"
                  />
                ) : (
                  <ZoomableImageViewport
                    src={stablePortraitDisplayUrl(lightbox.image_url) ?? lightbox.image_url}
                    alt=""
                    className="min-h-[min(65vh,640px)]"
                  />
                )}
              </div>
              {lightbox.is_video ? (
                <p className="text-[10px] text-center text-muted-foreground/90">Native video controls</p>
              ) : (
                <p className="text-[10px] text-center text-muted-foreground/90">
                  Pinch or scroll to zoom · double-click to reset
                </p>
              )}
              <p className="text-xs text-muted-foreground italic line-clamp-3 text-center px-2">
                {lightbox.prompt}
              </p>
              <p className="text-[10px] text-center text-muted-foreground/80">
                {companionName} · {new Date(lightbox.created_at).toLocaleString()}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
