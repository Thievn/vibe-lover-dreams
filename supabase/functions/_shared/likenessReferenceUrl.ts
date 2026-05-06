/**
 * Normalize portrait URLs for xAI Imagine **edits** (must be fetchable **https**).
 * Keep behavior aligned with `src/lib/companionMedia.ts` (`stablePortraitDisplayUrl` + site origin).
 */
import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function normalizeLikenessReferenceForXai(raw: string, publicSiteOrigin: string): string {
  let u = raw.trim();
  if (!u) return "";
  if (u.startsWith("/") && !u.startsWith("//")) {
    u = `${publicSiteOrigin.replace(/\/$/, "")}${u}`;
  }
  const signMatch = u.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signMatch) {
    const [, origin, bucket, pathPart] = signMatch;
    u = `${origin}/storage/v1/object/public/${bucket}/${pathPart}`;
  }
  if (u.includes("/object/public/")) {
    u = (u.split("?")[0] ?? u).trim();
  } else if (u.startsWith("https://")) {
    u = (u.split("?")[0] ?? u).trim();
  }
  if (!u.startsWith("https://")) return "";
  return u;
}

/**
 * Load a still portrait URL when the client omitted `likeness_reference_image_url` or sent a relative path only.
 * Service role bypasses RLS; scoped by `user_id` for forged rows.
 */
export async function resolveCompanionLikenessUrlFromDb(
  supabase: SupabaseClient,
  userId: string,
  companionId: string,
): Promise<string> {
  const cid = companionId.trim();
  if (!cid || cid === "forge-preview") return "";

  const { data: ov } = await supabase
    .from("user_companion_portrait_overrides")
    .select("portrait_url")
    .eq("user_id", userId)
    .eq("companion_id", cid)
    .maybeSingle();
  const ovUrl = String(ov?.portrait_url ?? "").trim();
  if (ovUrl) return ovUrl;

  if (cid.toLowerCase().startsWith("cc-")) {
    const uuid = cid.slice(3).trim();
    if (!uuid) return "";
    const { data: row } = await supabase
      .from("custom_characters")
      .select("static_image_url, image_url")
      .eq("id", uuid)
      .eq("user_id", userId)
      .maybeSingle();
    return String(row?.static_image_url ?? row?.image_url ?? "").trim();
  }

  const { data: stock } = await supabase
    .from("companions")
    .select("static_image_url, image_url")
    .eq("id", cid)
    .maybeSingle();
  return String(stock?.static_image_url ?? stock?.image_url ?? "").trim();
}
