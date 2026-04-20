import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export async function invokeGrokVoiceClientSecret(): Promise<
  { value: string; expires_at: number | null } | { error: string }
> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { error: "Missing Supabase URL or anon key" };
  }

  const url = `${base}/functions/v1/grok-voice-client-secret`;

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

  await supabase.auth.refreshSession();
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { error: "Sign in again to use live voice." };
  }

  let res = await post(bearer);
  if (!res.ok && res.status === 401) {
    await supabase.auth.refreshSession();
    const t2 = (await supabase.auth.getSession()).data.session?.access_token;
    if (t2) res = await post(t2);
  }

  const text = await res.text();
  let parsed: { value?: string; expires_at?: number; error?: string } = {};
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return { error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    return { error: parsed.error || `HTTP ${res.status}` };
  }
  if (!parsed.value) {
    return { error: parsed.error || "No voice token returned" };
  }

  return { value: parsed.value, expires_at: parsed.expires_at ?? null };
}
