/**
 * Profile portrait loop — Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * Auth: signed-in owner of `cc-…` custom characters, or admin for any companion (including catalog).
 * Requires `XAI_API_KEY` or `GROK_API_KEY`. Optional: `GROK_VIDEO_MODEL`, `GROK_VIDEO_DURATION_SECONDS` (5–15, default 10).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
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

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function profileVideoDurationSeconds(): number {
  const n = Math.round(Number(Deno.env.get("GROK_VIDEO_DURATION_SECONDS") ?? "10"));
  if (!Number.isFinite(n)) return 10;
  return Math.max(5, Math.min(15, n));
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

  const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
  if (!xaiKey) {
    return jsonResponse(
      {
        error:
          "Grok / xAI not configured: set Edge Function secret XAI_API_KEY or GROK_API_KEY for profile loop video.",
      },
      503,
    );
  }

  let body: { companionId?: string; motionNotes?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }
  const companionId = typeof body.companionId === "string" ? body.companionId.trim() : "";
  if (!companionId) {
    return jsonResponse({ error: "companionId required" }, 400);
  }
  const motionNotesRaw = typeof body.motionNotes === "string" ? body.motionNotes.trim() : "";
  const motionNotes = motionNotesRaw.slice(0, 800);

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
    imageUrl = publicHttpsImageUrlForGrok(raw);
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
    imageUrl = publicHttpsImageUrlForGrok(raw);
  }

  if (!imageUrl) {
    return jsonResponse({ error: "No public profile image URL — set a static portrait first." }, 400);
  }

  try {
    const fullFromBuilder = buildProfileLoopVideoPrompt(row);
    const extra = `\n\n${I2V_MOUTH_STILL_DIRECTIVE_SHORT} Profile page loop: seamless, identity-locked to the still.`;
    const userMotion = motionNotes
      ? sanitizePromptForVideoApi(
        `\n\nEditor motion / camera direction (weigh this for movement if not contradictory): ${motionNotes}`,
      )
      : "";
    const combined = sanitizePromptForVideoApi(`${fullFromBuilder}\n\n${extra}${userMotion}`);
    const prompt =
      combined.length <= 3000
        ? combined
        : sanitizePromptForVideoApi(
            `${buildMinimalProfileLoopVideoPrompt(row)} ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
          );

    const durationSec = profileVideoDurationSeconds();
    const videoModel = (Deno.env.get("GROK_VIDEO_MODEL") ?? DEFAULT_GROK_VIDEO_MODEL).trim() || DEFAULT_GROK_VIDEO_MODEL;

    const { videoUrl: xaiVideoUrl } = await runGrokImagineImageToVideo({
      apiKey: xaiKey,
      prompt,
      sourceImageUrl: imageUrl,
      durationSeconds: durationSec,
      aspectRatio: "2:3",
      resolution: "720p",
      model: videoModel,
      maxWaitMs: 20 * 60_000,
    });

    const vidRes = await fetch(xaiVideoUrl);
    if (!vidRes.ok) {
      return jsonResponse({ error: `Download from xAI video URL failed HTTP ${vidRes.status}` }, 502);
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

    return jsonResponse({ success: true, publicUrl, source: "grok", durationSeconds: durationSec });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});