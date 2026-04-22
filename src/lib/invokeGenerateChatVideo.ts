import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type GenerateChatVideoResponse = {
  success?: boolean;
  videoUrl?: string;
  newTokensBalance?: number | null;
  error?: string;
  code?: string;
};

export async function invokeGenerateChatVideo(body: {
  companionId: string;
  userId: string;
  tokenCost?: number;
  /** Passed to `generate-chat-companion-video` to steer the motion prompt. */
  clipMood?: "sfw" | "lewd" | "nude";
}): Promise<{ data: GenerateChatVideoResponse; error: null } | { data: null; error: Error }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const url = `${base}/functions/v1/generate-chat-companion-video`;

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
  if (!bearer) {
    return { data: null, error: new Error("Sign in again — video generation needs an active session.") };
  }

  let res = await post(bearer);
  if (!res.ok && res.status === 401) {
    await supabase.auth.refreshSession();
    const t2 = (await supabase.auth.getSession()).data.session?.access_token;
    if (t2) res = await post(t2);
  }

  const text = await res.text();
  let parsed: GenerateChatVideoResponse = {};
  try {
    parsed = JSON.parse(text) as GenerateChatVideoResponse;
  } catch {
    return { data: null, error: new Error(text || `HTTP ${res.status}`) };
  }

  if (!res.ok) {
    return {
      data: null,
      error: new Error(parsed.error || `HTTP ${res.status}`),
    };
  }
  if (parsed.success === false) {
    return {
      data: null,
      error: new Error(parsed.error || "Video generation failed"),
    };
  }

  return { data: parsed, error: null };
}
