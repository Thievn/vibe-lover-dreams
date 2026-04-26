import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { parseLiveCallOptionsPayload } from "@/lib/liveCallTypes";

const CACHE_PREFIX = "live-call-options:";
const CACHE_TTL_MS = 45 * 60 * 1000;

type CacheEntry = { at: number; options: LiveCallOption[] };

function cacheKey(companionId: string): string {
  return `${CACHE_PREFIX}${companionId}`;
}

export function readLiveCallOptionsSessionCache(companionId: string): LiveCallOption[] | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(companionId));
    if (!raw) return null;
    const j = JSON.parse(raw) as CacheEntry;
    if (!j || typeof j.at !== "number" || !Array.isArray(j.options)) return null;
    if (Date.now() - j.at > CACHE_TTL_MS) {
      sessionStorage.removeItem(cacheKey(companionId));
      return null;
    }
    return j.options;
  } catch {
    return null;
  }
}

function writeCache(companionId: string, options: LiveCallOption[]): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    const payload: CacheEntry = { at: Date.now(), options };
    sessionStorage.setItem(cacheKey(companionId), JSON.stringify(payload));
  } catch {
    /* quota */
  }
}

export type GenerateLiveCallOptionsResult =
  | { ok: true; options: LiveCallOption[]; source: "network" | "cache" }
  | { ok: false; error: string };

/**
 * Calls `generate-live-call-options` with session JWT (same pattern as `invokeGenerateImage`).
 */
export async function invokeGenerateLiveCallOptions(
  companionId: string,
  opts?: { skipCache?: boolean },
): Promise<GenerateLiveCallOptionsResult> {
  if (!opts?.skipCache) {
    const hit = readLiveCallOptionsSessionCache(companionId);
    if (hit?.length) return { ok: true, options: hit, source: "cache" };
  }

  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { ok: false, error: "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY" };
  }

  const url = `${base}/functions/v1/generate-live-call-options`;

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify({ companionId }),
    });

  await supabase.auth.refreshSession();
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { ok: false, error: "Sign in required" };
  }

  let res = await post(bearer);
  if (!res.ok && res.status === 401) {
    await supabase.auth.refreshSession();
    const t2 = (await supabase.auth.getSession()).data.session?.access_token;
    if (t2) res = await post(t2);
  }

  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: text.trim() || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    const err =
      (json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : null) || text.trim() || `HTTP ${res.status}`;
    return { ok: false, error: err };
  }

  const options = parseLiveCallOptionsPayload(json);
  if (!options?.length) {
    return { ok: false, error: "Invalid options payload" };
  }

  writeCache(companionId, options);
  return { ok: true, options, source: "network" };
}
