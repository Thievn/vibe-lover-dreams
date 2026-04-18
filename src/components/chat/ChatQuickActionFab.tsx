import { useState } from "react";
import {
  Camera,
  Heart,
  Flame,
  Mic,
  Sparkles,
  Zap,
  Baby,
  Plus,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export type FabActionId =
  | "selfie"
  | "vibration"
  | "praise"
  | "tease"
  | "rough"
  | "voice"
  | "breeding";

type Item = { id: FabActionId; label: string; icon: typeof Heart; disabled?: boolean };

const ITEMS: Item[] = [
  { id: "selfie", label: "Generate Selfie / Lewd Image", icon: Camera },
  { id: "vibration", label: "Trigger Signature Vibration Pattern", icon: Zap },
  { id: "praise", label: "Praise Me", icon: Heart },
  { id: "tease", label: "Tease Me", icon: Sparkles },
  { id: "rough", label: "Be Rough", icon: Flame },
  { id: "voice", label: "Send Voice Message", icon: Mic, disabled: true },
  { id: "breeding", label: "Start Breeding Ritual", icon: Baby },
];

type Props = {
  onAction: (id: FabActionId) => void;
};

export function ChatQuickActionFab({ onAction }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-50 md:right-8">
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
              {ITEMS.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={item.disabled}
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
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.button
        type="button"
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-14 w-14 rounded-full flex items-center justify-center shadow-lg border border-primary/40",
          "bg-gradient-to-br from-[#FF2D7B] to-[hsl(280_45%_32%)] text-white",
          "hover:shadow-[0_0_28px_rgba(255,45,123,0.45)] transition-shadow",
        )}
        aria-expanded={open}
        aria-label={open ? "Close quick actions" : "Open quick actions"}
      >
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: 0.2 }}>
          {open ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
        </motion.span>
      </motion.button>
    </div>
  );
}
