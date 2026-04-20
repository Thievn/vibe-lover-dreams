import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const session = await requireSessionUser(req);
    if ("response" in session) return session.response;

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "xAI API key not configured. Set XAI_API_KEY or GROK_API_KEY on Edge Functions.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const res = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 600 },
      }),
    });

    const text = await res.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ error: "xAI returned non-JSON", detail: text.slice(0, 400) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: typeof parsed.error === "string" ? parsed.error : "Could not create voice session token",
          detail: parsed,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const value = typeof parsed.value === "string" ? parsed.value : "";
    const expiresAt = typeof parsed.expires_at === "number" ? parsed.expires_at : null;
    if (!value) {
      return new Response(JSON.stringify({ error: "No client secret in xAI response", detail: parsed }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ value, expires_at: expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("grok-voice-client-secret:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
