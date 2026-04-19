import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { CompanionRarity } from "@/lib/companionRarity";
import {
  profileTierSheenGradient,
  profileTierHaloRadius,
  type ProfilePortraitFrameStyle,
  type ProfilePortraitTierHaloVariant,
} from "@/lib/profilePortraitTierHalo";
import { RarityNeonGlowLayers } from "@/components/rarity/RarityNeonGlowLayers";

export type { ProfilePortraitTierHaloVariant };

type Props = {
  rarity: CompanionRarity;
  isAbyssal: boolean;
  gradientFrom: string;
  gradientTo: string;
  children: ReactNode;
  /**
   * `profile` — entrance pop + rotating sheen (CompanionProfile only).
   * `card` — same tier visuals, static sheen (gallery, vault, Discover, Nexus, Hero).
   * `compact` — static sheen, tighter radius (Forge live preview).
   */
  variant?: ProfilePortraitTierHaloVariant;
  /** List/grid cards: one rarity border + soft glow (ignored for `variant="profile"`). */
  frameStyle?: ProfilePortraitFrameStyle;
  /** Pulsing outer neon (Companion profile hero + optional chat avatar). */
  neonEdgeBreathing?: boolean;
  className?: string;
};

/**
 * Tier halo shell: animated on `profile`, static sheen on `card` / `compact`.
 */
export function ProfilePortraitTierHalo({
  rarity,
  isAbyssal,
  gradientFrom,
  gradientTo,
  children,
  variant = "profile",
  frameStyle = "full",
  neonEdgeBreathing = false,
  className,
}: Props) {
  const sheen = profileTierSheenGradient(rarity);
  const r = profileTierHaloRadius(variant, frameStyle);
  const isProfile = variant === "profile";
  const isCleanCard = frameStyle === "clean" && !isProfile;
  const gradientOpacity = isProfile ? "opacity-[0.52]" : isCleanCard ? "opacity-[0.48]" : "opacity-[0.62]";

  return (
    <div className={cn("relative isolate", r.outer, className)}>
      <RarityNeonGlowLayers
        rarity={rarity}
        variant={variant}
        profileBreathing={neonEdgeBreathing}
        roundClass={r.outer}
      />
      <div
        className={cn(
          "relative z-[1] overflow-hidden isolate",
          r.outer,
          isProfile &&
            "shadow-[0_2px_16px_rgba(0,0,0,0.28)] motion-reduce:animate-none animate-[profile-tier-pop_1.15s_cubic-bezier(0.22,1,0.36,1)_both]",
          !isProfile && isCleanCard && "shadow-[0_6px_28px_rgba(0,0,0,0.26)]",
          !isProfile && !isCleanCard && "shadow-[0_12px_32px_rgba(0,0,0,0.38)]",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[165%] -translate-x-1/2 -translate-y-1/2 mix-blend-screen",
            isProfile
              ? "opacity-[0.2]"
              : cn(
                  "motion-reduce:opacity-40",
                  rarity === "common" && "opacity-[0.38]",
                  rarity === "rare" && "opacity-[0.52]",
                  (rarity === "epic" || rarity === "legendary" || rarity === "mythic") && "opacity-[0.68]",
                  rarity === "abyssal" && "opacity-[0.78]",
                ),
          )}
        >
          <div className="h-full w-full" style={{ background: sheen, transform: "rotate(42deg)" }} />
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-0 z-[0]",
            gradientOpacity,
            isAbyssal
              ? "bg-gradient-to-br from-[#ff2d7b]/45 via-fuchsia-600/35 to-[#00ffd4]/28"
              : "",
          )}
          style={
            isAbyssal
              ? undefined
              : {
                  background: `linear-gradient(135deg, ${gradientFrom}55, ${gradientTo}44)`,
                }
          }
        />
        {!isCleanCard && r.ring ? (
          <div
            className={cn(
              "pointer-events-none absolute inset-0 z-[1] border-black/35",
              r.mask,
              r.ring,
            )}
            aria-hidden
          />
        ) : null}
        <div className={cn("relative z-[2] min-h-0 overflow-hidden", r.gutter, r.inner)}>{children}</div>
      </div>
    </div>
  );
}
