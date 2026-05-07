import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { publicApiTeaserGuardResponse } from "../_shared/publicApiTeaserGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_CHARS = 4000;
const ALLOWED_VOICES = new Set(["ara", "eve", "rex", "sal", "leo"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const session = await requireSessionUser(req);
    if ("response" in session) return session.response;

    const teaserBlock = await publicApiTeaserGuardResponse(session.user);
    if (teaserBlock) return teaserBlock;

    const body = await req.json().catch(() => null) as {
      text?: string;
      voiceId?: string;
      messageId?: string;
    } | null;

    const text = String(body?.text ?? "").trim();
    if (!text || text.length > MAX_CHARS) {
      return new Response(JSON.stringify({ error: `Text required (max ${MAX_CHARS} chars)` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let voiceId = String(body?.voiceId ?? "eve").trim().toLowerCase();
    if (!ALLOWED_VOICES.has(voiceId)) voiceId = "eve";

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "xAI API key not configured. Set XAI_API_KEY or GROK_API_KEY for Edge Functions.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ttsRes = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        voice_id: voiceId,
        language: "en",
        output_format: { codec: "mp3" },
      }),
    });

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      console.error("xAI TTS error:", errText);
      return new Response(JSON.stringify({ error: "TTS service error", details: errText.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const buf = new Uint8Array(await ttsRes.arrayBuffer());
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const path = `${session.user.id}/${crypto.randomUUID()}.mp3`;
    const { error: upErr } = await admin.storage.from("chat-tts").upload(path, buf, {
      contentType: "audio/mpeg",
      upsert: false,
    });
    if (upErr) {
      console.error("TTS storage upload:", upErr);
      return new Response(JSON.stringify({ error: "Could not store audio" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = admin.storage.from("chat-tts").getPublicUrl(path);
    const audioUrl = pub.publicUrl;

    const messageId = typeof body?.messageId === "string" ? body.messageId.trim() : "";
    if (messageId) {
      const { data: row, error: selErr } = await admin
        .from("chat_messages")
        .select("id,user_id,role,companion_id")
        .eq("id", messageId)
        .maybeSingle();
      if (!selErr && row && row.user_id === session.user.id && row.role === "assistant") {
        await admin.from("chat_messages").update({ tts_audio_url: audioUrl }).eq("id", messageId);
      }
    }

    return new Response(JSON.stringify({ audioUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("grok-tts:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
