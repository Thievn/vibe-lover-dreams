import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";

export type SyncAppearanceReferenceResponse = {
  success?: boolean;
  appearanceReference?: string;
  error?: string;
};

function parseErrorMessage(status: number, text: string): string {
  try {
    const j = JSON.parse(text) as { error?: string };
    return (j.error || text).trim() || `HTTP ${status}`;
  } catch {
    return text.trim() || `HTTP ${status}`;
  }
}

/**
 * Calls `sync-appearance-reference` — vision/text core appearance paragraph for chat still consistency.
 */
export async function invokeSyncAppearanceReference(body: {
  userId: string;
  publicImageUrl: string;
  gender?: string;
  identityAnatomyDetail?: string;
  appearanceDraft?: string;
  persistCustomCharacterId?: string;
}): Promise<{ data: SyncAppearanceReferenceResponse; error: null } | { data: null; error: Error }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const url = `${base}/functions/v1/sync-appearance-reference`;
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

  try {
    await supabase.auth.refreshSession();
  } catch {
    /* continue with existing session */
  }
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
  if (!bearer) {
    return { data: null, error: new Error("Sign in again — appearance sync needs an active session.") };
  }

  let res = await post(bearer);
  if (!res.ok) {
    const t = await res.clone().text();
    const msg = parseErrorMessage(res.status, t);
    if (res.status === 401 || /invalid\s+jwt/i.test(msg)) {
      await supabase.auth.refreshSession();
      const t2 = (await supabase.auth.getSession()).data.session?.access_token;
      if (t2) res = await post(t2);
    }
  }

  if (!res.ok) {
    const t = await res.text();
    return { data: null, error: new Error(parseErrorMessage(res.status, t)) };
  }

  const data = (await res.json()) as SyncAppearanceReferenceResponse;
  return { data, error: null };
}
