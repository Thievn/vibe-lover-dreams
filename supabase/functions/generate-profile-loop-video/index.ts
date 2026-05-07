/**
 * Profile portrait loop — Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * Auth: `cc-…` owner; catalog: admin **or** paid user (75 FC) with relationship or discover pin.
 * Requires `XAI_API_KEY` or `GROK_API_KEY`. Optional: `GROK_VIDEO_MODEL`, `GROK_VIDEO_DURATION_SECONDS` (5–15, default 10).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isLustforgeAdminUser, requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  DEFAULT_GROK_VIDEO_MODEL,
  publicHttpsImageUrlForGrok,
  runGrokImagineImageToVideo,
} from "../_shared/xaiGrokVideo.ts";
import {
  buildMinimalProfilePageLoopVideoPrompt,
  buildProfilePageLoopVideoPrompt,
  profilePageLoopMotionNotesViolatePolicy,
  sanitizePromptForVideoApi,
} from "../_shared/profileLoopVideoPrompt.ts";
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";
import { publicApiTeaserGuardResponse } from "../_shared/publicApiTeaserGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAID_LOOP_FC = 75;

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

async function refundProfileLoopFc(
  supabaseClient: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabaseClient
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", userId)
      .maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    const nxt = bal + amount;
    await supabaseClient.from("profiles").update({ tokens_balance: nxt }).eq("user_id", userId);
    await recordFcTransaction(supabaseClient, {
      userId,
      creditsChange: amount,
      balanceAfter: nxt,
      transactionType: "profile_loop_refund",
      description: `Refund: ${reason}`,
      metadata: { fc: amount },
    });
  } catch (e) {
    console.error("refundProfileLoopFc", e);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sessionGate = await requireSessionUser(req);
  if ("response" in sessionGate) return sessionGate.response;
  const sessionUser = sessionGate.user;

  const teaserBlock = await publicApiTeaserGuardResponse(sessionUser);
  if (teaserBlock) return teaserBlock;

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

  let body: { companionId?: string; motionNotes?: string; tokenCost?: number; sourceGeneratedImageId?: string };
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

  const policyErr = profilePageLoopMotionNotesViolatePolicy(motionNotes);
  if (policyErr) {
    return jsonResponse({ error: policyErr }, 400);
  }

  const adminUser = await isLustforgeAdminUser(sessionUser);
  const tokenCostRaw = (body as { tokenCost?: unknown }).tokenCost;
  const tokenCostParsed =
    typeof tokenCostRaw === "number" && Number.isFinite(tokenCostRaw) && tokenCostRaw > 0
      ? Math.floor(tokenCostRaw)
      : 0;

  if (!adminUser && tokenCostParsed !== 0 && tokenCostParsed !== PAID_LOOP_FC) {
    return jsonResponse(
      { error: `tokenCost must be ${PAID_LOOP_FC} for paid profile loop, or omit for staff paths.` },
      400,
    );
  }

  const shouldCharge = !adminUser && tokenCostParsed === PAID_LOOP_FC;

  const svc = createClient(supabaseUrl, serviceKey);

  const sourceGenId =
    typeof (body as { sourceGeneratedImageId?: unknown }).sourceGeneratedImageId === "string"
      ? String((body as { sourceGeneratedImageId: string }).sourceGeneratedImageId).trim()
      : "";

  let sourceOverrideUrl: string | null = null;
  /** Original gallery still URL (for per-user override row when not mutating public cards). */
  let sourceGalleryStillUrl: string | null = null;
  if (sourceGenId) {
    const { data: genRow, error: genErr } = await svc
      .from("generated_images")
      .select("id, image_url, is_video, companion_id, user_id")
      .eq("id", sourceGenId)
      .maybeSingle();
    if (genErr) return jsonResponse({ error: genErr.message }, 500);
    if (!genRow) return jsonResponse({ error: "Source image not found" }, 404);
    if (genRow.is_video === true) {
      return jsonResponse({ error: "Pick a still image (not a video) for loop generation." }, 400);
    }
    const genCid = String(genRow.companion_id ?? "").trim();
    if (genCid !== companionId) {
      return jsonResponse({ error: "That image does not belong to this companion." }, 403);
    }
    const genUid = String(genRow.user_id ?? "").trim();
    if (genUid !== sessionUser.id) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    const rawGen = typeof genRow.image_url === "string" ? genRow.image_url.trim() : "";
    sourceGalleryStillUrl = rawGen || null;
    sourceOverrideUrl = rawGen ? publicHttpsImageUrlForGrok(rawGen) : null;
    if (!sourceOverrideUrl) {
      return jsonResponse({ error: "Could not resolve that gallery image URL." }, 400);
    }
  }

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
    if (!isOwner && !adminUser) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }
    if (sourceOverrideUrl) {
      imageUrl = sourceOverrideUrl;
    } else {
      const raw =
        (typeof row.static_image_url === "string" && row.static_image_url) ||
        (typeof row.image_url === "string" && row.image_url) ||
        (typeof row.avatar_url === "string" && row.avatar_url) ||
        null;
      imageUrl = publicHttpsImageUrlForGrok(raw);
    }
  } else {
    table = "companions";
    rowPk = companionId;
    const { data, error } = await svc.from("companions").select("*").eq("id", rowPk).maybeSingle();
    if (error) return jsonResponse({ error: error.message }, 500);
    if (!data) return jsonResponse({ error: "Companion not found" }, 404);
    row = data as Record<string, unknown>;
    if (!adminUser) {
      if (shouldCharge) {
        const { data: rel } = await svc
          .from("companion_relationships")
          .select("user_id")
          .eq("user_id", sessionUser.id)
          .eq("companion_id", companionId)
          .maybeSingle();
        const { data: pin } = await svc
          .from("user_discover_pins")
          .select("companion_id")
          .eq("user_id", sessionUser.id)
          .eq("companion_id", companionId)
          .maybeSingle();
        if (!rel && !pin) {
          return jsonResponse(
            { error: "Chat with or collect this companion before purchasing a profile loop video." },
            403,
          );
        }
      } else {
        const adminGate = await requireAdminUser(req);
        if ("response" in adminGate) return adminGate.response;
      }
    }
    if (sourceOverrideUrl) {
      imageUrl = sourceOverrideUrl;
    } else {
      const raw =
        (typeof row.static_image_url === "string" && row.static_image_url) ||
        (typeof row.image_url === "string" && row.image_url) ||
        null;
      imageUrl = publicHttpsImageUrlForGrok(raw);
    }
  }

  /** Paid / user paths: prefer this user’s private still override for I2V (does not change discover art). */
  if (!sourceOverrideUrl && !adminUser) {
    const { data: ov } = await svc
      .from("user_companion_portrait_overrides")
      .select("portrait_url")
      .eq("user_id", sessionUser.id)
      .eq("companion_id", companionId)
      .maybeSingle();
    const ovUrl = typeof ov?.portrait_url === "string" ? ov.portrait_url.trim() : "";
    if (ovUrl) {
      const ready = publicHttpsImageUrlForGrok(ovUrl);
      if (ready) imageUrl = ready;
    }
  }

  if (!imageUrl) {
    return jsonResponse({ error: "No public profile image URL — set a static portrait first." }, 400);
  }

  let tokensCharged = false;
  const chargedAmount = shouldCharge ? PAID_LOOP_FC : 0;

  if (shouldCharge) {
    const { data: profRow, error: profRowErr } = await svc
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", sessionUser.id)
      .maybeSingle();
    if (profRowErr || profRow == null) {
      return jsonResponse({ error: "Could not read forge credits balance." }, 500);
    }
    if (profRow.tokens_balance < PAID_LOOP_FC) {
      return jsonResponse(
        { error: `Not enough forge credits (${PAID_LOOP_FC} required).`, code: "INSUFFICIENT_TOKENS" },
        402,
      );
    }
    const nextBal = profRow.tokens_balance - PAID_LOOP_FC;
    const { error: deductErr } = await svc
      .from("profiles")
      .update({ tokens_balance: nextBal })
      .eq("user_id", sessionUser.id);
    if (deductErr) {
      return jsonResponse({ error: deductErr.message || "Could not reserve forge credits." }, 500);
    }
    tokensCharged = true;
    await recordFcTransaction(svc, {
      userId: sessionUser.id,
      creditsChange: -PAID_LOOP_FC,
      balanceAfter: nextBal,
      transactionType: "profile_loop_video",
      description: "Profile loop video (Grok I2V)",
      metadata: { companionId, fc: PAID_LOOP_FC },
    });
  }

  try {
    const fullFromBuilder = buildProfilePageLoopVideoPrompt(row, motionNotes);
    const combined = sanitizePromptForVideoApi(fullFromBuilder);
    const MAX_VIDEO_PROMPT = 3000;
    const prompt =
      combined.length <= MAX_VIDEO_PROMPT
        ? combined
        : sanitizePromptForVideoApi(buildMinimalProfilePageLoopVideoPrompt(row, motionNotes));

    const durationSec = profileVideoDurationSeconds();
    const videoModel = (Deno.env.get("GROK_VIDEO_MODEL") ?? DEFAULT_GROK_VIDEO_MODEL).trim() ||
      DEFAULT_GROK_VIDEO_MODEL;

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
      if (tokensCharged) {
        await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "xAI video download failed");
      }
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
      if (tokensCharged) {
        await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "storage upload failed");
      }
      return jsonResponse({ error: `Storage upload failed: ${upErr.message}` }, 500);
    }

    const publicUrl = storage.storage.from("companion-images").getPublicUrl(fileName).data.publicUrl;

    if (adminUser) {
      const { error: upRow } = await svc
        .from(table)
        .update({
          animated_image_url: publicUrl,
          profile_loop_video_enabled: true,
        })
        .eq("id", rowPk);

      if (upRow) {
        if (tokensCharged) {
          await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "database update failed");
        }
        return jsonResponse({ error: upRow.message }, 500);
      }
    } else {
      const { data: existingOv } = await svc
        .from("user_companion_portrait_overrides")
        .select("portrait_url")
        .eq("user_id", sessionUser.id)
        .eq("companion_id", companionId)
        .maybeSingle();
      let portraitStill =
        (typeof existingOv?.portrait_url === "string" && existingOv.portrait_url.trim()) ||
        (sourceGalleryStillUrl && sourceGalleryStillUrl.trim()) ||
        "";
      if (!portraitStill) {
        const raw =
          companionId.startsWith("cc-")
            ? (typeof row.static_image_url === "string" && row.static_image_url) ||
              (typeof row.image_url === "string" && row.image_url) ||
              (typeof row.avatar_url === "string" && row.avatar_url)
            : (typeof row.static_image_url === "string" && row.static_image_url) ||
              (typeof row.image_url === "string" && row.image_url);
        portraitStill = typeof raw === "string" ? raw.trim() : "";
      }
      if (!portraitStill) {
        if (tokensCharged) {
          await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "could not resolve portrait still for override");
        }
        return jsonResponse({ error: "Could not resolve a still portrait for your private profile." }, 500);
      }
      const { error: ovErr } = await svc.from("user_companion_portrait_overrides").upsert(
        {
          user_id: sessionUser.id,
          companion_id: companionId,
          portrait_url: portraitStill,
          animated_portrait_url: publicUrl,
          profile_loop_video_enabled: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,companion_id" },
      );
      if (ovErr) {
        if (tokensCharged) {
          await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "override save failed");
        }
        return jsonResponse({ error: ovErr.message }, 500);
      }
    }

    const galleryUserId = companionId.startsWith("cc-")
      ? (String((row as { user_id?: unknown }).user_id ?? "").trim() || sessionUser.id)
      : sessionUser.id;
    const galleryPrompt = [
      "Profile loop video (Grok I2V)",
      motionNotes ? motionNotes.slice(0, 400) : "Portrait-driven motion",
    ].join(" · ");

    try {
      const { error: gErr } = await svc.from("generated_images").insert({
        user_id: galleryUserId,
        companion_id: companionId,
        image_url: publicUrl,
        prompt: galleryPrompt.slice(0, 2000),
        is_video: true,
        saved_to_companion_gallery: true,
        saved_to_personal_gallery: false,
      });
      if (gErr) console.error("profile_loop gallery insert:", gErr.message);
    } catch (e) {
      console.error("profile_loop gallery insert", e);
    }

    return jsonResponse({ success: true, publicUrl, source: "grok", durationSeconds: durationSec });
  } catch (e) {
    if (tokensCharged) {
      await refundProfileLoopFc(
        svc,
        sessionUser.id,
        chargedAmount,
        e instanceof Error ? e.message : "profile loop video error",
      );
    }
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
