import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type GenerateImageResponse = {
  success?: boolean;
  /** Signed or best URL for immediate image display (may expire). */
  imageUrl?: string;
  /** Canonical storage public URL — persist this in DB / forge rows. */
  publicImageUrl?: string;
  /** Present when a short loop was requested. */
  videoUrl?: string;
  imageId?: string | null;
  error?: string;
  code?: string;
  tokensRefunded?: boolean;
  tokensDeducted?: number;
  newTokensBalance?: number;
};

function parseErrorMessage(status: number, text: string): string {
  try {
    const j = JSON.parse(text) as {
      error?: string;
      message?: string;
      msg?: string;
      tokensRefunded?: boolean;
    };
    const base = (j.error || j.message || j.msg || text).trim() || `HTTP ${status}`;
    if (j.tokensRefunded) {
      return `${base} (forge credits were refunded.)`;
    }
    return base;
  } catch {
    return text.trim() || `HTTP ${status}`;
  }
}

/**
 * Calls `generate-image` (Grok Imagine stills + Grok rewriter) with plain fetch so Authorization is exactly one Bearer token.
 * The shared Supabase fetch wrapper skips injecting a fresh JWT if `Authorization` is already
 * set (e.g. from a stale `invoke` header); this path avoids that class of "Invalid JWT" bugs.
 *
 * Optional `tokenCost` in the body: server deducts that many forge credits up front and refunds on failure.
 */
export async function invokeGenerateImage(
  body: Record<string, unknown>,
): Promise<{ data: GenerateImageResponse; error: null } | { data: null; error: Error }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const url = `${base}/functions/v1/generate-image`;

  /** FLUX + rewriter can exceed 60s; cap wait so forge UI does not spin forever on hung gateways. */
  const IMAGE_GEN_TIMEOUT_MS = 240_000;
  const post = (bearer: string, signal?: AbortSignal) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify(body),
      signal,
    });

  const SESSION_REFRESH_MS = 25_000;
  try {
    await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<never>((_, reject) => {
        globalThis.setTimeout(
          () =>
            reject(
              new Error(
                `Session refresh timed out after ${SESSION_REFRESH_MS / 1000}s — sign out and back in, then retry image generation.`,
              ),
            ),
          SESSION_REFRESH_MS,
        );
      }),
    ]);
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { data: null, error: new Error("Sign in again — image generation needs an active session.") };
  }

  const runFetch = async (token: string) => {
    const controller = new AbortController();
    const tid = globalThis.setTimeout(() => controller.abort(), IMAGE_GEN_TIMEOUT_MS);
    try {
      return await post(token, controller.signal);
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        throw new Error(
          `Image generation timed out after ${IMAGE_GEN_TIMEOUT_MS / 1000}s (generate-image). ` +
            `Check TOGETHER_API_KEY, Edge function logs, and network.`,
        );
      }
      throw e;
    } finally {
      globalThis.clearTimeout(tid);
    }
  };

  let res: Response;
  try {
    res = await runFetch(bearer);
  } catch (e: unknown) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }

  if (!res.ok) {
    const t = await res.clone().text();
    const msg = parseErrorMessage(res.status, t);
    if (res.status === 401 || /invalid\s+jwt/i.test(msg)) {
      await supabase.auth.refreshSession();
      const t2 = (await supabase.auth.getSession()).data.session?.access_token;
      if (t2) {
        try {
          res = await runFetch(t2);
        } catch (e: unknown) {
          return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
        }
      }
    }
  }

  if (!res.ok) {
    const t = await res.text();
    return { data: null, error: new Error(parseErrorMessage(res.status, t)) };
  }

  const data = (await res.json()) as GenerateImageResponse;
  return { data, error: null };
}
