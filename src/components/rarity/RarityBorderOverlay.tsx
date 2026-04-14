import { cn } from "@/lib/utils";
import type { CompanionRarity } from "@/lib/companionRarity";
import { defaultRarityBorderPath } from "@/lib/companionRarity";

type Props = {
  rarity: CompanionRarity;
  /** Optional PNG/SVG URL from DB — replaces default frame asset. */
  overlayUrl?: string | null;
  className?: string;
  /** Extra wrapper class for Abyssal outer glow. */
  abyssal?: boolean;
};

export function RarityBorderOverlay({ rarity, overlayUrl, className, abyssal }: Props) {
  const src = (overlayUrl && overlayUrl.trim()) || defaultRarityBorderPath(rarity);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[2] rounded-[inherit]",
        abyssal && "animate-[abyssal-pulse_3.2s_ease-in-out_infinite]",
        className,
      )}
      aria-hidden
    >
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-fill opacity-[0.92]" />
    </div>
  );
}
