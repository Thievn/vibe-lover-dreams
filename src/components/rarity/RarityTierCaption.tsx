import type { CompanionRarity } from "@/lib/companionRarity";
import { rarityDisplayLabel, rarityTierCaptionColor } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

type Props = {
  rarity: CompanionRarity;
  className?: string;
};

/** Bottom-left tier label on portrait cards — site Gothic font, tier-colored (Abyssal logo gradient). */
export function RarityTierCaption({ rarity, className }: Props) {
  const label = rarityDisplayLabel(rarity);
  const isAbyssal = rarity === "abyssal";

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-2.5 left-2.5 z-[4] font-gothic text-xs font-semibold uppercase tracking-[0.12em] sm:bottom-3 sm:left-3 sm:text-sm",
        "drop-shadow-[0_2px_12px_rgba(0,0,0,0.95)]",
        className,
      )}
    >
      {isAbyssal ? (
        <span className="gradient-vice-text">{label}</span>
      ) : (
        <span style={{ color: rarityTierCaptionColor(rarity) }}>{label}</span>
      )}
    </div>
  );
}
