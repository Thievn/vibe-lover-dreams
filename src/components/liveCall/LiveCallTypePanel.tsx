import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Companion } from "@/data/companions";
import {
  invokeGenerateLiveCallOptions,
  readLiveCallOptionsSessionCache,
} from "@/lib/invokeGenerateLiveCallOptions";
import { getLiveCallPresetsFallback } from "@/lib/liveCallPresetsFallback";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { ensureCompanionCallNotifications } from "@/lib/companionCallNotifications";
import { dispatchRequestInstallHint, needsInstallForIosWebPush } from "@/lib/pwaCallAlerts";
import { cn } from "@/lib/utils";
import { stashLiveCallOption } from "@/lib/liveCallSessionStorage";

type Props = {
  companion: Companion;
  className?: string;
  /** When true (e.g. Discover card not acquired), show themes but block starting a call. */
  spendLocked?: boolean;
};

function optionsEqual(a: LiveCallOption[], b: LiveCallOption[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((x, i) => x.slug === b[i]?.slug);
}

/**
 * Inline call-type picker (profile “Live call” tab).
 * Shows tappable themes immediately (cache or offline fallbacks), then upgrades from Grok when ready.
 */
export function LiveCallTypePanel({ companion, className, spendLocked }: Props) {
  const navigate = useNavigate();
  const skippedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const companionRef = useRef(companion);
  companionRef.current = companion;

  const [personalizationSkipped, setPersonalizationSkipped] = useState(false);
  const [options, setOptions] = useState<LiveCallOption[]>(() => {
    const cached = readLiveCallOptionsSessionCache(companion.id);
    return cached?.length ? cached : getLiveCallPresetsFallback(companion);
  });
  const [upgrading, setUpgrading] = useState(true);

  useEffect(() => {
    skippedRef.current = false;
    setPersonalizationSkipped(false);
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const c = companionRef.current;
    const fallback = getLiveCallPresetsFallback(c);
    const cached = readLiveCallOptionsSessionCache(c.id);
    setOptions(cached?.length ? cached : fallback);

    if (spendLocked) {
      setUpgrading(false);
      return;
    }

    setUpgrading(true);

    let alive = true;
    void (async () => {
      const res = await invokeGenerateLiveCallOptions(c.id, { signal: ctrl.signal });
      if (!alive || ctrl.signal.aborted || skippedRef.current) return;
      if (res.ok) {
        setOptions((prev) => (optionsEqual(res.options, prev) ? prev : res.options));
      } else if (res.error !== "timeout") {
        toast.message("Using offline call themes", {
          description: res.error || "Could not reach the call designer.",
        });
      }
      if (alive && !skippedRef.current) setUpgrading(false);
    })();

    return () => {
      alive = false;
      ctrl.abort();
    };
  }, [companion.id, spendLocked]);

  const skipPersonalization = useCallback(() => {
    skippedRef.current = true;
    setPersonalizationSkipped(true);
    abortRef.current?.abort();
    setUpgrading(false);
    setOptions(getLiveCallPresetsFallback(companion));
  }, [companion]);

  const pick = (opt: LiveCallOption) => {
    if (spendLocked) {
      toast.message("Acquire this card first", {
        description: "Unlock this companion from Discover to start a live call.",
      });
      return;
    }
    void ensureCompanionCallNotifications();
    if (needsInstallForIosWebPush()) {
      dispatchRequestInstallHint();
    }
    stashLiveCallOption(companion.id, opt);
    navigate(`/live-call/${companion.id}?call=${encodeURIComponent(opt.slug)}`, {
      state: { callOption: opt },
    });
  };

  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";

  return (
    <div className={cn("space-y-4", spendLocked && "opacity-90", className)}>
      {spendLocked ? (
        <div className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-2.5 text-[11px] leading-snug text-primary/95">
          <p className="font-semibold text-foreground/95">Preview only</p>
          <p className="mt-1 text-muted-foreground">
            Acquire this card to start a live session — you can still browse call styles below.
          </p>
        </div>
      ) : null}
      {needsInstallForIosWebPush() ? (
        <div className="rounded-xl border border-amber-500/35 bg-amber-950/25 px-3 py-2.5 text-[11px] leading-snug text-amber-100/95 backdrop-blur-sm">
          <p className="font-semibold text-amber-50/95">Call alerts work best from the installed app</p>
          <p className="mt-1 text-amber-100/80">
            On iPhone, add LustForge to your <strong className="text-amber-50">Home Screen</strong>, then enable{" "}
            <strong className="text-amber-50">Voice call alerts</strong> in Preferences. Otherwise the browser may not
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
              Tap a style to start right away. We can personalize themes in the background when the line is ready —
              nothing breaks character.
            </p>
          </div>
        </div>
      </div>

      {upgrading && !personalizationSkipped ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2 text-[11px] text-muted-foreground backdrop-blur-sm">
          <p className="flex items-center gap-2 font-medium text-foreground/90 min-w-0">
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
            <span className="truncate">Upgrading call themes…</span>
          </p>
          <button
            type="button"
            onClick={skipPersonalization}
            className="shrink-0 text-[11px] font-semibold text-primary underline-offset-2 hover:underline"
          >
            Skip personalization
          </button>
        </div>
      ) : null}

      <div className="grid gap-3">
        <AnimatePresence>
          {options.map((opt, i) => (
            <motion.button
              key={`${opt.slug}-${i}`}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              whileHover={spendLocked ? undefined : { scale: 1.01 }}
              whileTap={spendLocked ? undefined : { scale: 0.99 }}
              disabled={spendLocked}
              onClick={() => pick(opt)}
              className={cn(
                "relative min-h-[88px] overflow-hidden rounded-2xl border border-white/[0.1] p-4 text-left shadow-lg transition-colors",
                spendLocked
                  ? "cursor-not-allowed opacity-60 border-white/[0.06]"
                  : "hover:border-primary/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-[0.99]",
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
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/90">{opt.moodTag}</span>
                <span className="font-gothic text-base font-bold text-foreground">{opt.title}</span>
                <span className="text-xs leading-snug text-muted-foreground">{opt.subtitle}</span>
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
