import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type GenerateImageResponse = {
  success?: boolean;
  imageUrl?: string;
  imageId?: string | null;
  error?: string;
};

function parseErrorMessage(status: number, text: string): string {
  try {
    const j = JSON.parse(text) as { error?: string; message?: string; msg?: string };
    return (j.error || j.message || j.msg || text).trim() || `HTTP ${status}`;
  } catch {
    return text.trim() || `HTTP ${status}`;
  }
}

/**
 * Calls `generate-image` with plain fetch so Authorization is exactly one Bearer token.
 * The shared Supabase fetch wrapper skips injecting a fresh JWT if `Authorization` is already
 * set (e.g. from a stale `invoke` header); this path avoids that class of "Invalid JWT" bugs.
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

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify(body),
    });

  await supabase.auth.refreshSession();
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  // generate-image rejects Bearer=anon (must be a user JWT that matches body.userId).
  if (!bearer) {
    return { data: null, error: new Error("Sign in again — image generation needs an active session.") };
  }

  let res = await post(bearer);
  if (!res.ok) {
    const t = await res.clone().text();
    const msg = parseErrorMessage(res.status, t);
    if (res.status === 401 || /invalid\s+jwt/i.test(msg)) {
      await supabase.auth.refreshSession();
      const t2 = (await supabase.auth.getSession()).data.session?.access_token;
      if (t2) {
        res = await post(t2);
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
