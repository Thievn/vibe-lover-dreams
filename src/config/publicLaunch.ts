/**
 * Pre-launch: companion profiles are read-only for non–platform-admins (paired with Edge `PUBLIC_API_TEASER_MODE`).
 * Set `VITE_PUBLIC_COMPANION_PROFILE_TEASER=true` in the client env; keep in sync with Supabase Edge secret.
 */
export function isCompanionProfileTeaserMode(): boolean {
  const raw = (import.meta.env.VITE_PUBLIC_COMPANION_PROFILE_TEASER as string | undefined)?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
