import type { VibeDisplayTrait } from "@/lib/vibeTraitCatalog";
import { vibeTraitIcon } from "@/lib/vibeTraitIcons";
import { cn } from "@/lib/utils";

type Props = {
  traits: VibeDisplayTrait[];
  isNexus?: boolean;
};

/**
 * Full profile "Traits" section: replaces the old four ASC stat blocks.
 */
export function VibeTraitProfilePanel({ traits, isNexus }: Props) {
  if (!traits.length) return null;
  return (
    <section
      className={cn(
        "rounded-[1.35rem] border p-5 sm:p-7 shadow-[0_0_40px_rgba(255,45,123,0.06)] ring-1 ring-white/[0.05] backdrop-blur-xl",
        isNexus
          ? "border-fuchsia-500/25 bg-gradient-to-br from-black/55 via-fuchsia-950/15 to-black/50"
          : "border-primary/20 bg-gradient-to-br from-black/50 via-[hsl(280_22%_8%)]/90 to-black/45",
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary/75">Traits</p>
        {isNexus ? (
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-200/90 px-2.5 py-0.5 rounded-full border border-fuchsia-500/40 bg-fuchsia-950/40">
            Nexus forged
          </span>
        ) : null}
      </div>
      <h2 className="font-gothic text-2xl sm:text-3xl font-bold text-foreground mb-1">Vibe signature</h2>
      <p className="text-xs text-muted-foreground mb-6 max-w-2xl leading-relaxed">
        {isNexus
          ? "Nexus-forged: parents left fingerprints; the veil rolled in spice from the 50. Funny or extreme lines only show up on hybrids from The Nexus."
          : "Fixed vibe lines tied to this card’s rarity (1–6). Only Nexus children roll the full 50 plus the extra Nexus line."}
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {traits.map((t) => {
          const Icon = vibeTraitIcon(t.id);
          return (
            <div
              key={t.id}
              className="group rounded-xl border border-white/[0.08] bg-black/30 px-3.5 py-2.5 flex gap-2.5 items-start hover:border-primary/25 transition-colors"
            >
              <div className="mt-0.5 rounded-lg bg-primary/12 p-1.5 border border-primary/20 group-hover:bg-primary/18">
                <Icon className="h-4 w-4 text-primary shrink-0" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{t.label}</span>
                  <span className="text-[10px] uppercase tracking-wider text-primary/80">{t.word}</span>
                  {t.inherited ? (
                    <span className="text-[9px] text-emerald-400/90 border border-emerald-500/30 rounded px-1.5">Inherited</span>
                  ) : null}
                  {isNexus && t.nexusRoll && !t.inherited ? (
                    <span className="text-[9px] text-fuchsia-300/90 border border-fuchsia-500/30 rounded px-1.5">Nexus</span>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{t.shortDescription}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
