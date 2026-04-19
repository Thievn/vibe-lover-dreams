import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminUser } from "../_shared/requireSessionUser.ts";
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminGate = await requireAdminUser(req);
  if ("response" in adminGate) return adminGate.response;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
  if (!apiKey) {
    return jsonResponse({ error: "XAI_API_KEY not configured on Edge Function" }, 503);
  }

  let body: { companionId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const companionId = typeof body.companionId === "string" ? body.companionId.trim() : "";
  if (!companionId) {
    return jsonResponse({ error: "companionId required" }, 400);
  }

  const svc = createClient(supabaseUrl, serviceKey);

  let table: "companions" | "custom_characters";
  let rowPk: string;
  let imageUrl: string | null = null;
  let row: Record<string, unknown>;

  if (companionId.startsWith("cc-")) {
    table = "custom_characters";
    rowPk = companionId.slice(3);
    const { data, error } = await svc.from("custom_characters").select("*").eq("id", rowPk).maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Companion not found" }, 404);
    row = data as Record<string, unknown>;
    const raw =
      (typeof row.static_image_url === "string" && row.static_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      (typeof row.avatar_url === "string" && row.avatar_url) ||
      null;
    imageUrl = stablePublicImageUrl(raw);
  } else {
    table = "companions";
    rowPk = companionId;
    const { data, error } = await svc.from("companions").select("*").eq("id", rowPk).maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Companion not found" }, 404);
    row = data as Record<string, unknown>;
    const raw =
      (typeof row.static_image_url === "string" && row.static_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      null;
    imageUrl = stablePublicImageUrl(raw);
  }

  if (!imageUrl) {
    return jsonResponse({ error: "No public profile image URL — set a static portrait first." }, 400);
  }

  const fullPrompt = buildProfileLoopVideoPrompt(row);
  let startRes = await postVideoGeneration(apiKey, imageUrl, fullPrompt, PROFILE_LOOP_VIDEO_DURATION_SECONDS);
  let startText = await startRes.text();
  let startParsed = tryParseJsonRecord(startText);

  // Long lore + gateway quirks sometimes return HTML/empty bodies; retry compact prompt + 8s.
  if (!startParsed) {
    const minimal = buildMinimalProfileLoopVideoPrompt(row);
    startRes = await postVideoGeneration(
      apiKey,
      imageUrl,
      minimal,
      PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS,
    );
    startText = await startRes.text();
    startParsed = tryParseJsonRecord(startText);
  }

  if (!startParsed) {
    return jsonResponse(
      {
        error: "xAI returned non-JSON (often empty body, HTML error page, or gateway). Retried with a shorter prompt.",
        httpStatus: startRes.status,
        contentType: startRes.headers.get("content-type") ?? "",
        detail: startText.slice(0, 1500),
      },
      502,
    );
  }
  if (!startRes.ok) {
    return jsonResponse(
      { error: "xAI video start failed", status: startRes.status, detail: startParsed },
      502,
    );
  }

  return await finalizeVideo(
    svc,
    apiKey,
    startParsed,
    table,
    rowPk,
    companionId,
    supabaseUrl,
    serviceKey,
  );
});

async function finalizeVideo(
  svc: ReturnType<typeof createClient>,
  apiKey: string,
  startParsed: Record<string, unknown>,
  table: "companions" | "custom_characters",
  rowPk: string,
  companionId: string,
  supabaseUrl: string,
  serviceKey: string,
): Promise<Response> {
  const requestId = typeof startParsed.request_id === "string" ? startParsed.request_id : null;
  if (!requestId) {
    return jsonResponse({ error: "xAI did not return request_id", detail: startParsed }, 502);
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
      return jsonResponse({ error: `Video generation ${status}`, detail: lastPayload }, 502);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  if (status !== "done") {
    return jsonResponse({ error: "Video generation timed out", last: lastPayload }, 504);
  }

  const video = lastPayload.video as Record<string, unknown> | undefined;
  const vidUrl = typeof video?.url === "string" ? video.url : null;
  if (!vidUrl) {
    return jsonResponse({ error: "No video URL in xAI response", detail: lastPayload }, 502);
  }

  const vidRes = await fetch(vidUrl);
  if (!vidRes.ok) {
    return jsonResponse({ error: `Could not download video: HTTP ${vidRes.status}` }, 502);
  }
  const buf = new Uint8Array(await vidRes.arrayBuffer());

  const safeId = companionId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 120);
  const fileName = `profile-loops/${safeId}/${Date.now()}.mp4`;
  const storage = createClient(supabaseUrl, serviceKey);
  const { error: upErr } = await storage.storage.from("companion-images").upload(fileName, buf, {
    contentType: "video/mp4",
    upsert: true,
  });
  if (upErr) {
    return jsonResponse({ error: `Storage upload failed: ${upErr.message}` }, 500);
  }

  const publicUrl = storage.storage.from("companion-images").getPublicUrl(fileName).data.publicUrl;

  const { error: upRow } = await svc
    .from(table)
    .update({
      animated_image_url: publicUrl,
      profile_loop_video_enabled: true,
    })
    .eq("id", rowPk);

  if (upRow) {
    return jsonResponse({ error: upRow.message }, 500);
  }

  return jsonResponse({ success: true, publicUrl });
}
