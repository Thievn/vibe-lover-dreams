import { useState } from "react";
import { X, Download, Save, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { ZoomableImageViewport } from "@/components/ZoomableImageViewport";

interface ImageViewerProps {
  imageUrl: string;
  imageId: string;
  companionName: string;
  prompt: string;
  /** Chat images are auto-saved to the companion gallery — hide redundant save. */
  companionGalleryAutoSaved?: boolean;
  onSaveToCompanionGallery: (imageId: string) => Promise<void>;
  onSaveToPersonalGallery: (imageId: string) => Promise<void>;
  onClose: () => void;
}

export const ImageViewer = ({
  imageUrl,
  imageId,
  companionName,
  prompt,
  companionGalleryAutoSaved,
  onSaveToCompanionGallery,
  onSaveToPersonalGallery,
  onClose,
}: ImageViewerProps) => {
  const [isSavingCompanion, setIsSavingCompanion] = useState(false);
  const [isSavingPersonal, setIsSavingPersonal] = useState(false);

  const handleSaveCompanion = async () => {
    setIsSavingCompanion(true);
    try {
      await onSaveToCompanionGallery(imageId);
    } catch (err) {
      toast.error("Failed to save to companion gallery");
    } finally {
      setIsSavingCompanion(false);
    }
  };

  const handleSavePersonal = async () => {
    setIsSavingPersonal(true);
    try {
      await onSaveToPersonalGallery(imageId);
    } catch (err) {
      toast.error("Failed to save to personal gallery");
    } finally {
      setIsSavingPersonal(false);
    }
  };

  const handleDownload = async () => {
    try {
      const link = document.createElement("a");
      link.href = imageUrl;
      link.download = `${companionName}-${imageId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      toast.error("Failed to download image");
    }
  };

  const handleCopyUrl = () => {
    void navigator.clipboard.writeText(imageUrl);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 backdrop-blur-xl p-3 sm:p-5"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-white/[0.09] bg-gradient-to-b from-zinc-950/98 via-zinc-950/95 to-black shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/[0.06]"
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-20 rounded-xl bg-black/70 p-2.5 text-white transition-colors hover:bg-black/90 sm:right-4 sm:top-4"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex min-h-0 flex-1 flex-col">
            {/* Image stage: centered, full width, no “stuck to the right” */}
            <div className="relative flex min-h-[min(52vh,420px)] flex-1 flex-col bg-black sm:min-h-[min(58vh,520px)]">
              <div
                className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,45,123,0.08)_0%,transparent_55%)]"
                aria-hidden
              />
              <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 py-10 sm:px-6 sm:py-12">
                <div className="h-full w-full max-h-[min(72vh,680px)] min-h-[240px]">
                  <ZoomableImageViewport src={imageUrl} alt={companionName} className="h-full w-full" />
                </div>
              </div>
              <p className="pointer-events-none shrink-0 px-4 pb-3 text-center text-[10px] text-zinc-500 sm:text-[11px]">
                Scroll to zoom smoothly · drag to pan · double-click to reset
              </p>
            </div>

            {/* Themed meta + actions */}
            <div className="shrink-0 space-y-4 border-t border-white/[0.08] bg-gradient-to-b from-zinc-950/98 to-zinc-950 p-5 sm:p-6">
              <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 backdrop-blur-sm">
                <p className="font-gothic text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/75">Generated from</p>
                <p className="mt-2 max-h-28 overflow-y-auto font-mono text-xs leading-relaxed text-zinc-200/95 sm:text-sm">
                  {prompt}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 rounded-xl bg-primary/12 px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/22"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-white/[0.1]"
                >
                  <Copy className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Copy URL</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCompanion}
                  disabled={isSavingCompanion || companionGalleryAutoSaved}
                  className="flex items-center justify-center gap-2 rounded-xl bg-secondary/15 px-3 py-2.5 text-sm font-medium text-secondary transition-colors hover:bg-secondary/25 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">{companionGalleryAutoSaved ? "In gallery" : "Companion"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSavePersonal}
                  disabled={isSavingPersonal}
                  className="flex items-center justify-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-white/[0.11] disabled:opacity-50"
                >
                  <Save className="h-4 w-4 shrink-0" />
                  <span className="hidden sm:inline">Personal</span>
                </button>
              </div>

              <p className="text-center text-[11px] leading-snug text-zinc-500">
                {companionGalleryAutoSaved
                  ? "Already in the companion gallery. Save to your personal vault for an extra backup."
                  : "Save to the companion gallery or your personal vault — or download anytime."}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageViewer;
