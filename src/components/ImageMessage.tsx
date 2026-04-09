import { motion } from "framer-motion";
import { Expand } from "lucide-react";

interface ImageMessageProps {
  imageUrl: string;
  prompt: string;
  onImageClick: () => void;
  companionName: string;
}

export const ImageMessage = ({
  imageUrl,
  prompt,
  onImageClick,
  companionName,
}: ImageMessageProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-2"
    >
      {/* Image Container */}
      <div
        onClick={onImageClick}
        className="relative group cursor-pointer rounded-2xl overflow-hidden bg-black/40 hover:ring-2 hover:ring-primary transition-all duration-300 max-w-[min(90vw,760px)] w-full"
      >
        <div className="aspect-[3/2] w-full overflow-hidden">
          <img
            src={imageUrl}
            alt={prompt}
            className="w-full h-full object-cover rounded-2xl group-hover:brightness-90 transition-all duration-300"
            onError={(e) => {
              console.error("Image failed to load:", imageUrl);
              e.currentTarget.src = "/placeholder-image.png";
            }}
          />
        </div>

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

      {/* Hint */}
      <p className="text-xs text-foreground/60">
        Click image to view, download, or save to galleries →
      </p>
    </motion.div>
  );
};

export default ImageMessage;
