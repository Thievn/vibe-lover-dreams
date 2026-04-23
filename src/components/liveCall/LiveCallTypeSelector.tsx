import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Companion } from "@/data/companions";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { invokeGenerateLiveCallOptions } from "@/lib/invokeGenerateLiveCallOptions";
import { getLiveCallPresetsFallback } from "@/lib/liveCallPresetsFallback";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  companion: Companion;
};

export function LiveCallTypeSelector({ open, onOpenChange, companion }: Props) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LiveCallOption[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setOptions(null);
    const res = await invokeGenerateLiveCallOptions(companion.id);
    if (res.ok) {
      setOptions(res.options);
      setLoading(false);
      return;
    }
    toast.message("Using offline call themes", {
      description: res.error || "Could not reach the call designer.",
    });
    setOptions(getLiveCallPresetsFallback(companion));
    setLoading(false);
  }, [companion]);

  useEffect(() => {
    if (!open) {
      setOptions(null);
      setLoading(false);
      return;
    }
    void load();
  }, [open, load]);

  const pick = (opt: LiveCallOption) => {
    onOpenChange(false);
    navigate(`/live-call/${companion.id}`, {
      state: { callOption: opt },
    });
  };

  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto border-white/10 bg-black/80 backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-gothic text-xl">
            <Phone className="h-5 w-5 text-primary shrink-0" />
            Live call with {companion.name}
          </DialogTitle>
          <p className="text-left text-sm text-muted-foreground">
            Pick a vibe — voice opens in a phone-style session with your companion in character.
          </p>
        </DialogHeader>

        <div className="mt-2 grid gap-3">
          {loading && (
            <div className="grid gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-[88px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.04]"
                />
              ))}
            </div>
          )}

          {!loading && options && (
            <AnimatePresence>
              {options.map((opt, i) => (
                <motion.button
                  key={`${opt.slug}-${i}`}
                  type="button"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => pick(opt)}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border border-white/[0.1] p-4 text-left shadow-lg transition-colors",
                    "hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${gFrom}22, ${gTo}18), rgba(0,0,0,0.45)`,
                  }}
                >
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.15]"
                    style={{
                      background: `linear-gradient(120deg, ${gFrom}, ${gTo})`,
                    }}
                  />
                  <div className="relative flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">
                      {opt.moodTag}
                    </span>
                    <span className="font-gothic text-base font-bold text-foreground">{opt.title}</span>
                    <span className="text-xs leading-snug text-muted-foreground">{opt.subtitle}</span>
                  </div>
                </motion.button>
              ))}
            </AnimatePresence>
          )}

          {!loading && !options && (
            <div className="flex flex-col items-center gap-3 py-8 text-center text-sm text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Loading themes…</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
