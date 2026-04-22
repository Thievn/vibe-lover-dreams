/**
 * Chat companion video clips: Tensor TAMS image-to-video (same stack as `generate-image-tensor`).
 * Configure `TENSOR_API_KEY` and optional `TENSOR_VIDEO_MODEL`, `TENSOR_CHAT_VIDEO_DURATION_SECONDS` (5–10, default 10).
 * Grok/xAI video is not used here.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hasTamsRsaCredentials } from "../_shared/tamsRsaAuth.ts";
import {
  DEFAULT_TENSOR_VIDEO_MODEL,
  sourceImageUrlForTamsUpload,
  submitTensorImageToVideoJob,
  waitForTensorJobResult,
} from "../_shared/tensorClient.ts";
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
  const n = Math.round(Number(Deno.env.get("TENSOR_CHAT_VIDEO_DURATION_SECONDS") ?? "10"));
  if (!Number.isFinite(n)) return 10;
  return Math.max(5, Math.min(10, n));
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

    const tensorApiKey = (Deno.env.get("TENSOR_API_KEY") ?? "").trim();
    if (!tensorApiKey && !hasTamsRsaCredentials()) {
      return jsonResponse(
        {
          success: false,
          error:
            "Tensor auth not configured: set Supabase secret TENSOR_API_KEY (Bearer from https://tams.tensor.art/app) " +
            "or TAMS_APP_ID + TAMS_PRIVATE_KEY for RSA. Ensure TENSOR_API_BASE_URL matches your TAMS app region.",
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
      imageUrl = sourceImageUrlForTamsUpload(raw);
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
      imageUrl = sourceImageUrlForTamsUpload(raw);
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
    const videoModel = (Deno.env.get("TENSOR_VIDEO_MODEL") ?? DEFAULT_TENSOR_VIDEO_MODEL).trim() || DEFAULT_TENSOR_VIDEO_MODEL;

    const { jobId } = await submitTensorImageToVideoJob({
      apiKey: tensorApiKey,
      prompt,
      sourceImageUrl: imageUrl,
      model: videoModel,
      durationSeconds: durationSec,
    });

    const { videoUrl: tensorVideoUrl } = await waitForTensorJobResult({
      apiKey: tensorApiKey,
      jobId,
      timeoutMs: 16 * 60_000,
      pollIntervalMs: 4000,
    });

    if (!tensorVideoUrl) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "Tensor job completed but returned no video URL." }, 502);
    }

    const vidRes = await fetch(tensorVideoUrl);
    if (!vidRes.ok) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: `Download from Tensor failed HTTP ${vidRes.status}` }, 502);
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
      source: "tensor",
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
