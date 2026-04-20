import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  buildMinimalProfileLoopVideoPrompt,
  buildProfileLoopVideoPrompt,
  PROFILE_LOOP_VIDEO_DURATION_SECONDS,
  PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS,
  sanitizePromptForVideoApi,
} from "../_shared/profileLoopVideoPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const XAI_VIDEOS = "https://api.x.ai/v1/videos";

function stablePublicImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const u = url.trim();
  if (u.startsWith("data:") || u.startsWith("blob:")) return null;
  if (u.startsWith("/")) return null;
  if (u.includes("/object/public/")) return u.split("?")[0] ?? u;
  const signMatch = u.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signMatch) {
    const [, origin, bucket, pathPart] = signMatch;
    return `${origin}/storage/v1/object/public/${bucket}/${pathPart}`;
  }
  return u.split("?")[0] ?? u;
}

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function tryParseJsonRecord(text: string): Record<string, unknown> | null {
  const t = text.trim();
  if (!t) return null;
  try {
    return JSON.parse(t) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function postVideoGeneration(
  apiKey: string,
  imageUrl: string,
  prompt: string,
  durationSeconds: number,
): Promise<Response> {
  const payload = {
    model: "grok-imagine-video",
    prompt: sanitizePromptForVideoApi(prompt),
    duration: durationSeconds,
    aspect_ratio: "9:16",
    resolution: "480p",
    image: { url: imageUrl },
  };
  let res = await fetch(`${XAI_VIDEOS}/generations`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    res = await fetch(`${XAI_VIDEOS}/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...payload, image: imageUrl }),
    });
  }
  return res;
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

    const body = await req.json().catch(() => null) as {
      companionId?: string;
      userId?: string;
      tokenCost?: number;
    } | null;

    const companionId = typeof body?.companionId === "string" ? body.companionId.trim() : "";
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";

    if (!companionId || !userId) {
      return jsonResponse({ success: false, error: "companionId and userId required" }, 400);
    }

    tokenCost =
      typeof body?.tokenCost === "number" && Number.isFinite(body.tokenCost) && body.tokenCost > 0
        ? Math.floor(body.tokenCost)
        : 320;
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
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "XAI_API_KEY not configured" }, 503);
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
      imageUrl = stablePublicImageUrl(raw);
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
      imageUrl = stablePublicImageUrl(raw);
    }

    if (!imageUrl) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "No public portrait image for video source." }, 400);
    }

    const motionBeats = [
      "slow sensual hip sway and weight shift returning to center",
      "teasing fabric adjustment — strap, hem, or neckline — then settling back",
      "breath and lip bite with chest rise; intimate eye contact with camera",
      "hands tracing collarbone or thigh then resting where the still began",
      "turn-away and look-back over shoulder, ending facing front as in the still",
      "arched back stretch then soft collapse to original pose",
    ];
    const beat = motionBeats[Math.floor(Math.random() * motionBeats.length)] ?? motionBeats[0];
    const chatPrompt = `${buildProfileLoopVideoPrompt(row)} Focus: **chat lewd clip** — same identity as the reference portrait (face, hair, body type, outfit). Primary motion beat for this request: ${beat}. Prefer sensual, NSFW-leaning performance that still matches the still (not a generic portrait zoom or idle blink). Vary gesture each generation; loop-friendly. Provider policy applies.`;

    let startRes = await postVideoGeneration(apiKey, imageUrl, chatPrompt, PROFILE_LOOP_VIDEO_DURATION_SECONDS);
    let startText = await startRes.text();
    let startParsed = tryParseJsonRecord(startText);

    if (!startParsed) {
      const minimal = `${buildMinimalProfileLoopVideoPrompt(row)} Chat lewd loop — match reference identity; motion: ${beat}; sensual, NSFW-leaning if consistent with the still.`;
      startRes = await postVideoGeneration(apiKey, imageUrl, minimal, PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS);
      startText = await startRes.text();
      startParsed = tryParseJsonRecord(startText);
    }

    if (!startParsed) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse(
        {
          success: false,
          error: "xAI returned non-JSON for video start",
          detail: startText.slice(0, 1500),
        },
        502,
      );
    }
    if (!startRes.ok) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "xAI video start failed", detail: startParsed }, 502);
    }

    const requestId = typeof startParsed.request_id === "string" ? startParsed.request_id : null;
    if (!requestId) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "No request_id from xAI", detail: startParsed }, 502);
    }

    const deadline = Date.now() + 14 * 60 * 1000;
    let status = "pending";
    let lastPayload: Record<string, unknown> = {};

    while (Date.now() < deadline) {
      const pollRes = await fetch(`${XAI_VIDEOS}/${requestId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollText = await pollRes.text();
      try {
        lastPayload = JSON.parse(pollText) as Record<string, unknown>;
      } catch {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      status = typeof lastPayload.status === "string" ? lastPayload.status : "";
      if (status === "done") break;
      if (status === "failed" || status === "expired") {
        if (tokensCharged) await refundTokens(svc, userId, tokenCost);
        return jsonResponse({ success: false, error: `Video ${status}`, detail: lastPayload }, 502);
      }
      await new Promise((r) => setTimeout(r, 4000));
    }

    if (status !== "done") {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "Video generation timed out", last: lastPayload }, 504);
    }

    const video = lastPayload.video as Record<string, unknown> | undefined;
    const vidUrl = typeof video?.url === "string" ? video.url : null;
    if (!vidUrl) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: "No video URL", detail: lastPayload }, 502);
    }

    const vidRes = await fetch(vidUrl);
    if (!vidRes.ok) {
      if (tokensCharged) await refundTokens(svc, userId, tokenCost);
      return jsonResponse({ success: false, error: `Download failed HTTP ${vidRes.status}` }, 502);
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
