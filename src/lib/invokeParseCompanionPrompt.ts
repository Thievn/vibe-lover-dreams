import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

/** Slightly under typical Edge limits; Grok tool calls can be slow. */
const PARSE_COMPANION_FETCH_TIMEOUT_MS = 170_000;

export type ParseCompanionPromptResult = {
  data: Record<string, unknown> | null;
  error: Error | null;
};

/**
 * Calls `parse-companion-prompt` (Grok / xAI via Edge) with plain `fetch` + a fresh Bearer JWT,
 * matching `invokeGenerateImage` — avoids stale `Authorization` on long-running `invoke()`.
 */
export async function invokeParseCompanionPrompt(
  body: Record<string, unknown>,
): Promise<ParseCompanionPromptResult> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }
  const url = `${base}/functions/v1/parse-companion-prompt`;

  try {
    await Promise.race([
      supabase.auth.refreshSession(),
      new Promise<never>((_, reject) => {
        globalThis.setTimeout(() => reject(new Error("Session refresh timed out — sign in again.")), 25_000);
      }),
    ]);
  } catch (e) {
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  }

  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { data: null, error: new Error("Sign in again — forge tools need an active session.") };
  }

  const controller = new AbortController();
  const tid = globalThis.setTimeout(() => controller.abort(), PARSE_COMPANION_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let json: Record<string, unknown> | null = null;
    try {
      json = JSON.parse(text) as Record<string, unknown>;
    } catch {
      /* leave null */
    }
    if (!res.ok) {
      const fromJson =
        json &&
        (typeof json.error === "string"
          ? json.error
          : typeof json.message === "string"
            ? json.message
            : null);
      const errMsg = (fromJson || text.trim().slice(0, 700) || `HTTP ${res.status}`).trim();
      return { data: null, error: new Error(errMsg) };
    }
    return { data: json, error: null };
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      return {
        data: null,
        error: new Error(
          `parse-companion-prompt timed out after ${PARSE_COMPANION_FETCH_TIMEOUT_MS / 1000}s — check Supabase Edge logs, XAI_API_KEY, and deploy the latest function.`,
        ),
      };
    }
    return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
  } finally {
    globalThis.clearTimeout(tid);
  }
}
