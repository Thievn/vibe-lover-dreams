import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ImageIcon, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import type { CompanionGalleryRow } from "@/hooks/useCompanionGeneratedImages";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { ZoomableImageViewport } from "@/components/ZoomableImageViewport";
import { isPortraitNineSixteen, loadImageNaturalSize } from "@/lib/chatImageSettings";
import { cn } from "@/lib/utils";

type Props = {
  companionName: string;
  images: CompanionGalleryRow[];
  loading?: boolean;
  currentPortraitUrl: string | null | undefined;
  onSetAsPortrait: (imageUrl: string) => Promise<void>;
  compact?: boolean;
};

export function CompanionGalleryGrid({
  companionName,
  images,
  loading,
  currentPortraitUrl,
  onSetAsPortrait,
  compact,
}: Props) {
  const [settingId, setSettingId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<CompanionGalleryRow | null>(null);

  const normalizedCurrent = currentPortraitUrl ? stablePortraitDisplayUrl(currentPortraitUrl) : null;

  const handleSetPortrait = async (row: CompanionGalleryRow) => {
    const url = stablePortraitDisplayUrl(row.image_url) ?? row.image_url;
    setSettingId(row.id);
    try {
      const { width, height } = await loadImageNaturalSize(url);
      if (width >= height) {
        toast.error("Landscape images can’t be used as profile portraits. Pick a vertical 9∶16 image.");
        return;
      }
      if (!isPortraitNineSixteen(width, height)) {
        toast.error(
          "Profile portraits must be 9∶16 vertical (tall phone-style). This image has a different aspect ratio.",
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
          No images yet. Generate selfies and scenes in chat — they&apos;ll appear here automatically.
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
          const isActive =
            normalizedCurrent &&
            (stablePortraitDisplayUrl(row.image_url) === normalizedCurrent ||
              row.image_url.split("?")[0] === normalizedCurrent.split("?")[0]);
          return (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="group relative aspect-[3/4] rounded-2xl overflow-hidden border border-white/[0.08] bg-black/50 shadow-lg shadow-black/40"
            >
              <button
                type="button"
                onClick={() => setLightbox(row)}
                className="absolute inset-0 z-0 block focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
              >
                <img
                  src={display}
                  alt=""
                  className="h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
              </button>
              {isActive ? (
                <span className="absolute top-2 left-2 z-[2] rounded-full border border-primary/50 bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Portrait
                </span>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 z-[2] p-2 flex flex-col gap-1.5">
                <button
                  type="button"
                  disabled={settingId === row.id}
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
                <ZoomableImageViewport
                  src={stablePortraitDisplayUrl(lightbox.image_url) ?? lightbox.image_url}
                  alt=""
                  className="min-h-[min(65vh,640px)]"
                />
              </div>
              <p className="text-[10px] text-center text-muted-foreground/90">
                Pinch or scroll to zoom · double-click to reset
              </p>
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
