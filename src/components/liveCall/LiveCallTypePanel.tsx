import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Companion } from "@/data/companions";
import { invokeGenerateLiveCallOptions } from "@/lib/invokeGenerateLiveCallOptions";
import { getLiveCallPresetsFallback } from "@/lib/liveCallPresetsFallback";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { ensureCompanionCallNotifications } from "@/lib/companionCallNotifications";
import { dispatchRequestInstallHint, needsInstallForIosWebPush } from "@/lib/pwaCallAlerts";
import { cn } from "@/lib/utils";

type Props = {
  companion: Companion;
  className?: string;
};

/**
 * Inline call-type picker (profile “Live call” tab). Shows a short “theming” disclaimer while Grok runs.
 */
export function LiveCallTypePanel({ companion, className }: Props) {
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
    void load();
  }, [load]);

  const pick = (opt: LiveCallOption) => {
    void ensureCompanionCallNotifications();
    if (needsInstallForIosWebPush()) {
      dispatchRequestInstallHint();
    }
    navigate(`/live-call/${companion.id}?call=${encodeURIComponent(opt.slug)}`, {
      state: { callOption: opt },
    });
  };

  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";

  return (
    <div className={cn("space-y-4", className)}>
      {needsInstallForIosWebPush() ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-[11px] leading-snug text-amber-100/95 backdrop-blur-sm">
          <p className="font-semibold text-amber-50/95">Call alerts work best from the installed app</p>
          <p className="mt-1 text-amber-100/80">
            On iPhone, add LustForge to your <strong className="text-amber-50">Home Screen</strong>, then enable{" "}
            <strong className="text-amber-50">Voice call alerts</strong> in Settings. Otherwise the browser may not
            ring you when the tab is in the background.
          </p>
          <button
            type="button"
            onClick={() => dispatchRequestInstallHint()}
            className="mt-2 text-[11px] font-semibold text-amber-200 underline-offset-2 hover:underline"
          >
            Show install steps
          </button>
        </div>
      ) : null}
      <div className="rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.08] via-black/40 to-black/50 p-4 sm:p-5 backdrop-blur-md">
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10"
            style={{
              background: `linear-gradient(135deg, ${gFrom}55, ${gTo}44)`,
            }}
          >
            <Phone className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0 space-y-1">
            <p className="font-gothic text-base font-bold text-foreground leading-snug">Live call with {companion.name}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground/95">
              We&apos;re weaving call themes around their exact kinks and voice — give it a moment. When the cards
              appear, tap one to step into a private line; nothing breaks character.
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div
          className="rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-muted-foreground/95 backdrop-blur-sm"
          role="status"
        >
          <p className="flex items-center gap-2 font-medium text-foreground/90">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            Generating call styles…
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            The list is being tailored to this companion so every option feels personal, urgent, and theirs alone.
          </p>
        </div>
      ) : null}

      <div className="grid gap-3">
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
                  "hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
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
      </div>
    </div>
  );
}
