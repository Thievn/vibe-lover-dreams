/**
 * Chat companion video clips:
 * - **Lewd / SFW** — Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * - **Nude** — Tensor.art T2V/I2V (dual model per `nude_tensor_render_group`); requires `TENSOR_API_KEY`.
 *
 * Configure: `GROK_*` for lewd/sfw, `TENSOR_API_KEY` + nude model envs for nude, `GROK_CHAT_VIDEO_DURATION_SECONDS` (5–15, default 10).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { hasTamsRsaCredentials } from "../_shared/tamsRsaAuth.ts";
import { pickNudeVideoModelId } from "../_shared/nudeTensorModelPick.server.ts";
import { resolveNudeRenderGroupForCompanion } from "../_shared/resolveNudeRenderGroupForCompanion.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  DEFAULT_TENSOR_VIDEO_MODEL,
  runTensorImageToVideoJobWithRetries,
  sourceImageUrlForTamsUpload,
} from "../_shared/tensorClient.ts";
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
        description: "Chat: short video clip (Imagine / Tensor)",
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

    const assertTamsVideoModel = (m: string, name: string): string => {
      const t = m.trim();
      if (!/^\d{10,24}$/.test(t)) {
        throw new Error(
          `Invalid ${name} "${t}". TAMS needs the digits-only model id (tensor.art model page), not a repo name.`,
        );
      }
      return t;
    };

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
    if (clipMood === "nude") {
      const tensorKey = (Deno.env.get("TENSOR_API_KEY") ?? "").trim();
      if (!tensorKey && !hasTamsRsaCredentials()) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
        return jsonResponse(
          {
            success: false,
            error:
              "Nude video clips use Tensor TAMS — set TENSOR_API_KEY (or TAMS RSA credentials). Lewd/sfw still use Grok; configure both for full + menu support.",
          },
          503,
        );
      }
      const tamsSource = sourceImageUrlForTamsUpload(imageUrl);
      if (!tamsSource) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
        return jsonResponse(
          { success: false, error: "Profile URL must be a fetchable https URL for Tensor (public storage or a signed link)." },
          400,
        );
      }
      const nudeGroup = await resolveNudeRenderGroupForCompanion(
        (k) => Deno.env.get(k) ?? undefined,
        svc,
        companionId,
        row,
      );
      const genericV = (Deno.env.get("TENSOR_VIDEO_MODEL") ?? DEFAULT_TENSOR_VIDEO_MODEL).trim();
      const videoModelTams = pickNudeVideoModelId(
        (k) => Deno.env.get(k) ?? undefined,
        nudeGroup,
        assertTamsVideoModel,
        assertTamsVideoModel(genericV, "TENSOR_VIDEO_MODEL"),
      );
      const tensorI2V = sanitizePromptForVideoApi(
        `${prompt}\n\n[TAMS nude I2V] Animate the profile still with the motion and mood above; explicit-adult-leaning motion only if the still supports it. ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
      );
      let tensorVideoUrl: string;
      try {
        if (!tensorKey) {
          throw new Error("TENSOR_API_KEY is empty — RSA-only path not wired for nude I2V in this build.");
        }
        const { videoUrl: vu } = await runTensorImageToVideoJobWithRetries({
          apiKey: tensorKey,
          prompt: tensorI2V,
          sourceImageUrl: tamsSource,
          durationSeconds: durationSec,
          model: videoModelTams,
          timeoutMs: 15 * 60_000,
          maxAttempts: 3,
        });
        if (!vu) throw new Error("Tensor returned no nude video URL");
        tensorVideoUrl = vu;
      } catch (e) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
        const msg = e instanceof Error ? e.message : String(e);
        return jsonResponse({ success: false, error: msg }, 502);
      }
      const vidRes2 = await fetch(tensorVideoUrl);
      if (!vidRes2.ok) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
        return jsonResponse(
          { success: false, error: `Download from Tensor video failed HTTP ${vidRes2.status}` },
          502,
        );
      }
      const buf2 = new Uint8Array(await vidRes2.arrayBuffer());
      const safe2 = companionId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 80);
      const fileName2 = `chat-videos-tensor/${userId}/${safe2}/${Date.now()}.mp4`;
      const { error: upErr2 } = await createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).storage
        .from("companion-images")
        .upload(fileName2, buf2, { contentType: "video/mp4", upsert: true });
      if (upErr2) {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
        return jsonResponse({ success: false, error: upErr2.message }, 500);
      }
      const publicUrl2 = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).storage
        .from("companion-images")
        .getPublicUrl(fileName2).data.publicUrl;
      const { data: prof2 } = await svc.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
      return jsonResponse({
        success: true,
        videoUrl: publicUrl2,
        newTokensBalance: prof2?.tokens_balance ?? null,
        tokensCharged: tokenCost,
        source: "tensor-nude",
        durationSeconds: durationSec,
        nudeRenderGroup: nudeGroup,
      });
    }

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
    if (!xaiKey) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost, "companion or pipeline");
      return jsonResponse(
        {
          success: false,
          error:
            "Grok / xAI not configured: set Edge Function secret XAI_API_KEY or GROK_API_KEY for lewd/sfw chat video clips.",
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
        aspectRatio: "9:16",
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
