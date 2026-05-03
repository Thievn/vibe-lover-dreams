import { motion } from "framer-motion";
import { ImageIcon, MoreHorizontal, Phone, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Props = {
  companionId: string;
  onLiveCall: () => void;
  onRamp: () => void;
  /** Hide Ramp in the dock (e.g. Live Voice already has ramp controls above the composer). */
  hideRampButton?: boolean;
  onGallery: () => void;
  onVoiceOptions: () => void;
  safeWord: string;
  onEmergencyStop: () => void;
  rampAvailable: boolean;
  rampActive?: boolean;
  disabled?: boolean;
  className?: string;
};

const dockBtn =
  "group relative flex h-12 min-w-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.08] to-black/40 text-[10px] font-semibold text-foreground/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-200 hover:border-primary/35 hover:from-primary/15 hover:to-black/50 hover:shadow-[0_0_24px_rgba(168,85,247,0.2)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 sm:min-w-[4rem] sm:h-14 sm:gap-1 sm:text-[11px] touch-manipulation";

const iconwrap = "flex h-7 w-7 items-center justify-center rounded-xl bg-white/[0.04] text-[#00ffd4] transition-colors group-hover:bg-primary/20 group-hover:text-primary sm:h-8 sm:w-8";

/**
 * Clean floating action strip above the composer — Call, Ramp, Gallery, Options.
 */
export function ChatFloatingActionDock({
  companionId,
  onLiveCall,
  onRamp,
  hideRampButton = false,
  onGallery,
  onVoiceOptions,
  safeWord,
  onEmergencyStop,
  rampAvailable,
  rampActive = false,
  disabled,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl px-2",
        className,
      )}
    >
      <motion.div
        layout
        className="flex items-stretch justify-center gap-1.5 rounded-[1.35rem] border border-white/[0.09] bg-[hsl(280_24%_6%)]/90 p-1.5 shadow-[0_8px_40px_-8px_rgba(0,0,0,0.75),inset_0_1px_0_rgba(255,255,255,0.04)] backdrop-blur-xl sm:gap-2 sm:p-2"
        style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 0 1px rgba(255,45,123,0.04)" }}
      >
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onLiveCall}
          disabled={disabled}
          className={cn(dockBtn, "text-primary/95")}
          title="Call"
        >
          <span className={iconwrap}>
            <Phone className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
          </span>
          <span className="max-[380px]:sr-only">Call</span>
        </motion.button>
        {!hideRampButton ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={rampAvailable ? onRamp : undefined}
            disabled={disabled || !rampAvailable}
            className={cn(
              dockBtn,
              rampActive &&
                "border-fuchsia-400/40 from-fuchsia-950/40 to-black/50 text-fuchsia-100 ring-1 ring-fuchsia-500/25 shadow-[0_0_30px_rgba(232,121,249,0.12)]",
            )}
            title={rampAvailable ? "Ramp mode" : "Sign in for Ramp · Live Voice"}
          >
            <span className={cn(iconwrap, rampActive && "bg-fuchsia-500/20 text-amber-200")}>
              <Zap className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
            </span>
            <span className="max-[380px]:sr-only">Ramp</span>
          </motion.button>
        ) : null}
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={onGallery}
          disabled={disabled}
          className={dockBtn}
          title="Gallery"
        >
          <span className={iconwrap}>
            <ImageIcon className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
          </span>
          <span className="max-[380px]:sr-only">Gallery</span>
        </motion.button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              className={cn(dockBtn, "shrink-0 px-1")}
              title="Options"
            >
              <span className={iconwrap}>
                <MoreHorizontal className="h-4 w-4 sm:h-[1.1rem] sm:w-[1.1rem]" />
              </span>
              <span className="max-[420px]:sr-only">Options</span>
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
              Voice &amp; TTS
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:text-destructive text-sm"
              onSelect={() => onEmergencyStop()}
            >
              Emergency stop
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[10px] text-muted-foreground">
              Safe: {safeWord}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </motion.div>
    </div>
  );
}
