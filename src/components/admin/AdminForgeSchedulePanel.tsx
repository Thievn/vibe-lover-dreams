import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronDown, Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "lustforge-admin-scheduled-forge-v1";

export type AdminForgeScheduleConfig = {
  enabled: boolean;
  /** Max companions per calendar day (when auto-run triggers). */
  perDay: 1 | 2;
  /** Local hour 0–23 */
  hour: number;
  minute: number;
  /** Save auto-generated rows as private drafts */
  privateByDefault: boolean;
};

const defaultConfig: AdminForgeScheduleConfig = {
  enabled: false,
  perDay: 1,
  hour: 9,
  minute: 0,
  privateByDefault: true,
};

function loadConfig(): AdminForgeScheduleConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConfig;
    const p = JSON.parse(raw) as Partial<AdminForgeScheduleConfig>;
    return {
      ...defaultConfig,
      ...p,
      perDay: p.perDay === 2 ? 2 : 1,
      hour: typeof p.hour === "number" ? Math.min(23, Math.max(0, p.hour)) : 9,
      minute: typeof p.minute === "number" ? Math.min(59, Math.max(0, p.minute)) : 0,
    };
  } catch {
    return defaultConfig;
  }
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type DayRuns = { day: string; count: number };

function loadRuns(): DayRuns {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY}:runs`);
    if (!raw) return { day: dayKey(new Date()), count: 0 };
    return JSON.parse(raw) as DayRuns;
  } catch {
    return { day: dayKey(new Date()), count: 0 };
  }
}

function saveRuns(r: DayRuns) {
  try {
    localStorage.setItem(`${STORAGE_KEY}:runs`, JSON.stringify(r));
  } catch {
    /* ignore */
  }
}

type Props = {
  /** Full random roulette + forge (admin). Pass forcePrivate when config says so. */
  onAutoForge: (opts: { forcePrivate: boolean }) => Promise<void>;
  className?: string;
};

/**
 * Admin-only: schedule preferences + catch-up auto forge when you open Companion Forge
 * after the chosen local time, up to `perDay` private companions per calendar day.
 */
export function AdminForgeSchedulePanel({ onAutoForge, className }: Props) {
  const [cfg, setCfg] = useState<AdminForgeScheduleConfig>(() => loadConfig());
  const [runs, setRuns] = useState<DayRuns>(() => loadRuns());
  const [busy, setBusy] = useState(false);
  const [lastTick, setLastTick] = useState(0);

  useEffect(() => {
    const t = window.setInterval(() => setLastTick((x) => x + 1), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const persist = useCallback((next: AdminForgeScheduleConfig) => {
    setCfg(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const todayRuns = useMemo(() => {
    const today = dayKey(new Date());
    if (runs.day !== today) return { day: today, count: 0 };
    return runs;
  }, [runs, lastTick]);

  const scheduledTodayPassed = useMemo(() => {
    const now = new Date();
    const target = new Date(now);
    target.setHours(cfg.hour, cfg.minute, 0, 0);
    return now.getTime() >= target.getTime();
  }, [cfg.hour, cfg.minute, lastTick]);

  const oweRuns = useMemo(() => {
    if (!cfg.enabled) return 0;
    if (!scheduledTodayPassed) return 0;
    const cap = cfg.perDay;
    return Math.max(0, cap - todayRuns.count);
  }, [cfg.enabled, cfg.perDay, scheduledTodayPassed, todayRuns.count]);

  const manualRun = async () => {
    setBusy(true);
    try {
      await onAutoForge({ forcePrivate: cfg.privateByDefault });
      const today = dayKey(new Date());
      const prev = loadRuns();
      const base = prev.day === today ? prev.count : 0;
      const next: DayRuns = { day: today, count: base + 1 };
      saveRuns(next);
      setRuns(next);
      toast.success("Rite queued — watch the forge log, then the Hall of cards.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "The scheduled rite refused to start.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details
      className={cn(
        "group rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-950/40 via-black/50 to-black/40 overflow-hidden [&_summary::-webkit-details-marker]:hidden",
        className,
      )}
    >
      <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 hover:bg-violet-950/25">
        <div className="flex items-center gap-2 text-sm font-bold text-violet-200 min-w-0">
          <CalendarClock className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="truncate">Veil-timed random rites</span>
          {cfg.enabled ? (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/90 shrink-0">· on</span>
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">· off</span>
          )}
        </div>
        <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 space-y-3 border-t border-violet-500/20 pt-3">
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        After your chosen hour, the forge may spin random roulette binds up to your daily cap. Use the rune below
        (or &quot;Summon a random companion&quot;) — new cards stay <strong className="text-foreground/90">veiled</strong> until you lift them in the Hall of cards.
      </p>
      <label className="flex items-center gap-2 text-xs cursor-pointer">
        <input
          type="checkbox"
          checked={cfg.enabled}
          onChange={(e) => persist({ ...cfg, enabled: e.target.checked })}
          className="rounded border-violet-500/50"
        />
        Enable veil clock
      </label>
      <div className="flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-[10px] uppercase text-muted-foreground block mb-1">Bindings / day (max)</label>
          <select
            value={cfg.perDay}
            onChange={(e) => persist({ ...cfg, perDay: Number(e.target.value) === 2 ? 2 : 1 })}
            className="rounded-lg bg-background border border-border px-2 py-1.5 text-sm"
          >
            <option value={1}>1 card / day</option>
            <option value={2}>2 cards / day</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase text-muted-foreground block mb-1">After (local time)</label>
          <div className="flex gap-1 items-center">
            <input
              type="number"
              min={0}
              max={23}
              value={cfg.hour}
              onChange={(e) => persist({ ...cfg, hour: Math.min(23, Math.max(0, Number(e.target.value) || 0)) })}
              className="w-14 rounded-lg bg-background border border-border px-2 py-1.5 text-sm"
            />
            <span className="text-muted-foreground">:</span>
            <input
              type="number"
              min={0}
              max={59}
              value={cfg.minute}
              onChange={(e) => persist({ ...cfg, minute: Math.min(59, Math.max(0, Number(e.target.value) || 0)) })}
              className="w-14 rounded-lg bg-background border border-border px-2 py-1.5 text-sm"
            />
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={cfg.privateByDefault}
            onChange={(e) => persist({ ...cfg, privateByDefault: e.target.checked })}
            className="rounded border-violet-500/50"
          />
          Veiled until I lift them
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span>
          Today: {todayRuns.count} / {cfg.perDay} used
          {oweRuns > 0 && cfg.enabled ? ` · ${oweRuns} run(s) still available today (after ${String(cfg.hour).padStart(2, "0")}:${String(cfg.minute).padStart(2, "0")})` : null}
        </span>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void manualRun()}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-400/40 bg-violet-600/20 px-4 py-2 text-sm font-semibold text-violet-100 hover:bg-violet-600/30 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
        Summon a random companion
      </button>
      </div>
    </details>
  );
}
