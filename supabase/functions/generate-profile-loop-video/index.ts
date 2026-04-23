/**
 * Profile portrait loop — Tensor TAMS I2V (Wan), same stack as `generate-chat-companion-video`.
 * Auth: signed-in owner of `cc-…` custom characters, or admin for any companion (including catalog).
 * Requires `TENSOR_API_KEY` or TAMS RSA keys. Optional `TENSOR_VIDEO_MODEL`, `TENSOR_CHAT_VIDEO_DURATION_SECONDS` (5–10).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
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

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function profileVideoDurationSeconds(): number {
  const n = Math.round(Number(Deno.env.get("TENSOR_CHAT_VIDEO_DURATION_SECONDS") ?? "10"));
  if (!Number.isFinite(n)) return 10;
  return Math.max(5, Math.min(10, n));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sessionGate = await requireSessionUser(req);
  if ("response" in sessionGate) return sessionGate.response;
  const sessionUser = sessionGate.user;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ error: "Server misconfigured" }, 500);
  }

  const tensorApiKey = (Deno.env.get("TENSOR_API_KEY") ?? "").trim();
  if (!tensorApiKey && !hasTamsRsaCredentials()) {
    return jsonResponse(
      {
        error:
          "Tensor not configured: set TENSOR_API_KEY (or TAMS_APP_ID + TAMS_PRIVATE_KEY) for profile loop video.",
      },
      503,
    );
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
    const ownerId = String(row.user_id ?? "").trim();
    const isOwner = ownerId.length > 0 && ownerId === sessionUser.id;
    if (!isOwner) {
      const adminGate = await requireAdminUser(req);
      if ("response" in adminGate) return adminGate.response;
    }
    const raw =
      (typeof row.static_image_url === "string" && row.static_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      (typeof row.avatar_url === "string" && row.avatar_url) ||
      null;
    imageUrl = sourceImageUrlForTamsUpload(raw);
  } else {
    table = "companions";
    rowPk = companionId;
    const { data, error } = await svc.from("companions").select("*").eq("id", rowPk).maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Companion not found" }, 404);
    row = data as Record<string, unknown>;
    const adminGate = await requireAdminUser(req);
    if ("response" in adminGate) return adminGate.response;
    const raw =
      (typeof row.static_image_url === "string" && row.static_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      null;
    imageUrl = sourceImageUrlForTamsUpload(raw);
  }

  if (!imageUrl) {
    return jsonResponse({ error: "No public profile image URL — set a static portrait first." }, 400);
  }

  try {
    const fullFromBuilder = buildProfileLoopVideoPrompt(row);
    const extra = `\n\n${I2V_MOUTH_STILL_DIRECTIVE_SHORT} Profile page loop: seamless, identity-locked to the still.`;
    const combined = sanitizePromptForVideoApi(`${fullFromBuilder}\n\n${extra}`);
    const prompt =
      combined.length <= 3000
        ? combined
        : sanitizePromptForVideoApi(
            `${buildMinimalProfileLoopVideoPrompt(row)} ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
          );

    const durationSec = profileVideoDurationSeconds();
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
      return jsonResponse({ error: "Tensor job succeeded but returned no video URL." }, 502);
    }

    const vidRes = await fetch(tensorVideoUrl);
    if (!vidRes.ok) {
      return jsonResponse({ error: `Download from Tensor failed HTTP ${vidRes.status}` }, 502);
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

    return jsonResponse({ success: true, publicUrl, source: "tensor", durationSeconds: durationSec });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});