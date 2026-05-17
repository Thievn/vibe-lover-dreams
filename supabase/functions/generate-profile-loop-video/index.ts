/**
 * Profile portrait loop — Grok Imagine image-to-video (`grok-imagine-video` via xAI).
 * Auth: `cc-…` owner; catalog: admin **or** paid user (75 FC) with relationship or discover pin.
 * Requires `XAI_API_KEY` or `GROK_API_KEY`. Optional: `GROK_VIDEO_MODEL`, `GROK_VIDEO_DURATION_SECONDS` (5–15, default 8).
 *
 * **Async jobs:** xAI can take minutes; Supabase Edge wall clock is ~150s (free) / ~400s (paid). We start the
 * render, store `request_id` in `profile_loop_video_jobs`, return `{ phase: "poll", jobId }`, and the client
 * polls with `{ jobId }` until `{ phase: "complete", publicUrl }`.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isLustforgeAdminUser, requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  DEFAULT_GROK_VIDEO_MODEL,
  publicHttpsImageUrlForGrok,
  pollGrokVideoRequestOnce,
  startGrokImagineImageToVideo,
} from "../_shared/xaiGrokVideo.ts";
import {
  buildMinimalProfilePageLoopVideoPrompt,
  buildProfilePageLoopVideoPrompt,
  sanitizePromptForVideoApi,
} from "../_shared/profileLoopVideoPrompt.ts";
import {
  profilePageLoopMotionNotesViolatePolicy,
  sanitizeProfileLoopUserMotionNotes,
} from "../_shared/profileLoopMotionPolicy.ts";
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";
import { publicApiTeaserGuardResponse } from "../_shared/publicApiTeaserGate.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAID_LOOP_FC = 75;
/** Reuse in-flight xAI jobs instead of starting duplicates on retry. */
const IN_FLIGHT_JOB_MS = 45 * 60_000;

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function profileVideoDurationSeconds(): number {
  const n = Math.round(Number(Deno.env.get("GROK_VIDEO_DURATION_SECONDS") ?? "8"));
  if (!Number.isFinite(n)) return 8;
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

type PersistArgs = {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  companionId: string;
  table: "companions" | "custom_characters";
  rowPk: string;
  row: Record<string, unknown>;
  adminUser: boolean;
  sourceGalleryStillUrl: string | null;
  publicUrl: string;
  tokensCharged: boolean;
  chargedAmount: number;
  motionNotes: string;
  isDiscoverListedForgeTemplate: boolean;
};

const FINALIZING_STUCK_MS = 12 * 60_000;
/** Fail/refund pending jobs stuck longer than this (xAI or client zombie). */
const PENDING_STUCK_MS = 22 * 60_000;

function isLoopVideoStorageUrl(url: string): boolean {
  const u = url.trim();
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("/profile-loops/");
}

type ProfileLoopJobRow = Record<string, unknown>;

function parseJobTimestamp(iso: unknown): number {
  if (typeof iso !== "string" || !iso.trim()) return NaN;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : NaN;
}

function profileLoopJobAgeMs(job: ProfileLoopJobRow): number {
  const updated = parseJobTimestamp(job.updated_at);
  const created = parseJobTimestamp(job.created_at);
  const anchor = Number.isFinite(updated) ? updated : created;
  return Number.isFinite(anchor) ? Date.now() - anchor : 0;
}

function pollWorkerPhaseForJob(job: ProfileLoopJobRow): "rendering" | "saving" {
  return job.status === "finalizing" ? "saving" : "rendering";
}

async function resolveLatestGalleryStillUrl(
  svc: ReturnType<typeof createClient>,
  companionId: string,
): Promise<string | null> {
  const { data: genRows } = await svc
    .from("generated_images")
    .select("image_url, created_at")
    .eq("companion_id", companionId)
    .eq("is_video", false)
    .order("created_at", { ascending: false })
    .limit(10);
  for (const g of genRows ?? []) {
    const raw = typeof g.image_url === "string" ? g.image_url.trim() : "";
    if (!raw || isLoopVideoStorageUrl(raw)) continue;
    const ready = publicHttpsImageUrlForGrok(raw);
    if (ready) return ready;
  }
  return null;
}

async function resolveProfileLoopSourceImageUrl(
  svc: ReturnType<typeof createClient>,
  sessionUserId: string,
  companionId: string,
  row: Record<string, unknown>,
  sourceOverrideUrl: string | null,
  adminUser: boolean,
): Promise<string | null> {
  if (sourceOverrideUrl) return sourceOverrideUrl;
  const raw =
    (typeof row.static_image_url === "string" && row.static_image_url) ||
    (typeof row.image_url === "string" && row.image_url) ||
    (typeof row.avatar_url === "string" && row.avatar_url) ||
    null;
  let imageUrl = publicHttpsImageUrlForGrok(raw);
  if (!imageUrl && !adminUser) {
    const { data: ov } = await svc
      .from("user_companion_portrait_overrides")
      .select("portrait_url")
      .eq("user_id", sessionUserId)
      .eq("companion_id", companionId)
      .maybeSingle();
    const ovUrl = typeof ov?.portrait_url === "string" ? ov.portrait_url.trim() : "";
    if (ovUrl) imageUrl = publicHttpsImageUrlForGrok(ovUrl);
  }
  if (!imageUrl) imageUrl = await resolveLatestGalleryStillUrl(svc, companionId);
  return imageUrl;
}

async function resolveBestKnownLoopVideoUrl(
  svc: ReturnType<typeof createClient>,
  sessionUserId: string,
  companionId: string,
  row: Record<string, unknown>,
): Promise<string | null> {
  const { data: jobs } = await svc
    .from("profile_loop_video_jobs")
    .select("public_url, xai_video_url, status, created_at")
    .eq("user_id", sessionUserId)
    .eq("companion_id", companionId)
    .order("created_at", { ascending: false })
    .limit(8);
  for (const j of jobs ?? []) {
    const pub = typeof j.public_url === "string" ? j.public_url.trim() : "";
    if (pub && isLoopVideoStorageUrl(pub)) return pub;
  }
  const rowAnim = typeof row.animated_image_url === "string" ? row.animated_image_url.trim() : "";
  if (rowAnim && isLoopVideoStorageUrl(rowAnim)) return rowAnim;
  const { data: genRows } = await svc
    .from("generated_images")
    .select("image_url")
    .eq("companion_id", companionId)
    .eq("is_video", true)
    .order("created_at", { ascending: false })
    .limit(5);
  for (const g of genRows ?? []) {
    const u = typeof g.image_url === "string" ? g.image_url.trim() : "";
    if (u && isLoopVideoStorageUrl(u)) return u;
  }
  return null;
}

async function ensureGalleryVideoRow(
  svc: ReturnType<typeof createClient>,
  galleryUserId: string,
  companionId: string,
  publicUrl: string,
  motionNotes: string,
): Promise<void> {
  const { data: existing } = await svc
    .from("generated_images")
    .select("id")
    .eq("companion_id", companionId)
    .eq("is_video", true)
    .eq("image_url", publicUrl)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return;
  const galleryPrompt = [
    "Profile loop video (Grok I2V)",
    motionNotes ? motionNotes.slice(0, 400) : "Portrait-driven motion",
  ].join(" · ");
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
}

async function failProfileLoopJob(
  svc: ReturnType<typeof createClient>,
  job: ProfileLoopJobRow,
  sessionUserId: string,
  reason: string,
): Promise<void> {
  const jobId = String(job.id ?? "");
  if (!jobId) return;
  const chargeFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
  const alreadyRefunded = Boolean(job.refunded);
  if (chargeFc > 0 && !alreadyRefunded) {
    await refundProfileLoopFc(svc, sessionUserId, chargeFc, reason);
  }
  await svc
    .from("profile_loop_video_jobs")
    .update({
      status: "failed",
      refunded: chargeFc > 0 && !alreadyRefunded ? true : Boolean(job.refunded),
      error_message: reason,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);
}

async function resolvePortraitStillForLoop(
  svc: ReturnType<typeof createClient>,
  sessionUserId: string,
  companionId: string,
  row: Record<string, unknown>,
  sourceGalleryStillUrl: string | null,
): Promise<string> {
  const { data: existingOv } = await svc
    .from("user_companion_portrait_overrides")
    .select("portrait_url")
    .eq("user_id", sessionUserId)
    .eq("companion_id", companionId)
    .maybeSingle();
  let portraitStill =
    (typeof existingOv?.portrait_url === "string" && existingOv.portrait_url.trim()) ||
    (sourceGalleryStillUrl && sourceGalleryStillUrl.trim()) ||
    "";
  if (!portraitStill) {
    const raw =
      (typeof row.static_image_url === "string" && row.static_image_url) ||
      (typeof row.image_url === "string" && row.image_url) ||
      (typeof row.avatar_url === "string" && row.avatar_url);
    portraitStill = typeof raw === "string" ? raw.trim() : "";
  }
  if (!portraitStill) {
    const fromGallery = await resolveLatestGalleryStillUrl(svc, companionId);
    if (fromGallery) portraitStill = fromGallery;
  }
  return portraitStill;
}

/** Ensures profile/chat merge sees the loop (override row). */
async function upsertUserLoopPortraitOverride(
  svc: ReturnType<typeof createClient>,
  sessionUserId: string,
  companionId: string,
  publicUrl: string,
  row: Record<string, unknown>,
  sourceGalleryStillUrl: string | null,
): Promise<void> {
  const portraitStill = await resolvePortraitStillForLoop(svc, sessionUserId, companionId, row, sourceGalleryStillUrl);
  if (!portraitStill) {
    throw new Error("Could not resolve a still portrait for your private profile.");
  }
  const { error: ovErr } = await svc.from("user_companion_portrait_overrides").upsert(
    {
      user_id: sessionUserId,
      companion_id: companionId,
      portrait_url: portraitStill,
      animated_portrait_url: publicUrl,
      profile_loop_video_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,companion_id" },
  );
  if (ovErr) throw new Error(ovErr.message);
}

/** DB + gallery updates after MP4 is in Storage (same paths as legacy single-shot flow). */
async function persistProfileLoopAfterPublicUrl(args: PersistArgs): Promise<void> {
  const {
    svc,
    sessionUser,
    companionId,
    table,
    rowPk,
    row,
    adminUser,
    sourceGalleryStillUrl,
    publicUrl,
    tokensCharged,
    chargedAmount,
    motionNotes,
    isDiscoverListedForgeTemplate,
  } = args;

  if (table === "custom_characters" && isDiscoverListedForgeTemplate) {
    if (adminUser) {
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
          (typeof row.static_image_url === "string" && row.static_image_url) ||
          (typeof row.image_url === "string" && row.image_url) ||
          (typeof row.avatar_url === "string" && row.avatar_url);
        portraitStill = typeof raw === "string" ? raw.trim() : "";
      }
      if (!portraitStill) {
        if (tokensCharged) {
          await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "could not resolve portrait still for override");
        }
        throw new Error("Could not resolve a still portrait for your private profile.");
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
        throw new Error(ovErr.message);
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
          (typeof row.static_image_url === "string" && row.static_image_url) ||
          (typeof row.image_url === "string" && row.image_url) ||
          (typeof row.avatar_url === "string" && row.avatar_url);
        portraitStill = typeof raw === "string" ? raw.trim() : "";
      }
      if (!portraitStill) {
        if (tokensCharged) {
          await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "could not resolve portrait still for override");
        }
        throw new Error("Could not resolve a still portrait for your private profile.");
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
        throw new Error(ovErr.message);
      }
    }
  } else if (table === "custom_characters") {
    const { error: upRow } = await svc
      .from("custom_characters")
      .update({
        animated_image_url: publicUrl,
        profile_loop_video_enabled: true,
      })
      .eq("id", rowPk);

    if (upRow) {
      if (tokensCharged) {
        await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "database update failed");
      }
      throw new Error(upRow.message);
    }
    await upsertUserLoopPortraitOverride(
      svc,
      sessionUser.id,
      companionId,
      publicUrl,
      row,
      sourceGalleryStillUrl,
    );
  } else if (adminUser && table === "companions") {
    const { error: upRow } = await svc
      .from("companions")
      .update({
        animated_image_url: publicUrl,
        profile_loop_video_enabled: true,
      })
      .eq("id", rowPk);

    if (upRow) {
      if (tokensCharged) {
        await refundProfileLoopFc(svc, sessionUser.id, chargedAmount, "database update failed");
      }
      throw new Error(upRow.message);
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
      throw new Error("Could not resolve a still portrait for your private profile.");
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
      throw new Error(ovErr.message);
    }
  }

  const galleryUserId =
    adminUser && isDiscoverListedForgeTemplate && companionId.startsWith("cc-")
      ? sessionUser.id
      : companionId.startsWith("cc-")
        ? (String((row as { user_id?: unknown }).user_id ?? "").trim() || sessionUser.id)
        : sessionUser.id;
  await ensureGalleryVideoRow(svc, galleryUserId, companionId, publicUrl, motionNotes);
}

