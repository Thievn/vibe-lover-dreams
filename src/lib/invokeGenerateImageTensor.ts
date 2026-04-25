import { supabase } from "@/integrations/supabase/client";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/integrations/supabase/env";
import type { GenerateImageResponse } from "@/lib/invokeGenerateImage";

function parseErrorMessage(status: number, text: string): string {
  try {
    const j = JSON.parse(text) as { error?: string; message?: string; msg?: string; tokensRefunded?: boolean };
    const base = (j.error || j.message || j.msg || text).trim() || `HTTP ${status}`;
    if (j.tokensRefunded) return `${base} (forge credits were refunded.)`;
    return base;
  } catch {
    return text.trim() || `HTTP ${status}`;
  }
}

/**
 * `generate-image-tensor` (Tensor.art TAMS, img2img + reference) — used for **nude** chat stills
 * so SFW/lewds can stay on the faster Grok `generate-image` path.
 */
export async function invokeGenerateImageTensor(
  body: Record<string, unknown> & { nudeTensorGeneration?: boolean },
): Promise<{ data: GenerateImageResponse; error: null } | { data: null; error: Error }> {
  const base = getSupabaseUrl().replace(/\/$/, "");
  const anon = getSupabaseAnonKey();
  if (!base || !anon) {
    return { data: null, error: new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY") };
  }

  const url = `${base}/functions/v1/generate-image-tensor`;

  const post = (bearer: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearer}`,
        apikey: anon,
      },
      body: JSON.stringify({ ...body, nudeTensorGeneration: true }),
    });

  await supabase.auth.refreshSession();
  const session = (await supabase.auth.getSession()).data.session;
  const bearer = session?.access_token;
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
