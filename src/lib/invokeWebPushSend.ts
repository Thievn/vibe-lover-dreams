import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type WebPushSendPayload = {
  title: string;
  body?: string;
  url: string;
  tag?: string;
  icon?: string;
};

export async function invokeWebPushSend(
  payload: WebPushSendPayload,
): Promise<{ ok: true; sent: number; failures?: string[] } | { ok: false; error: string; sent?: number }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { ok: false, error: "Missing Supabase URL or anon key" };
  }

  const url = `${base}/functions/v1/web-push-send`;

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
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
  let parsed: { ok?: boolean; sent?: number; error?: string; failures?: string[] } = {};
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return { ok: false, error: text || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    return { ok: false, error: parsed.error || `HTTP ${res.status}`, sent: parsed.sent };
  }
  return { ok: true, sent: typeof parsed.sent === "number" ? parsed.sent : 0, failures: parsed.failures };
}
