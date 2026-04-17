import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import type { CompanionRarity } from "@/lib/companionRarity";
import {
  profileTierSheenGradient,
  PROFILE_TIER_HALO_RADIUS,
  type ProfilePortraitTierHaloVariant,
} from "@/lib/profilePortraitTierHalo";

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
  className,
}: Props) {
  const sheen = profileTierSheenGradient(rarity);
  const r = PROFILE_TIER_HALO_RADIUS[variant];
  const isProfile = variant === "profile";
  const gradientOpacity = isProfile ? "opacity-70" : "opacity-[0.62]";

  return (
    <div
      className={cn(
        "relative overflow-hidden isolate",
        r.outer,
        isProfile && "animate-[profile-tier-pop_1.15s_cubic-bezier(0.22,1,0.36,1)_both]",
        isAbyssal
          ? isProfile
            ? "shadow-[0_0_60px_rgba(255,45,123,0.35),0_0_100px_rgba(168,85,247,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "shadow-[0_0_28px_rgba(255,45,123,0.22),0_0_48px_rgba(168,85,247,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
          : isProfile
            ? "shadow-[0_0_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.05)]"
            : "shadow-[0_12px_32px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[165%] -translate-x-1/2 -translate-y-1/2 mix-blend-screen motion-reduce:opacity-40",
          rarity === "common" && "opacity-[0.38]",
          rarity === "rare" && "opacity-[0.52]",
          (rarity === "epic" || rarity === "legendary" || rarity === "mythic") && "opacity-[0.68]",
          rarity === "abyssal" && "opacity-[0.78]",
        )}
      >
        <div
          className={cn(
            "h-full w-full",
            isProfile ? "motion-reduce:animate-none animate-[profile-tier-sheen-spin_16s_linear_infinite]" : "",
          )}
          style={
            isProfile
              ? { background: sheen }
              : { background: sheen, transform: "rotate(42deg)" }
          }
        />
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
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-[1] border-black/35",
          r.mask,
          r.ring,
        )}
        aria-hidden
      />
      <div className={cn("relative z-[2] min-h-0 overflow-hidden", r.gutter, r.inner)}>{children}</div>
    </div>
  );
}
