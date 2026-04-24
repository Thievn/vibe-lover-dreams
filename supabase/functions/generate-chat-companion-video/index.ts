/**
 * Chat companion video clips: Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * Configure `XAI_API_KEY` or `GROK_API_KEY` and optional `GROK_VIDEO_MODEL`, `GROK_CHAT_VIDEO_DURATION_SECONDS` (5–15, default 10).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  DEFAULT_GROK_VIDEO_MODEL,
  publicHttpsImageUrlForGrok,
  runGrokImagineImageToVideo,
} from "../_shared/xaiGrokVideo.ts";
import {
  buildMinimalProfileLoopVideoPrompt,
  buildProfileLoopVideoPrompt,
  I2V_MOUTH_STILL_DIRECTIVE_SHORT,
  sanitizePromptForVideoApi,
} from "../_shared/profileLoopVideoPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function chatVideoDurationSeconds(): number {
  const n = Math.round(Number(Deno.env.get("GROK_CHAT_VIDEO_DURATION_SECONDS") ?? "10"));
  if (!Number.isFinite(n)) return 10;
  return Math.max(5, Math.min(15, n));
}

async function refundTokens(svc: ReturnType<typeof createClient>, userId: string, amount: number) {
  if (amount <= 0) return;
  try {
    const { data: row } = await svc.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    await svc.from("profiles").update({ tokens_balance: bal + amount }).eq("user_id", userId);
  } catch (e) {
    console.error("refundTokens", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let tokensCharged = false;
  let tokenCost = 0;
  let chargedUserId = "";

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonTrim = SUPABASE_ANON_KEY?.trim() ?? "";

    const body = (await req.json().catch(() => null)) as {
      companionId?: string;
      userId?: string;
      tokenCost?: number;
      clipMood?: "sfw" | "lewd" | "nude";
    } | null;

    const companionId = typeof body?.companionId === "string" ? body.companionId.trim() : "";
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const clipMood =
      body?.clipMood === "sfw" || body?.clipMood === "lewd" || body?.clipMood === "nude" ? body.clipMood : "lewd";

    if (!companionId || !userId) {
      return jsonResponse({ success: false, error: "companionId and userId required" }, 400);
    }

    tokenCost =
      typeof body?.tokenCost === "number" && Number.isFinite(body.tokenCost) && body.tokenCost > 0
        ? Math.floor(body.tokenCost)
        : 100;
    chargedUserId = userId;

    if (!bearer || (anonTrim && bearer === anonTrim)) {
      return jsonResponse(
        {
          success: false,
          error:
            "Sign in required — refresh and try again (session token must be sent, not the anon key).",
        },
        401,
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user || user.id !== userId) {
      return jsonResponse({ success: false, error: "Invalid session" }, 401);
    }

    const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
    if (!xaiKey) {
      return jsonResponse(
        {
          success: false,
          error:
            "Grok / xAI not configured: set Edge Function secret XAI_API_KEY or GROK_API_KEY for chat video clips.",
        },
        503,
      );
    }

    if (tokenCost > 0) {
      const { data: prof, error: profErr } = await svc
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (profErr || prof == null) {
        return jsonResponse({ success: false, error: "Could not read credits." }, 400);
      }
      if (prof.tokens_balance < tokenCost) {
        return jsonResponse(
          {
            success: false,
            error: `Not enough forge credits (${tokenCost} required).`,
            code: "INSUFFICIENT_TOKENS",
          },
          402,
        );
      }
      const { error: deductErr } = await svc
        .from("profiles")
        .update({ tokens_balance: prof.tokens_balance - tokenCost })
        .eq("user_id", userId);
      if (deductErr) throw new Error(deductErr.message || "Could not reserve credits.");
      tokensCharged = true;
    }

    let imageUrl: string | null = null;
    let row: Record<string, unknown>;

    if (companionId.startsWith("cc-")) {
      const rowPk = companionId.slice(3);
      const { data, error } = await svc.from("custom_characters").select("*").eq("id", rowPk).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost);
        return jsonResponse({ success: false, error: "Companion not found" }, 404);
      }
      row = data as Record<string, unknown>;
      const raw =
        (typeof row.static_image_url === "string" && row.static_image_url) ||
        (typeof row.image_url === "string" && row.image_url) ||
        (typeof row.avatar_url === "string" && row.avatar_url) ||
        null;
      imageUrl = publicHttpsImageUrlForGrok(raw);
    } else {
      const { data, error } = await svc.from("companions").select("*").eq("id", companionId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost);
        return jsonResponse({ success: false, error: "Companion not found" }, 404);
      }
      row = data as Record<string, unknown>;
      const raw =
        (typeof row.static_image_url === "string" && row.static_image_url) ||
        (typeof row.image_url === "string" && row.image_url) ||
        null;
      imageUrl = publicHttpsImageUrlForGrok(raw);
    }

    if (!imageUrl) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "No fetchable portrait image URL for video source." }, 400);
    }

    const motionBeats = [
      "slow sensual hip sway and weight shift returning to center",
      "teasing fabric adjustment — strap, hem, or neckline — then settling back",
      "slow breath with chest rise; intimate eye contact — mouth still, no speech-like motion",
      "hands tracing collarbone or thigh then resting where the still began",
      "turn-away and look-back over shoulder, ending facing front as in the still",
      "arched back stretch then soft collapse to original pose",
    ];
    const beat = motionBeats[Math.floor(Math.random() * motionBeats.length)] ?? motionBeats[0];
    const moodLine =
      clipMood === "sfw"
        ? "SFW / flirty: cute playful motion, outfit stays on, no nudity."
        : clipMood === "nude"
          ? "Explicit-leaning if the still supports it; sensual body motion."
          : "Lewd / lingerie tease, NSFW-leaning, matching the still.";

    const fullFromBuilder = buildProfileLoopVideoPrompt(row);
    const extra = `\n\nCHAT CLIP: ${moodLine} Primary motion: ${beat}. ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`;
    const combined = sanitizePromptForVideoApi(`${fullFromBuilder}${extra}`);
    const prompt =
      combined.length <= 3000
        ? combined
        : sanitizePromptForVideoApi(
            `${buildMinimalProfileLoopVideoPrompt(row)} ${moodLine} Motion: ${beat}. ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
          );

    const durationSec = chatVideoDurationSeconds();
    const videoModel = (Deno.env.get("GROK_VIDEO_MODEL") ?? DEFAULT_GROK_VIDEO_MODEL).trim() || DEFAULT_GROK_VIDEO_MODEL;

    let grokVideoUrl: string;
    try {
      const r = await runGrokImagineImageToVideo({
        apiKey: xaiKey,
        prompt,
        sourceImageUrl: imageUrl,
        durationSeconds: durationSec,
        aspectRatio: "9:16",
        resolution: "720p",
        model: videoModel,
        maxWaitMs: 20 * 60_000,
      });
      grokVideoUrl = r.videoUrl;
    } catch (e) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      const msg = e instanceof Error ? e.message : String(e);
      return jsonResponse({ success: false, error: msg }, 502);
    }

    const vidRes = await fetch(grokVideoUrl);
    if (!vidRes.ok) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: `Download from xAI video failed HTTP ${vidRes.status}` }, 502);
    }
    const buf = new Uint8Array(await vidRes.arrayBuffer());

    const safe = companionId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
    const fileName = `chat-videos/${userId}/${safe}/${Date.now()}.mp4`;
    const storage = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { error: upErr } = await storage.storage.from("companion-images").upload(fileName, buf, {
      contentType: "video/mp4",
      upsert: true,
    });
    if (upErr) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: upErr.message }, 500);
    }

    const publicUrl = storage.storage.from("companion-images").getPublicUrl(fileName).data.publicUrl;

    const { data: prof } = await svc.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();

    return jsonResponse({
      success: true,
      videoUrl: publicUrl,
      newTokensBalance: prof?.tokens_balance ?? null,
      tokensCharged: tokenCost,
      source: "grok",
      durationSeconds: durationSec,
    });
  } catch (err) {
    console.error("generate-chat-companion-video:", err);
    if (tokensCharged && chargedUserId && tokenCost > 0) {
      const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      await refundTokens(svc, chargedUserId, tokenCost);
    }
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: msg, tokensRefunded: tokensCharged }, 500);
  }
});
