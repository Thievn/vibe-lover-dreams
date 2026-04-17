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
  /** Profile sheet only — soft bloom + breathe on the vector frame. */
  profilePolish?: boolean;
};

export function RarityBorderOverlay({ rarity, overlayUrl, className, abyssal, profilePolish }: Props) {
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
      {profilePolish ? (
        <img
          src={src}
          alt=""
          className="absolute inset-0 h-full w-full scale-[1.03] object-fill blur-md mix-blend-screen motion-reduce:opacity-0 animate-[profile-border-glow_4s_ease-in-out_infinite]"
        />
      ) : null}
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-fill opacity-[0.92]" />
    </div>
  );
}
