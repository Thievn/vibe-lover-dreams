import { motion } from "framer-motion";
import { ImageIcon, MoreHorizontal, Phone, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";

type Props = {
  companionId: string;
  onLiveCall: () => void;
  onRamp: () => void;
  onGallery: () => void;
  onVoiceOptions: () => void;
  onSafeWordInfo: () => void;
  /** Signed-in: Ramp can run (switches to Live Voice + toggles the driver for guests, keep signed-out disabled). */
  rampAvailable: boolean;
  rampActive?: boolean;
  disabled?: boolean;
  className?: string;
};

const pillClass =
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-full border border-white/[0.1] bg-black/50 px-3.5 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground/95 shadow-lg shadow-black/20 backdrop-blur-md transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-40 sm:px-4 touch-manipulation";

/**
 * Primary surface actions for the chat dock — keeps the main chrome scannable.
 */
export function ChatActionPills({
  companionId,
  onLiveCall,
  onRamp,
  onGallery,
  onVoiceOptions,
  onSafeWordInfo,
  rampAvailable,
  rampActive = false,
  disabled,
  className,
}: Props) {
  return (
    <div className={cn("flex w-full flex-wrap items-center justify-center gap-2 px-1", className)}>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onLiveCall}
        disabled={disabled}
        className={cn(pillClass, "text-primary/95 border-primary/25 bg-primary/8")}
        title="Start a live call from her profile"
      >
        <Phone className="h-3.5 w-3.5 text-[#00ffd4]" />
        <span>Live call</span>
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={rampAvailable ? onRamp : undefined}
        disabled={disabled || !rampAvailable}
        className={cn(
          pillClass,
          rampActive && "border-fuchsia-400/45 bg-fuchsia-950/35 text-fuchsia-100 ring-1 ring-fuchsia-500/30",
        )}
        title={rampAvailable ? "Toggle Ramp (switches to Live Voice if needed)" : "Sign in to use Ramp · Live Voice"}
      >
        <Zap className="h-3.5 w-3.5 text-amber-300" />
        <span>Ramp</span>
      </motion.button>
      <motion.button
        type="button"
        whileTap={{ scale: 0.97 }}
        onClick={onGallery}
        disabled={disabled}
        className={pillClass}
        title="Open gallery"
      >
        <ImageIcon className="h-3.5 w-3.5 text-primary" />
        <span>Gallery</span>
      </motion.button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            className={pillClass}
            title="More options"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="max-sm:sr-only">Options</span>
          </motion.button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="min-w-[12rem] border border-white/10 bg-[hsl(280_25%_8%)]/98 text-foreground"
        >
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">Chat</DropdownMenuLabel>
          <DropdownMenuItem asChild className="cursor-pointer text-sm">
            <Link to={`/companions/${companionId}`} className="w-full">
              View profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer gap-2 text-sm"
            onSelect={() => onVoiceOptions()}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Voice &amp; TTS
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            className="cursor-pointer text-destructive focus:text-destructive text-sm"
            onSelect={() => onSafeWordInfo()}
          >
            Safe word info
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
