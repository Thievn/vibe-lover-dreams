import { useState } from "react";
import { Heart, Flame, Mic, Sparkles, Zap, Baby, X, Images } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type FabActionId =
  | "selfie_sfw"
  | "selfie_lewd"
  | "vibration"
  | "praise"
  | "tease"
  | "rough"
  | "voice"
  | "breeding"
  | "gallery";

type Item = { id: FabActionId; label: string; icon: typeof Heart; disabled?: boolean };

const ITEMS: Item[] = [
  { id: "gallery", label: "Open companion gallery", icon: Images },
  { id: "vibration", label: "Signature pattern (tap again to stop)", icon: Zap },
  { id: "praise", label: "Praise Me", icon: Heart },
  { id: "tease", label: "Tease Me", icon: Sparkles },
  { id: "rough", label: "Be Rough", icon: Flame },
  { id: "voice", label: "Send Voice Message", icon: Mic, disabled: true },
  { id: "breeding", label: "Start Breeding Ritual", icon: Baby },
];

type Props = {
  onAction: (id: FabActionId) => void;
  /** Per-action disable (e.g. no toy connected). */
  isActionDisabled?: (id: FabActionId) => boolean;
  /** Softer, smaller control — matches luxury chat chrome. */
  luxury?: boolean;
};

export function ChatQuickActionFab({ onAction, isActionDisabled, luxury = false }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={cn(
        "fixed z-40",
        luxury
          ? "bottom-[calc(13rem+env(safe-area-inset-bottom))] left-2.5 opacity-90 sm:bottom-[calc(11rem+env(safe-area-inset-bottom))] sm:left-4 md:left-6"
          : "bottom-[calc(14.5rem+env(safe-area-inset-bottom))] left-3 sm:bottom-[calc(12.5rem+env(safe-area-inset-bottom))] sm:left-5 md:left-8",
      )}
    >
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="mb-3 w-[min(100vw-2rem,18rem)] rounded-2xl border border-white/10 bg-[hsl(280_30%_8%)]/95 backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quick actions</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg hover:bg-white/10 text-muted-foreground touch-manipulation"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ul className="max-h-[min(60vh,22rem)] overflow-y-auto py-1">
              {ITEMS.map((item) => {
                const off =
                  item.disabled || (isActionDisabled ? isActionDisabled(item.id) : false);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      disabled={off}
                      onClick={() => {
                        onAction(item.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full min-h-12 flex items-center gap-3 px-3 py-2.5 text-left text-sm text-foreground/95 hover:bg-white/[0.06] transition-colors disabled:opacity-40 disabled:pointer-events-none touch-manipulation active:bg-white/[0.04]",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0 text-primary" />
                      <span>{item.label}</span>
                      {item.disabled ? (
                        <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                      ) : isActionDisabled?.(item.id) ? (
                        <span className="ml-auto text-[10px] text-muted-foreground">Unavailable</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center justify-center rounded-full border shadow-lg transition-shadow",
          luxury
            ? "h-10 w-10 border-fuchsia-500/25 bg-black/55 text-fuchsia-100 backdrop-blur-md hover:shadow-[0_0_22px_rgba(236,72,153,0.28)] sm:h-11 sm:w-11"
            : "h-12 w-12 border-primary/40 bg-gradient-to-br from-[#FF2D7B] to-[hsl(280_45%_32%)] text-white hover:shadow-[0_0_28px_rgba(255,45,123,0.45)] sm:h-14 sm:w-14",
        )}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Quick actions — toys, praise, gallery"}
      >
        <motion.span
          key={open ? "x" : "spark"}
          initial={{ scale: 0.88, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.18 }}
        >
          {open ? (
            <X className={cn(luxury ? "h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" : "h-6 w-6 sm:h-7 sm:w-7")} />
          ) : (
            <Sparkles className={cn(luxury ? "h-4 w-4 sm:h-[1.15rem] sm:w-[1.15rem]" : "h-6 w-6 sm:h-7 sm:w-7")} />
          )}
        </motion.span>
      </motion.button>
    </div>
  );
}
