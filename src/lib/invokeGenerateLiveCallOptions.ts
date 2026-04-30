import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { parseLiveCallOptionsPayload } from "@/lib/liveCallTypes";

const CACHE_PREFIX = "live-call-options:";
const CACHE_TTL_MS = 45 * 60 * 1000;

const DEFAULT_TIMEOUT_MS = 14_000;
/** Skip `refreshSession()` when access token expires at least this many seconds from now. */
const SESSION_FRESH_BUFFER_SEC = 90;

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

export type InvokeLiveCallOptionsOpts = {
  skipCache?: boolean;
  /** Combined with internal timeout — aborts the request when fired. */
  signal?: AbortSignal;
  /** Max wait for the edge function (default 14s). */
  timeoutMs?: number;
};

async function ensureFreshBearer(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;
  const token = session?.access_token;
  if (!token) return null;

  const exp = session.expires_at;
  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof exp === "number" && exp > nowSec + SESSION_FRESH_BUFFER_SEC) {
    return token;
  }

  await supabase.auth.refreshSession();
  const t2 = (await supabase.auth.getSession()).data.session?.access_token ?? null;
  return t2;
}

/**
 * Calls `generate-live-call-options` with session JWT (same pattern as `invokeGenerateImage`).
 * Uses a bounded timeout and skips redundant `refreshSession()` when the JWT is still fresh.
 */
export async function invokeGenerateLiveCallOptions(
  companionId: string,
  opts?: InvokeLiveCallOptionsOpts,
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
  const timeoutMs = typeof opts?.timeoutMs === "number" && opts.timeoutMs > 0 ? opts.timeoutMs : DEFAULT_TIMEOUT_MS;

  const combined = new AbortController();
  const timer = window.setTimeout(() => combined.abort(), timeoutMs);
  if (opts?.signal) {
    if (opts.signal.aborted) combined.abort();
    else opts.signal.addEventListener("abort", () => combined.abort(), { once: true });
  }

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify({ companionId }),
      signal: combined.signal,
    });

  try {
    const bearer = await ensureFreshBearer();
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
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError" || combined.signal.aborted) {
      return { ok: false, error: "timeout" };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.length > 200 ? `${msg.slice(0, 197)}…` : msg };
  } finally {
    window.clearTimeout(timer);
  }
}
