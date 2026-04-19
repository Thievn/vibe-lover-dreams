import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type GrokSttResponse = {
  text?: string;
  error?: string;
};

/**
 * Streams multipart audio to `grok-stt` (xAI STT). Uses fetch + session JWT like `invokeGenerateImage`.
 */
export async function invokeGrokStt(audio: Blob, fileName = "recording.webm"): Promise<{ text: string } | { error: string }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { error: "Missing Supabase URL or anon key" };
  }

  const url = `${base}/functions/v1/grok-stt`;

  const post = (bearer: string) => {
    const fd = new FormData();
    fd.append("file", audio, fileName);
    return fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: fd,
    });
  };

  await supabase.auth.refreshSession();
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { error: "Sign in again to use voice." };
  }

  let res = await post(bearer);
  if (!res.ok && res.status === 401) {
    await supabase.auth.refreshSession();
    const t2 = (await supabase.auth.getSession()).data.session?.access_token;
    if (t2) res = await post(t2);
  }
  if (!res.ok) {
    const t = await res.text();
    try {
      const j = JSON.parse(t) as { error?: string };
      return { error: j.error || t || `HTTP ${res.status}` };
    } catch {
      return { error: t || `HTTP ${res.status}` };
    }
  }

  const data = (await res.json()) as GrokSttResponse;
  if (data.error) return { error: data.error };
  const text = typeof data.text === "string" ? data.text.trim() : "";
  if (!text) return { error: "No speech detected — try again closer to the mic." };
  return { text };
}
