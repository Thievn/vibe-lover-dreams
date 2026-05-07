import { Percent } from "lucide-react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { companionForgeRarityDropRows } from "@/lib/companionForgeRarityOdds";
import { rarityDisplayLabel, rarityTierCaptionColor } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

const forgeOddsRows = companionForgeRarityDropRows();

type Props = {
  className?: string;
  /** Slightly larger trigger for the main forge title row. */
  size?: "default" | "title";
  /** Admin lab uses a chosen tier; public forge rolls on seal. */
  forgeMode?: "user" | "admin";
};

/**
 * Same Percent control pattern as The Nexus — hover (or tap on touch) shows official forge drop rates.
 */
export function CompanionForgeRarityOddsButton({ className, size = "default", forgeMode = "user" }: Props) {
  const isTitle = size === "title";
  const blurb =
    forgeMode === "admin"
      ? "Player-facing table — each public seal rolls independently. Lab preview follows the tier you select."
      : "One roll when you seal the companion — not during live preview.";
  return (
    <HoverCard openDelay={100} closeDelay={150}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className={cn(
            "shrink-0 inline-flex items-center justify-center rounded-xl border border-violet-500/35 bg-gradient-to-br from-violet-950/70 to-black/60 text-violet-100/90",
            "shadow-[0_0_18px_rgba(139,92,246,0.28),0_0_28px_rgba(255,45,123,0.12)]",
            "hover:border-fuchsia-400/50 hover:text-white hover:shadow-[0_0_22px_rgba(167,139,250,0.38),0_0_36px_rgba(255,45,123,0.16)] transition-colors motion-safe:transition-shadow",
            isTitle ? "h-10 w-10 sm:h-11 sm:w-11" : "h-9 w-9",
            className,
          )}
          title="Companion Forge rarity odds"
          aria-label="Open Companion Forge rarity drop rates"
        >
          <Percent className={cn(isTitle ? "h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" : "h-4 w-4")} strokeWidth={2.25} />
        </button>
      </HoverCardTrigger>
      <HoverCardContent
        side="bottom"
        align="start"
        className="w-[min(calc(100vw-1.5rem),20rem)] border-white/10 bg-zinc-950/95 p-4 text-foreground shadow-[0_0_40px_rgba(0,0,0,0.55)]"
      >
        <p className="font-gothic text-sm tracking-wide text-white">Companion Forge · rarity odds</p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">{blurb}</p>
        <ul className="mt-3 space-y-2 border-t border-white/10 pt-3">
          {forgeOddsRows.map(({ rarity, pct }) => (
            <li key={rarity} className="flex items-center justify-between gap-3 text-xs tabular-nums">
              <span className="font-medium" style={{ color: rarityTierCaptionColor(rarity) }}>
                {rarityDisplayLabel(rarity)}
              </span>
              <span className="text-muted-foreground">{pct}%</span>
            </li>
          ))}
        </ul>
      </HoverCardContent>
    </HoverCard>
  );
}