async function uploadMp4FromXaiUrl(
  svc: ReturnType<typeof createClient>,
  xaiVideoUrl: string,
  fileName: string,
): Promise<{ error: { message: string } | null }> {
  const vidRes = await fetch(xaiVideoUrl);
  if (!vidRes.ok) {
    return { error: { message: `Download from xAI video URL failed HTTP ${vidRes.status}` } };
  }
  const streamBody = vidRes.body;
  let upErr: { message: string } | null = null;
  if (streamBody) {
    const r0 = await svc.storage.from("companion-images").upload(fileName, streamBody, {
      contentType: "video/mp4",
      upsert: true,
    });
    upErr = r0.error;
  }
  if (upErr || !streamBody) {
    const vidRetry = streamBody && upErr ? await fetch(xaiVideoUrl) : vidRes;
    if (!vidRetry.ok) {
      return { error: { message: `Download from xAI video URL failed HTTP ${vidRetry.status}` } };
    }
    const buf = new Uint8Array(await vidRetry.arrayBuffer());
    const r1 = await svc.storage.from("companion-images").upload(fileName, buf, {
      contentType: "video/mp4",
      upsert: true,
    });
    upErr = r1.error;
  }
  return { error: upErr };
}

/** Upload xAI URL → Storage, persist companion + override, mark job complete. */
async function finalizeProfileLoopJob(
  svc: ReturnType<typeof createClient>,
  sessionUser: { id: string },
  job: ProfileLoopJobRow,
  xaiVideoUrl: string,
): Promise<{ publicUrl: string; durationSeconds: number }> {
  const jobId = String(job.id ?? "");
  const ctx = (job.context ?? {}) as Record<string, unknown>;
  const companionId = String(job.companion_id ?? "").trim();
  const table = ctx.table === "custom_characters" ? "custom_characters" : "companions";
  const rowPk = String(ctx.rowPk ?? "").trim();
  const adminUser = Boolean(ctx.adminUser);
  const chargedFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
  const tokensCharged = chargedFc > 0;
  const isDiscoverListedForgeTemplate = Boolean(ctx.isDiscoverListedForgeTemplate);
  const sourceGalleryStillUrl =
    typeof ctx.sourceGalleryStillUrl === "string" && ctx.sourceGalleryStillUrl.trim()
      ? ctx.sourceGalleryStillUrl.trim()
      : null;
  const motionNotes = String(ctx.motionNotesForGallery ?? "").trim();
  const durationSec =
    typeof job.duration_seconds === "number" && Number.isFinite(job.duration_seconds)
      ? job.duration_seconds
      : Math.round(Number(ctx.durationSeconds ?? 8)) || 8;

  const { data: rowData, error: rowErr } = await svc.from(table).select("*").eq("id", rowPk).maybeSingle();
  if (rowErr || !rowData) {
    throw new Error("Companion row missing — try generating again.");
  }
  const row = rowData as Record<string, unknown>;

  const safeId = companionId.replace(/[^a-zA-Z0-9-_]/g, "_").slice(0, 120);
  const fileName = `profile-loops/${safeId}/${Date.now()}.mp4`;

  const { error: upErr } = await uploadMp4FromXaiUrl(svc, xaiVideoUrl, fileName);
  if (upErr) {
    throw new Error(`Storage upload failed: ${upErr.message}`);
  }

  const publicUrl = svc.storage.from("companion-images").getPublicUrl(fileName).data.publicUrl;

  await persistProfileLoopAfterPublicUrl({
    svc,
    sessionUser,
    companionId,
    table,
    rowPk,
    row,
    adminUser,
    sourceGalleryStillUrl,
    publicUrl,
    tokensCharged,
    chargedAmount: chargedFc,
    motionNotes,
    isDiscoverListedForgeTemplate,
  });

  await svc
    .from("profile_loop_video_jobs")
    .update({
      status: "complete",
      public_url: publicUrl,
      xai_video_url: xaiVideoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId);

  return { publicUrl, durationSeconds: durationSec };
}

/** Fail or finalize a stale in-flight job so a new generation can start. Returns true if job cleared. */
async function reconcileStaleInFlightProfileLoopJob(args: {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  xaiKey: string;
  job: ProfileLoopJobRow;
}): Promise<boolean> {
  const { svc, sessionUser, xaiKey, job } = args;
  const jobId = String(job.id ?? "");
  if (!jobId) return true;
  const ageMs = profileLoopJobAgeMs(job);
  if (ageMs < PENDING_STUCK_MS) return false;

  if (job.status === "finalizing") {
    const xaiStored = typeof job.xai_video_url === "string" ? job.xai_video_url.trim() : "";
    if (xaiStored) {
      try {
        await finalizeProfileLoopJob(svc, sessionUser, job, xaiStored);
        return true;
      } catch (e) {
        console.error("reconcile finalize finalizing job:", e);
      }
    }
    await failProfileLoopJob(svc, job, sessionUser.id, "Profile loop save timed out — try again.");
    return true;
  }

  if (job.status !== "pending") return true;

  const rid = String(job.xai_request_id ?? "").trim();
  if (!rid) {
    await failProfileLoopJob(svc, job, sessionUser.id, "Invalid job state (missing xAI request id).");
    return true;
  }

  const pr = await pollGrokVideoRequestOnce(xaiKey, rid);
  if (pr.status === "done") {
    const { data: claimed } = await svc
      .from("profile_loop_video_jobs")
      .update({
        status: "finalizing",
        xai_video_url: pr.videoUrl,
        duration_seconds: pr.duration ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();
    if (claimed?.id) {
      try {
        await finalizeProfileLoopJob(svc, sessionUser, claimed as ProfileLoopJobRow, pr.videoUrl);
        return true;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await failProfileLoopJob(svc, job, sessionUser.id, msg);
        return true;
      }
    }
    return true;
  }

  if (pr.status === "failed" || pr.status === "expired") {
    const reason =
      pr.status === "expired" ? "Grok video: request expired before completion." : `Grok video failed: ${pr.message}`;
    await failProfileLoopJob(svc, job, sessionUser.id, reason);
    return true;
  }

  await failProfileLoopJob(svc, job, sessionUser.id, "Grok did not finish in time — try again.");
  return true;
}

async function loadCompanionRowForLoop(
  svc: ReturnType<typeof createClient>,
  companionId: string,
  sessionUserId: string,
  adminUser: boolean,
): Promise<
  | { error: Response }
  | {
      table: "companions" | "custom_characters";
      rowPk: string;
      row: Record<string, unknown>;
      isDiscoverListedForgeTemplate: boolean;
    }
> {
  if (companionId.startsWith("cc-")) {
    const rowPk = companionId.slice(3);
    const { data, error } = await svc.from("custom_characters").select("*").eq("id", rowPk).maybeSingle();
    if (error) return { error: jsonResponse({ error: error.message }, 500) };
    if (!data) return { error: jsonResponse({ error: "Companion not found" }, 404) };
    const row = data as Record<string, unknown>;
    const ownerId = String(row.user_id ?? "").trim();
    if (ownerId && ownerId !== sessionUserId && !adminUser) {
      return { error: jsonResponse({ error: "Forbidden" }, 403) };
    }
    const isDiscoverListedForgeTemplate =
      Boolean((row as { is_public?: unknown }).is_public) &&
      Boolean((row as { approved?: unknown }).approved);
    return { table: "custom_characters", rowPk, row, isDiscoverListedForgeTemplate };
  }
  const rowPk = companionId;
  const { data, error } = await svc.from("companions").select("*").eq("id", rowPk).maybeSingle();
  if (error) return { error: jsonResponse({ error: error.message }, 500) };
  if (!data) return { error: jsonResponse({ error: "Companion not found" }, 404) };
  return {
    table: "companions",
    rowPk,
    row: data as Record<string, unknown>,
    isDiscoverListedForgeTemplate: false,
  };
}

async function attachKnownLoopVideoToProfile(args: {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  companionId: string;
  adminUser: boolean;
  motionNotes?: string;
}): Promise<Response> {
  const { svc, sessionUser, companionId, adminUser, motionNotes = "Profile loop sync" } = args;

  const loaded = await loadCompanionRowForLoop(svc, companionId, sessionUser.id, adminUser);
  if ("error" in loaded) return loaded.error;
  const { table, rowPk, row, isDiscoverListedForgeTemplate } = loaded;

  const publicUrl = await resolveBestKnownLoopVideoUrl(svc, sessionUser.id, companionId, row);
  if (!publicUrl || !isLoopVideoStorageUrl(publicUrl)) {
    return jsonResponse({
      success: true,
      synced: false,
      message: "No saved loop video found for this companion yet.",
    });
  }

  try {
    await persistProfileLoopAfterPublicUrl({
      svc,
      sessionUser,
      companionId,
      table,
      rowPk,
      row,
      adminUser,
      sourceGalleryStillUrl: null,
      publicUrl,
      tokensCharged: false,
      chargedAmount: 0,
      motionNotes,
      isDiscoverListedForgeTemplate,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }

  return jsonResponse({
    success: true,
    phase: "complete",
    synced: true,
    publicUrl,
    source: "sync",
  });
}

async function handleCancelProfileLoopVideo(args: {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  companionId: string;
  jobId?: string;
}): Promise<Response> {
  const { svc, sessionUser, companionId, jobId } = args;
  const { data: job, error } = jobId
    ? await svc
        .from("profile_loop_video_jobs")
        .select("*")
        .eq("id", jobId)
        .eq("user_id", sessionUser.id)
        .maybeSingle()
    : await svc
        .from("profile_loop_video_jobs")
        .select("*")
        .eq("user_id", sessionUser.id)
        .eq("companion_id", companionId)
        .in("status", ["pending", "finalizing"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
  if (error) return jsonResponse({ error: error.message }, 500);
  if (!job) {
    return jsonResponse({ success: true, cancelled: false, message: "No in-flight loop job to cancel." });
  }
  const st = String(job.status ?? "");
  if (st !== "pending" && st !== "finalizing") {
    return jsonResponse({ success: true, cancelled: false, message: "Job is not in progress." });
  }
  await failProfileLoopJob(svc, job as ProfileLoopJobRow, sessionUser.id, "Cancelled by user.");
  return jsonResponse({ success: true, cancelled: true });
}

async function handleProfileLoopJobPoll(args: {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  xaiKey: string;
  jobId: string;
}): Promise<Response> {
  const { svc, sessionUser, xaiKey, jobId } = args;

  const { data: job, error: jobErr } = await svc
    .from("profile_loop_video_jobs")
    .select("*")
    .eq("id", jobId)
    .maybeSingle();
  if (jobErr) return jsonResponse({ error: jobErr.message }, 500);
  if (!job) return jsonResponse({ error: "Job not found" }, 404);
  if (String(job.user_id ?? "") !== sessionUser.id) {
    return jsonResponse({ error: "Forbidden" }, 403);
  }

  if (job.status === "complete" && typeof job.public_url === "string" && job.public_url.trim()) {
    return jsonResponse({
      success: true,
      phase: "complete",
      publicUrl: job.public_url.trim(),
      durationSeconds: typeof job.duration_seconds === "number" ? job.duration_seconds : undefined,
      source: "grok",
      workerPhase: "saving",
    });
  }
  if (job.status === "failed") {
    const em = typeof job.error_message === "string" && job.error_message.trim()
      ? job.error_message.trim()
      : "Profile loop video failed.";
    return jsonResponse({ error: em }, 400);
  }

  const updatedAtMs = job.updated_at ? Date.parse(String(job.updated_at)) : NaN;
  const stuckFinalizing =
    job.status === "finalizing" &&
    Number.isFinite(updatedAtMs) &&
    Date.now() - updatedAtMs > FINALIZING_STUCK_MS;

  if (stuckFinalizing) {
    const reason = "Profile loop save timed out — try Sync loop on profile or generate again.";
    const chargeFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
    if (chargeFc > 0 && !job.refunded) {
      await refundProfileLoopFc(svc, sessionUser.id, chargeFc, reason);
    }
    await svc
      .from("profile_loop_video_jobs")
      .update({
        status: "failed",
        refunded: chargeFc > 0 ? true : Boolean(job.refunded),
        error_message: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return jsonResponse({ error: reason }, 500);
  }

  if (job.status === "finalizing") {
    const xaiStored = typeof job.xai_video_url === "string" ? job.xai_video_url.trim() : "";
    if (xaiStored) {
      try {
        const { publicUrl, durationSeconds } = await finalizeProfileLoopJob(svc, sessionUser, job, xaiStored);
        return jsonResponse({
          success: true,
          phase: "complete",
          publicUrl,
          source: "grok",
          durationSeconds,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        const chargeFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
        if (chargeFc > 0 && !job.refunded) {
          await refundProfileLoopFc(svc, sessionUser.id, chargeFc, msg);
        }
        await svc
          .from("profile_loop_video_jobs")
          .update({
            status: "failed",
            refunded: chargeFc > 0 ? true : Boolean(job.refunded),
            error_message: msg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobId);
        return jsonResponse({ error: msg }, 500);
      }
    }
    return jsonResponse({
      success: true,
      phase: "poll",
      jobId,
      pollAfterMs: 2500,
      workerPhase: pollWorkerPhaseForJob(job),
    });
  }

  const rid = String(job.xai_request_id ?? "").trim();
  if (!rid) {
    return jsonResponse({ error: "Invalid job state (missing xAI request id)." }, 500);
  }

  const pr = await pollGrokVideoRequestOnce(xaiKey, rid);
  if (pr.status === "processing") {
    if (job.status === "pending" && profileLoopJobAgeMs(job) > PENDING_STUCK_MS) {
      await failProfileLoopJob(
        svc,
        job,
        sessionUser.id,
        "Grok did not finish in time — try again.",
      );
      return jsonResponse({ error: "Grok did not finish in time — try again." }, 500);
    }
    await svc.from("profile_loop_video_jobs").update({ updated_at: new Date().toISOString() }).eq("id", jobId);
    return jsonResponse({
      success: true,
      phase: "poll",
      jobId,
      pollAfterMs: 4500,
      workerPhase: pollWorkerPhaseForJob(job),
    });
  }

  if (pr.status === "failed" || pr.status === "expired") {
    const reason =
      pr.status === "expired" ? "Grok video: request expired before completion." : `Grok video failed: ${pr.message}`;
    const chargeFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
    const alreadyRefunded = Boolean(job.refunded);
    if (chargeFc > 0 && !alreadyRefunded) {
      await refundProfileLoopFc(svc, sessionUser.id, chargeFc, reason);
    }
    await svc
      .from("profile_loop_video_jobs")
      .update({
        status: "failed",
        refunded: chargeFc > 0 && !alreadyRefunded ? true : Boolean(job.refunded),
        error_message: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return jsonResponse({ error: reason }, 500);
  }

  const { data: claimed, error: claimErr } = await svc
    .from("profile_loop_video_jobs")
    .update({
      status: "finalizing",
      xai_video_url: pr.videoUrl,
      duration_seconds: pr.duration ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", jobId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (claimErr) {
    return jsonResponse({ error: claimErr.message }, 500);
  }
  if (!claimed?.id) {
    const { data: again } = await svc
      .from("profile_loop_video_jobs")
      .select("status, public_url, duration_seconds")
      .eq("id", jobId)
      .maybeSingle();
    if (again?.status === "complete" && typeof again.public_url === "string" && again.public_url.trim()) {
      return jsonResponse({
        success: true,
        phase: "complete",
        publicUrl: again.public_url.trim(),
        durationSeconds: typeof again.duration_seconds === "number" ? again.duration_seconds : undefined,
        source: "grok",
      });
    }
    return jsonResponse({
      success: true,
      phase: "poll",
      jobId,
      pollAfterMs: 2000,
      workerPhase: pollWorkerPhaseForJob(job),
    });
  }

  try {
    const { publicUrl, durationSeconds } = await finalizeProfileLoopJob(svc, sessionUser, job, pr.videoUrl);
    return jsonResponse({
      success: true,
      phase: "complete",
      publicUrl,
      source: "grok",
      durationSeconds,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const chargedFc = Math.max(0, Math.floor(Number(job.charge_fc ?? 0)));
    const tokensCharged = chargedFc > 0;
    if (tokensCharged && !job.refunded) {
      await refundProfileLoopFc(svc, sessionUser.id, chargedFc, msg);
    }
    await svc
      .from("profile_loop_video_jobs")
      .update({
        status: "failed",
        refunded: tokensCharged ? true : Boolean(job.refunded),
        error_message: msg,
        updated_at: new Date().toISOString(),
      })
      .eq("id", jobId);
    return jsonResponse({ error: msg }, 500);
  }
}

/** Re-attach the best known loop MP4 to profile + override (gallery / jobs / row). */
async function handleSyncProfileLoopVideo(args: {
  svc: ReturnType<typeof createClient>;
  sessionUser: { id: string };
  companionId: string;
  adminUser: boolean;
  xaiKey: string | null;
  motionNotes?: string;
}): Promise<Response> {
  const { svc, sessionUser, companionId, adminUser, xaiKey, motionNotes } = args;

  const { data: inFlight } = await svc
    .from("profile_loop_video_jobs")
    .select("*")
    .eq("user_id", sessionUser.id)
    .eq("companion_id", companionId)
    .in("status", ["pending", "finalizing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (inFlight && xaiKey) {
    const xaiStored = typeof inFlight.xai_video_url === "string" ? inFlight.xai_video_url.trim() : "";
    if (inFlight.status === "pending") {
      const rid = String(inFlight.xai_request_id ?? "").trim();
      if (rid) {
        const pr = await pollGrokVideoRequestOnce(xaiKey, rid);
        if (pr.status === "done") {
          const jobId = String(inFlight.id ?? "");
          const { data: claimed } = await svc
            .from("profile_loop_video_jobs")
            .update({
              status: "finalizing",
              xai_video_url: pr.videoUrl,
              duration_seconds: pr.duration ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", jobId)
            .eq("status", "pending")
            .select("*")
            .maybeSingle();
          if (claimed?.id) {
            try {
              const { publicUrl, durationSeconds } = await finalizeProfileLoopJob(
                svc,
                sessionUser,
                claimed as ProfileLoopJobRow,
                pr.videoUrl,
              );
              return jsonResponse({
                success: true,
                phase: "complete",
                synced: true,
                publicUrl,
                durationSeconds,
                source: "grok",
              });
            } catch (e) {
              console.error("sync finalize pending job:", e);
            }
          }
        }
      }
    }
    if (inFlight.status === "finalizing" && xaiStored) {
      try {
        const { publicUrl, durationSeconds } = await finalizeProfileLoopJob(
          svc,
          sessionUser,
          inFlight as ProfileLoopJobRow,
          xaiStored,
        );
        return jsonResponse({
          success: true,
          phase: "complete",
          synced: true,
          publicUrl,
          durationSeconds,
          source: "grok",
        });
      } catch (e) {
        console.error("sync finalize in-flight job:", e);
      }
    } else if (xaiKey && profileLoopJobAgeMs(inFlight as ProfileLoopJobRow) >= PENDING_STUCK_MS) {
      const cleared = await reconcileStaleInFlightProfileLoopJob({
        svc,
        sessionUser,
        xaiKey,
        job: inFlight as ProfileLoopJobRow,
      });
      if (cleared) {
        const { data: done } = await svc
          .from("profile_loop_video_jobs")
          .select("public_url, status")
          .eq("id", String(inFlight.id ?? ""))
          .maybeSingle();
        if (
          done?.status === "complete" &&
          typeof done.public_url === "string" &&
          isLoopVideoStorageUrl(done.public_url)
        ) {
          return jsonResponse({
            success: true,
            phase: "complete",
            synced: true,
            publicUrl: done.public_url.trim(),
            source: "grok",
          });
        }
      }
    }
  }

  return attachKnownLoopVideoToProfile({
    svc,
    sessionUser,
    companionId,
    adminUser,
    motionNotes: motionNotes ?? "Profile loop sync",
  });
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

  let body: {
    companionId?: string;
    motionNotes?: string;
    tokenCost?: number;
    sourceGeneratedImageId?: string;
    jobId?: string;
    action?: string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const svc = createClient(supabaseUrl, serviceKey);

  const jobIdRaw = typeof body.jobId === "string" ? body.jobId.trim() : "";
  const companionIdEarly = typeof body.companionId === "string" ? body.companionId.trim() : "";
  const actionRaw = String(body.action ?? "").trim().toLowerCase();
  const actionSync = actionRaw === "sync" || actionRaw === "repair";

  const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);

  if (actionRaw === "cancel") {
    if (!companionIdEarly) {
      return jsonResponse({ error: "companionId required for cancel" }, 400);
    }
    return await handleCancelProfileLoopVideo({
      svc,
      sessionUser,
      companionId: companionIdEarly,
      jobId: jobIdRaw || undefined,
    });
  }

  if (actionSync) {
    if (!companionIdEarly) {
      return jsonResponse({ error: "companionId required for sync" }, 400);
    }
    const adminUserSync = await isLustforgeAdminUser(sessionUser);
    return await handleSyncProfileLoopVideo({
      svc,
      sessionUser,
      companionId: companionIdEarly,
      adminUser: adminUserSync,
      xaiKey: xaiKey ?? null,
      motionNotes: actionRaw === "repair" ? "Profile loop repair" : "Profile loop sync",
    });
  }

  if (!xaiKey) {
    return jsonResponse(
      {
        error:
          "Grok / xAI not configured: set Edge Function secret XAI_API_KEY or GROK_API_KEY for profile loop video.",
      },
      503,
    );
  }

  if (jobIdRaw) {
    return await handleProfileLoopJobPoll({ svc, sessionUser, xaiKey, jobId: jobIdRaw });
  }

  const companionId = companionIdEarly;
  if (!companionId) {
    return jsonResponse({ error: "companionId required" }, 400);
  }
  const motionNotesRaw = typeof body.motionNotes === "string" ? body.motionNotes.trim() : "";
  const policyErr = profilePageLoopMotionNotesViolatePolicy(motionNotesRaw);
  if (policyErr) {
    return jsonResponse({ error: policyErr }, 400);
  }
  const motionNotes = sanitizeProfileLoopUserMotionNotes(motionNotesRaw).trim().slice(0, 800);

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

  const sourceGenId =
    typeof (body as { sourceGeneratedImageId?: unknown }).sourceGeneratedImageId === "string"
      ? String((body as { sourceGeneratedImageId: string }).sourceGeneratedImageId).trim()
      : "";

  let sourceOverrideUrl: string | null = null;
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

  if (!imageUrl) {
    imageUrl = await resolveProfileLoopSourceImageUrl(
      svc,
      sessionUser.id,
      companionId,
      row,
      sourceOverrideUrl,
      adminUser,
    );
  }

  if (!imageUrl) {
    return jsonResponse({ error: "No public profile image URL — set a static portrait first." }, 400);
  }

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
  }

  const inFlightSince = new Date(Date.now() - IN_FLIGHT_JOB_MS).toISOString();
  const { data: existingJob } = await svc
    .from("profile_loop_video_jobs")
    .select("*")
    .eq("user_id", sessionUser.id)
    .eq("companion_id", companionId)
    .in("status", ["pending", "finalizing"])
    .gte("created_at", inFlightSince)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingJob?.id) {
    const stale = profileLoopJobAgeMs(existingJob as ProfileLoopJobRow) >= PENDING_STUCK_MS;
    if (stale) {
      await reconcileStaleInFlightProfileLoopJob({
        svc,
        sessionUser,
        xaiKey,
        job: existingJob as ProfileLoopJobRow,
      });
      const { data: after } = await svc
        .from("profile_loop_video_jobs")
        .select("id, status, public_url")
        .eq("id", String(existingJob.id))
        .maybeSingle();
      if (
        after?.status === "complete" &&
        typeof after.public_url === "string" &&
        after.public_url.trim()
      ) {
        return jsonResponse({
          success: true,
          phase: "complete",
          publicUrl: after.public_url.trim(),
          source: "grok",
        });
      }
    } else {
      return jsonResponse({
        success: true,
        phase: "poll",
        jobId: existingJob.id,
        pollAfterMs: 3000,
        resumed: true,
        workerPhase: pollWorkerPhaseForJob(existingJob as ProfileLoopJobRow),
      });
    }
  }

  const isNexusHybrid =
    table === "custom_characters" && Boolean((row as { is_nexus_hybrid?: unknown }).is_nexus_hybrid);

  const isDiscoverListedForgeTemplate =
    table === "custom_characters" &&
    Boolean((row as { is_public?: unknown }).is_public) &&
    Boolean((row as { approved?: unknown }).approved);

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

    const { requestId } = await startGrokImagineImageToVideo({
      apiKey: xaiKey,
      prompt,
      sourceImageUrl: imageUrl,
      durationSeconds: durationSec,
      aspectRatio: "2:3",
      resolution: "480p",
      model: videoModel,
    });

    const { data: ins, error: insErr } = await svc
      .from("profile_loop_video_jobs")
      .insert({
        user_id: sessionUser.id,
        companion_id: companionId,
        xai_request_id: requestId,
        status: "pending",
        charge_fc: 0,
        refunded: false,
        context: {
          table,
          rowPk,
          adminUser,
          isDiscoverListedForgeTemplate,
          is_nexus_hybrid: isNexusHybrid,
          sourceGalleryStillUrl: sourceGalleryStillUrl ?? "",
          sourceGenId,
          motionNotesForGallery: motionNotes,
          durationSeconds: durationSec,
        },
      })
      .select("id")
      .maybeSingle();

    if (insErr || !ins?.id) {
      return jsonResponse(
        {
          error:
            insErr?.message ??
            "Could not create profile loop job. If you just deployed code, run the latest Supabase migration (profile_loop_video_jobs).",
        },
        500,
      );
    }

    if (shouldCharge) {
      const { data: profRow, error: profRowErr } = await svc
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", sessionUser.id)
        .maybeSingle();
      if (profRowErr || profRow == null) {
        await svc
          .from("profile_loop_video_jobs")
          .update({
            status: "failed",
            error_message: "Could not read forge credits balance.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", ins.id);
        return jsonResponse({ error: "Could not read forge credits balance." }, 500);
      }
      if (profRow.tokens_balance < PAID_LOOP_FC) {
        await svc
          .from("profile_loop_video_jobs")
          .update({
            status: "failed",
            error_message: `Not enough forge credits (${PAID_LOOP_FC} required).`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ins.id);
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
        await svc
          .from("profile_loop_video_jobs")
          .update({
            status: "failed",
            error_message: deductErr.message || "Could not reserve forge credits.",
            updated_at: new Date().toISOString(),
          })
          .eq("id", ins.id);
        return jsonResponse({ error: deductErr.message || "Could not reserve forge credits." }, 500);
      }
      await recordFcTransaction(svc, {
        userId: sessionUser.id,
        creditsChange: -PAID_LOOP_FC,
        balanceAfter: nextBal,
        transactionType: "profile_loop_video",
        description: "Profile loop video (Grok I2V)",
        metadata: { companionId, fc: PAID_LOOP_FC, jobId: ins.id },
      });
      await svc
        .from("profile_loop_video_jobs")
        .update({ charge_fc: PAID_LOOP_FC, updated_at: new Date().toISOString() })
        .eq("id", ins.id);
    }

    return jsonResponse({
      success: true,
      phase: "poll",
      jobId: ins.id,
      pollAfterMs: 4000,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: msg }, 500);
  }
});
