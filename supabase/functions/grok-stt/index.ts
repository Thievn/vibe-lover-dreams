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

    const ct = req.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("multipart/form-data")) {
      return new Response(JSON.stringify({ error: "Use multipart/form-data with field `file`." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const incoming = await req.formData();
    const file = incoming.get("file");
    if (!file || !(file instanceof Blob)) {
      return new Response(JSON.stringify({ error: "Missing audio `file` field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const out = new FormData();
    const name = file instanceof File ? file.name : "recording.webm";
    out.append("file", file, name || "recording.webm");

    const sttRes = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: out,
    });

    const rawText = await sttRes.text();
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          error: "STT service returned non-JSON",
          httpStatus: sttRes.status,
          detail: rawText.slice(0, 800),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!sttRes.ok) {
      return new Response(
        JSON.stringify({
          error: typeof parsed.error === "string" ? parsed.error : "Speech-to-text failed",
          detail: parsed,
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text =
      typeof parsed.text === "string"
        ? parsed.text.trim()
        : typeof parsed.transcript === "string"
          ? parsed.transcript.trim()
          : "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("grok-stt:", err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
