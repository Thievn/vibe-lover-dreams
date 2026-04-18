import { useState } from "react";
import { X, Download, Save, Copy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface ImageViewerProps {
  imageUrl: string;
  imageId: string;
  companionName: string;
  prompt: string;
  onSaveToCompanionGallery: (imageId: string) => Promise<void>;
  onSaveToPersonalGallery: (imageId: string) => Promise<void>;
  onClose: () => void;
}

export const ImageViewer = ({
  imageUrl,
  imageId,
  companionName,
  prompt,
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
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-4xl w-full max-h-screen overflow-hidden rounded-2xl bg-card border border-border shadow-2xl"
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Image Container */}
          <div className="flex flex-col h-full">
            <div className="flex-1 flex items-center justify-center bg-black/40 overflow-auto">
              <img
                src={imageUrl}
                alt={companionName}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>

            {/* Info and Controls */}
            <div className="bg-card border-t border-border p-6 space-y-4">
              {/* Prompt Display */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase">Generated from:</label>
                <p className="text-sm text-foreground/80 italic">"{prompt}"</p>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors text-sm font-medium"
                >
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  onClick={handleCopyUrl}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent transition-colors text-sm font-medium"
                >
                  <Copy className="h-4 w-4" />
                  <span className="hidden sm:inline">Copy URL</span>
                </button>

                <button
                  onClick={handleSaveCompanion}
                  disabled={isSavingCompanion}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-secondary/10 hover:bg-secondary/20 text-secondary disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Companion</span>
                </button>

                <button
                  onClick={handleSavePersonal}
                  disabled={isSavingPersonal}
                  className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-foreground/10 hover:bg-foreground/20 text-foreground disabled:opacity-50 transition-colors text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  <span className="hidden sm:inline">Personal</span>
                </button>
              </div>

              {/* Info Text */}
              <p className="text-xs text-muted-foreground text-center">
                💡 Companions and your personal galleries preserve your favorite moments
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ImageViewer;
