import type { LucideIcon } from "lucide-react";
import {
  Crown,
  Flame,
  Sprout,
  Heart,
  Link2,
  Moon,
  Sparkles,
  Zap,
} from "lucide-react";
import type { TcgStatBlock, TcgStatKey } from "@/lib/tcgStats";
import { TCG_STAT_DESCRIPTIONS, TCG_STAT_LABELS, tcgStatEntries } from "@/lib/tcgStats";
import { cn } from "@/lib/utils";

const ICONS: Record<TcgStatKey, LucideIcon> = {
  seduction: Heart,
  passion: Flame,
  fertility: Sprout,
  synergy: Link2,
  dominance: Crown,
  mystique: Moon,
  wildness: Zap,
  devotion: Sparkles,
};

export function tcgStatIcon(key: TcgStatKey): LucideIcon {
  return ICONS[key] ?? Sparkles;
}

/** Bottom-right strip on mini cards — subtle icons + values. */
export function TcgMicroStrip({
  stats,
  className,
}: {
  stats: TcgStatBlock | null | undefined;
  className?: string;
}) {
  const entries = tcgStatEntries(stats);
  if (entries.length === 0) return null;
  return (
    <div
      className={cn(
        "absolute right-1.5 bottom-10 z-[2] flex flex-col items-end gap-0.5 rounded-lg bg-black/55 px-1 py-1 border border-white/[0.06] backdrop-blur-sm",
        className,
      )}
    >
      {entries.map(({ key, value }) => {
        const Icon = tcgStatIcon(key);
        return (
          <div key={key} className="flex items-center gap-0.5 text-[9px] font-semibold tabular-nums text-white/85">
            <Icon className="h-2.5 w-2.5 shrink-0 opacity-75 text-primary/90" />
            <span>{value}%</span>
          </div>
        );
      })}
    </div>
  );
}

/** Full profile panel with labels + descriptions. */
export function TcgProfilePanel({ stats }: { stats: TcgStatBlock | null | undefined }) {
  const entries = tcgStatEntries(stats);
  if (entries.length === 0) return null;
  return (
    <section className="rounded-[1.35rem] border border-primary/20 bg-gradient-to-br from-black/50 via-[hsl(280_22%_8%)]/90 to-black/45 p-5 sm:p-7 shadow-[0_0_40px_rgba(255,45,123,0.06)] ring-1 ring-white/[0.05] backdrop-blur-xl">
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/75 mb-1">Signature deck</p>
      <h2 className="font-gothic text-2xl sm:text-3xl font-bold text-foreground mb-2">Ascendant stats</h2>
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl leading-relaxed">
        Four threads define how they move through desire, tension, and devotion. Nexus compatibility leans on{" "}
        <span className="text-primary/90">Fertility</span> and <span className="text-primary/90">Synergy</span> when
        both parents carry those keys.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(({ key, value }) => {
          const Icon = tcgStatIcon(key);
          const label = TCG_STAT_LABELS[key];
          const desc = TCG_STAT_DESCRIPTIONS[key];
          return (
            <div
              key={key}
              className="rounded-xl border border-white/[0.08] bg-black/35 px-4 py-3 flex gap-3 items-start"
            >
              <div className="mt-0.5 rounded-lg bg-primary/15 p-2 border border-primary/25">
                <Icon className="h-4 w-4 text-primary shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-foreground">{label}</span>
                  <span className="font-gothic text-xl tabular-nums text-primary">{value}%</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{desc}</p>
                <div className="mt-2 h-1 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                    style={{ width: `${value}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
