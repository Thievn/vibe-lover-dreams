/**
 * Pre-launch: companion profiles are read-only for non–platform-admins (client flag; often paired with Edge
 * `PUBLIC_API_TEASER_MODE` for ops docs). Chat / generation for signed-in users are **not** blocked by that Edge
 * flag unless you also set `PUBLIC_API_TEASER_BLOCK_LOGGED_IN=true`.
 * Set `VITE_PUBLIC_COMPANION_PROFILE_TEASER=true` in the client env when you want profile teaser UX.
 */
export function isCompanionProfileTeaserMode(): boolean {
  const raw = (import.meta.env.VITE_PUBLIC_COMPANION_PROFILE_TEASER as string | undefined)?.trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}
