import { isLustforgeAdminUser } from "./requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Legacy flag — kept for dashboards / docs parity with `VITE_PUBLIC_COMPANION_PROFILE_TEASER`. */
export function isPublicApiTeaserModeEnabled(): boolean {
  const v = (Deno.env.get("PUBLIC_API_TEASER_MODE") ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * Optional hard lock: when both teaser mode and this are true, non-admin **signed-in** users still
 * cannot hit credit-bearing Edge functions (original pre-launch behavior).
 * `PUBLIC_API_TEASER_MODE` alone no longer blocks chat / generation — authenticated accounts use
 * daily quota + FC; unset `PUBLIC_API_TEASER_BLOCK_LOGGED_IN` unless you need full API silence.
 */
export function isPublicApiTeaserBlockLoggedInEnabled(): boolean {
  const v = (Deno.env.get("PUBLIC_API_TEASER_BLOCK_LOGGED_IN") ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * When strict teaser lock is on and the user is not a platform admin, return 403; otherwise null.
 */
export async function publicApiTeaserGuardResponse(user: {
  id: string;
  email?: string | null;
}): Promise<Response | null> {
  if (!isPublicApiTeaserModeEnabled() || !isPublicApiTeaserBlockLoggedInEnabled()) return null;
  if (await isLustforgeAdminUser(user)) return null;
  return new Response(
    JSON.stringify({
      success: false,
      error: "LustForge is in preview — chat and generation unlock at launch.",
      code: "PUBLIC_TEASER_MODE",
    }),
    { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
}
