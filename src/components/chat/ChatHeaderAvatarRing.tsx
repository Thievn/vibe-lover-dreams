import type { CompanionRarity } from "@/lib/companionRarity";
import { RARITY_NEON } from "@/lib/companionRarity";
import { cn } from "@/lib/utils";

function tierRingColors(rarity: CompanionRarity): { a: string; b: string } {
  switch (rarity) {
    case "common":
      return { a: RARITY_NEON.common.outline, b: RARITY_NEON.common.core };
    case "rare":
      return { a: RARITY_NEON.rare.from, b: RARITY_NEON.rare.to };
    case "epic":
      return { a: RARITY_NEON.epic.from, b: RARITY_NEON.epic.to };
    case "legendary":
      return { a: RARITY_NEON.legendary.from, b: RARITY_NEON.legendary.to };
    case "mythic":
      return { a: RARITY_NEON.mythic.from, b: RARITY_NEON.mythic.to };
    case "abyssal":
    default:
      return { a: RARITY_NEON.abyssal.from, b: RARITY_NEON.abyssal.to };
  }
}

type Props = {
  rarity: CompanionRarity;
  className?: string;
  children: React.ReactNode;
};

/**
 * Circular rarity-colored glitch rings for the chat header avatar (matches profile tier energy).
 */
export function ChatHeaderAvatarRing({ rarity, className, children }: Props) {
  const isAbyssal = rarity === "abyssal";
  const { a, b } = tierRingColors(rarity);

  if (isAbyssal) {
    return (
      <div
        className={cn(
          "relative isolate rounded-full bg-gradient-to-br from-[#ff2d7b] via-fuchsia-500 to-[#00ffd4] p-[2.5px] motion-reduce:animate-none",
          "animate-[rarity-border-glitch-a_2.85s_steps(10,end)_infinite] will-change-transform",
          className,
        )}
      >
        <div className="h-full w-full overflow-hidden rounded-full bg-[hsl(280_30%_5%)]">{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("relative isolate rounded-full", className)}>
      <div
        className="pointer-events-none absolute -inset-[2px] z-0 rounded-full border-2 motion-reduce:opacity-55 opacity-75 motion-reduce:animate-none animate-[rarity-border-glitch-a_2.85s_steps(10,end)_infinite] will-change-transform mix-blend-screen"
        style={{ borderColor: `${a}cc` }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -inset-[2px] z-0 rounded-full border-2 motion-reduce:opacity-45 opacity-60 motion-reduce:animate-none animate-[rarity-border-glitch-b_3.1s_steps(10,end)_infinite] will-change-transform mix-blend-screen"
        style={{ borderColor: `${b}aa` }}
        aria-hidden
      />
      <div className="relative z-[1] h-full w-full overflow-hidden rounded-full">{children}</div>
    </div>
  );
}
