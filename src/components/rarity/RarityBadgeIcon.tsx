import { useId } from "react";
import { Star } from "lucide-react";
import type { CompanionRarity } from "@/lib/companionRarity";
import { RARITY_NEON, rarityBadgeStarFill, rarityBadgeStarGlowFilter } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

type Props = {
  rarity: CompanionRarity;
  className?: string;
};

/** Filled tier star with rarity-colored glow (profile + cards). */
export function RarityBadgeIcon({ rarity, className }: Props) {
  const gid = useId();
  const glow = rarityBadgeStarGlowFilter(rarity);
  const baseWrap = "inline-flex shrink-0 items-center justify-center";

  if (rarity === "abyssal") {
    const { from, to } = RARITY_NEON.abyssal;
    return (
      <span className={cn(baseWrap, className)} style={{ filter: glow }} aria-hidden>
        <svg viewBox="0 0 24 24" className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]" role="img">
          <defs>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={from} />
              <stop offset="100%" stopColor={to} />
            </linearGradient>
          </defs>
          <path
            fill={`url(#${gid})`}
            d="M12 2.35l2.38 5.82 6.3.46-4.82 3.5 1.84 6.04L12 15.9l-5.68 3.27 1.84-6.04-4.82-3.5 6.3-.46L12 2.35z"
          />
        </svg>
      </span>
    );
  }

  const fill = rarityBadgeStarFill(rarity);

  return (
    <span className={cn(baseWrap, className)} style={{ filter: glow }} aria-hidden>
      <Star
        className="h-[1.05rem] w-[1.05rem] sm:h-[1.15rem] sm:w-[1.15rem]"
        fill={fill}
        stroke={fill}
        strokeWidth={0.35}
        strokeLinejoin="round"
        absoluteStrokeWidth
      />
    </span>
  );
}
