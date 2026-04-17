import type { CompanionRarity } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

type Props = {
  rarity: CompanionRarity;
  className?: string;
};

/** Distinct crest-style marks per tier (not generic sparkles). */
export function RarityBadgeIcon({ rarity, className }: Props) {
  const base = "h-[15px] w-[15px] shrink-0";

  switch (rarity) {
    case "common":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3.5 16.2 8.1 22 9.3 18 13.4 18.8 19.2 12 16.8 5.2 19.2 6 13.4 2 9.3 7.8 8.1Z"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinejoin="round"
            opacity={0.95}
          />
          <circle cx="12" cy="11.8" r="2.1" fill="currentColor" opacity={0.35} />
        </svg>
      );
    case "rare":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 2.5 17.5 8.2 15.8 15.5 8.2 15.5 6.5 8.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
          <path
            d="M12 5.2 15.1 9.1 14 13.4 10 13.4 8.9 9.1Z"
            stroke="currentColor"
            strokeWidth="1.05"
            strokeLinejoin="round"
            opacity={0.55}
          />
        </svg>
      );
    case "epic":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2.2v3.2M12 18.6v3.2M3.8 12h3.2M17 12h3.2M6.1 6.1l2.3 2.3M15.6 15.6l2.3 2.3M6.1 17.9l2.3-2.3M15.6 8.4l2.3-2.3"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={0.85}
          />
          <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="12" cy="12" r="1.35" fill="currentColor" opacity={0.45} />
        </svg>
      );
    case "legendary":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 3.2l1.4 3.1 3.4.4-2.5 2.4.7 3.4L12 14l-3 1.5.7-3.4-2.5-2.4 3.4-.4Z"
            stroke="currentColor"
            strokeWidth="1.15"
            strokeLinejoin="round"
          />
          <path d="M8.2 18.4h7.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity={0.55} />
          <path d="M9.4 20.2h5.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={0.4} />
        </svg>
      );
    case "mythic":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 20.2c-2.2-2.8-5.5-7.8-5.5-11.4a5.5 5.5 0 1111 0c0 3.6-3.3 8.6-5.5 11.4Z"
            stroke="currentColor"
            strokeWidth="1.25"
            strokeLinejoin="round"
          />
          <path
            d="M12 8.9c1.1 1.4 1.8 3.1 1.8 4.9 0 1.1-.2 2.1-.6 3.1"
            stroke="currentColor"
            strokeWidth="1.05"
            strokeLinecap="round"
            opacity={0.5}
          />
        </svg>
      );
    case "abyssal":
      return (
        <svg className={cn(base, className)} viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="8.2" stroke="currentColor" strokeWidth="1.05" opacity={0.35} />
          <circle cx="12" cy="12" r="5.4" stroke="currentColor" strokeWidth="1.15" opacity={0.65} />
          <circle cx="12" cy="12" r="2.35" fill="currentColor" opacity={0.85} />
          <path d="M12 3.6v2.2M12 18.2v2.2M3.6 12h2.2M18.2 12h2.2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity={0.45} />
        </svg>
      );
    default:
      return null;
  }
}
