/**
 * Chat companion video clips — Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * Configure: `XAI_API_KEY` / `GROK_API_KEY`, optional `GROK_VIDEO_MODEL`, `GROK_CHAT_VIDEO_DURATION_SECONDS` (5–15).
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
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";

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

async function refundTokens(svc: ReturnType<typeof createClient>, userId: string, amount: number, reason: string) {
  if (amount <= 0) return;
  try {
    const { data: row } = await svc.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    const nxt = bal + amount;
    await svc.from("profiles").update({ tokens_balance: nxt }).eq("user_id", userId);
    await recordFcTransaction(svc, {
      userId,
      creditsChange: amount,
      balanceAfter: nxt,
      transactionType: "video_refund",
      description: `Chat video refund: ${reason}`,
      metadata: { fc: amount },
    });
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
      clipMood?: "sfw" | "lewd";
      motionHint?: string;
    } | null;

    const companionId = typeof body?.companionId === "string" ? body.companionId.trim() : "";
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const clipMood = body?.clipMood === "sfw" || body?.clipMood === "lewd" ? body.clipMood : "lewd";
    const motionHintRaw = typeof body?.motionHint === "string" ? body.motionHint.trim() : "";
    const motionHint = motionHintRaw.length > 500 ? `${motionHintRaw.slice(0, 497)}…` : motionHintRaw;

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
      const nbal = prof.tokens_balance - tokenCost;
      await recordFcTransaction(svc, {
        userId,
        creditsChange: -tokenCost,
        balanceAfter: nbal,
        transactionType: "chat_video",
        description: "Chat: short video clip (Grok I2V)",
        metadata: { tokenCost, companionId },
      });
    }

    let imageUrl: string | null = null;
    let row: Record<string, unknown>;

    if (companionId.startsWith("cc-")) {
      const rowPk = companionId.slice(3);
      const { data, error } = await svc.from("custom_characters").select("*").eq("id", rowPk).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
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
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
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
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
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
        ? "SFW / flirty: cute playful motion, outfit stays fully on, modest coverage."
        : "Lewd / lingerie tease, spicy-leaning, matching the still.";

    const likenessLock =
      "LIKENESS (critical): Same roster character as the source portrait — same face structure, hair, skin tone, age read, silhouette, and body language; never morph into a different person, creature mash-up, or melted features. Motion must read as alive — fabric physics, hair drift, breath, weight shifts, gaze — not a Ken Burns zoom or parallax wobble on a static frame.";
    const silentLine =
      "AUDIO: Silent clip — no narration, no music, no speech-like mouth; lips stay neutral; motion from body, hair, fabric, pose, eyes.";
    const presetLine = motionHint ? `\nPreset / scene hint: ${sanitizePromptForVideoApi(motionHint)}` : "";
    const fullFromBuilder = buildProfileLoopVideoPrompt(row);
    const extra = `\n\nCHAT CLIP: ${moodLine} Primary motion: ${beat}. ${likenessLock} ${silentLine}${presetLine} ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`;
    const combined = sanitizePromptForVideoApi(`${fullFromBuilder}${extra}`);
    const prompt =
      combined.length <= 3000
        ? combined
        : sanitizePromptForVideoApi(
            `${buildMinimalProfileLoopVideoPrompt(row)} ${moodLine} Motion: ${beat}. ${likenessLock} ${silentLine}${presetLine} ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
          );

    const durationSec = chatVideoDurationSeconds();

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
    if (!xaiKey) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
      return jsonResponse(
        {
          success: false,
          error:
            "Grok / xAI not configured: set Edge Function secret XAI_API_KEY or GROK_API_KEY for chat video clips.",
        },
        503,
      );
    }

    const videoModel = (Deno.env.get("GROK_VIDEO_MODEL") ?? DEFAULT_GROK_VIDEO_MODEL).trim() || DEFAULT_GROK_VIDEO_MODEL;

    let grokVideoUrl: string;
    try {
      const r = await runGrokImagineImageToVideo({
        apiKey: xaiKey,
        prompt,
        sourceImageUrl: imageUrl,
        durationSeconds: durationSec,
        aspectRatio: "2:3",
        resolution: "720p",
        model: videoModel,
        maxWaitMs: 20 * 60_000,
      });
      grokVideoUrl = r.videoUrl;
    } catch (e) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
      const msg = e instanceof Error ? e.message : String(e);
      return jsonResponse({ success: false, error: msg }, 502);
    }

    const vidRes = await fetch(grokVideoUrl);
    if (!vidRes.ok) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
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
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
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
      await refundTokens(svc, chargedUserId, tokenCost, "uncaught");
    }
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ success: false, error: msg, tokensRefunded: tokensCharged }, 500);
  }
});
