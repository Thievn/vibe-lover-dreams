import { motion } from "framer-motion";
import { Bookmark, Expand, Loader2 } from "lucide-react";

interface ImageMessageProps {
  imageUrl: string;
  prompt: string;
  onImageClick: () => void;
  companionName: string;
  /** Optional: save to personal gallery backup (manual). */
  onSaveBackup?: () => void;
  backupSaved?: boolean;
  backupBusy?: boolean;
}

export const ImageMessage = ({
  imageUrl,
  prompt,
  onImageClick,
  companionName,
  onSaveBackup,
  backupSaved,
  backupBusy,
}: ImageMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-2"
    >
      {/* Natural aspect ratio — no forced crop (avoids cut-off heads). Max height keeps thread readable. */}
      <div
        onClick={onImageClick}
        className="relative group cursor-pointer rounded-2xl overflow-hidden bg-black/40 hover:ring-2 hover:ring-primary transition-all duration-300 w-full max-w-[min(92vw,28rem)]"
      >
        <img
          src={imageUrl}
          alt={prompt}
          className="w-full h-auto max-h-[min(70vh,560px)] object-contain rounded-2xl group-hover:brightness-90 transition-all duration-300"
          loading="lazy"
          onError={(e) => {
            console.error("Image failed to load:", imageUrl);
            e.currentTarget.src = "/placeholder-image.png";
          }}
        />

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileHover={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/90 text-primary-foreground text-sm font-medium"
          >
            <Expand className="h-4 w-4" />
            View Fullscreen
          </motion.div>
        </div>
      </div>

      {/* Prompt Text */}
      <p className="text-xs text-muted-foreground italic max-w-[400px]">
        ✨ Generated: "{prompt}"
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {onSaveBackup ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSaveBackup();
            }}
            disabled={backupSaved || backupBusy}
            className="inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-xs font-semibold text-foreground/95 hover:bg-white/[0.1] disabled:opacity-50 touch-manipulation"
          >
            {backupBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bookmark className="h-4 w-4 shrink-0 text-primary" />
            )}
            {backupSaved ? "Saved to your vault" : "Save image"}
          </button>
        ) : null}
        <p className="text-xs text-foreground/55">
          Tap image for fullscreen — auto-saved to {companionName}&apos;s gallery
        </p>
      </div>
    </motion.div>
  );
};

export default ImageMessage;
