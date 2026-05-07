import { isLustforgeAdminUser } from "./requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** When true, non-admin authenticated users cannot use credit-bearing APIs (mirror `VITE_PUBLIC_COMPANION_PROFILE_TEASER`). */
export function isPublicApiTeaserModeEnabled(): boolean {
  const v = (Deno.env.get("PUBLIC_API_TEASER_MODE") ?? "").trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * If teaser mode is on and the user is not a platform admin, return a 403 JSON response; otherwise null.
 */
export async function publicApiTeaserGuardResponse(user: {
  id: string;
  email?: string | null;
}): Promise<Response | null> {
  if (!isPublicApiTeaserModeEnabled()) return null;
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
