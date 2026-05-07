import type { SupabaseClient } from "@supabase/supabase-js";
import { defaultRarityBorderPath, normalizeCompanionRarity, type CompanionRarity } from "@/lib/companionRarity";
import { isVideoPortraitUrl, stablePortraitDisplayUrl } from "@/lib/companionMedia";
import type { DbCompanion } from "@/hooks/useCompanions";

const BUCKET = "x-marketing-framed";

/** Canvas pixel size (2:3) — modest for upload size and bake time. */
export const FRAMED_CARD_OUT_W = 720;
export const FRAMED_CARD_OUT_H = 1080;

const INNER_RADIUS = 22;

function siteOriginForAssets(): string {
  const env = typeof import.meta !== "undefined" ? (import.meta.env?.VITE_SITE_URL as string | undefined) : undefined;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "https://lustforge.app";
}

export function absolutizeMediaUrl(url: string): string {
  const u = url.trim();
  if (u.startsWith("http://") || u.startsWith("https://")) return u.split("?")[0] ?? u;
  if (u.startsWith("/")) return `${siteOriginForAssets()}${u}`;
  return u;
}

export function framedXBakeFingerprint(args: {
  companionId: string;
  heroVisual: string;
  portraitTier: string;
  useLoopingVideoForX: boolean;
  useFramedCardForX: boolean;
  heroSourceType: string;
  pinCount?: number;
}): string {
  return [
    args.companionId,
    args.heroVisual,
    args.portraitTier,
    args.useLoopingVideoForX ? "1" : "0",
    args.useFramedCardForX ? "1" : "0",
    args.heroSourceType,
    String(args.pinCount ?? 0),
  ].join("|");
}

function loadImageCors(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url.slice(0, 80)}`));
    img.src = url;
  });
}

function roundedClip(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
  ctx.clip();
}

function drawBottomFade(ctx: CanvasRenderingContext2D) {
  const h = FRAMED_CARD_OUT_H;
  const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(0.45, "rgba(0,0,0,0.55)");
  grad.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FRAMED_CARD_OUT_W, h);
}

function drawPills(
  ctx: CanvasRenderingContext2D,
  rarity: CompanionRarity,
  showForge: boolean,
  pinCount: number,
) {
  ctx.save();
  ctx.font = "bold 14px system-ui,Segoe UI,sans-serif";
  const rarityLabel = rarity.toUpperCase();
  const padX = 8;
  const padY = 4;
  const y0 = 14;
  let x = 12;

  const drawPill = (text: string, fill: string, stroke: string, textColor: string) => {
    const w = ctx.measureText(text).width + padX * 2;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const r = 6;
    const h = 22;
    ctx.roundRect(x, y0, w, h, r);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(text, x + padX, y0 + 16);
    x += w + 6;
  };

  drawPill(rarityLabel, "rgba(0,0,0,0.65)", "rgba(255,255,255,0.12)", "rgba(255,255,255,0.92)");
  if (showForge) {
    drawPill("FORGE", "rgba(0,0,0,0.65)", "rgba(255,45,123,0.45)", "rgba(255,184,217,0.95)");
  }
  if (pinCount > 0) {
    const text = String(pinCount);
    const w = ctx.measureText(text).width + padX * 2;
    const rx = FRAMED_CARD_OUT_W - w - 12;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    ctx.strokeStyle = "rgba(255,45,123,0.35)";
    ctx.beginPath();
    ctx.roundRect(rx, y0, w, 22, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "hsl(330 95% 72%)";
    ctx.fillText(text, rx + padX, y0 + 16);
  }
  ctx.restore();
}

function drawFooterText(ctx: CanvasRenderingContext2D, name: string, tagline: string) {
  ctx.save();
  const maxW = FRAMED_CARD_OUT_W - 28;
  let y = FRAMED_CARD_OUT_H - 72;
  ctx.fillStyle = "rgba(255,255,255,0.98)";
  ctx.font = "bold 22px Georgia,Times New Roman,serif";
  wrapLines(ctx, name, 14, y, maxW, 26, 2);
  y += 52;
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "15px system-ui,Segoe UI,sans-serif";
  wrapLines(ctx, tagline, 14, y, maxW, 20, 2);
  ctx.restore();
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineHeight: number,
  maxLines: number,
) {
  const words = text.split(/\s+/).filter(Boolean);
  let line = "";
  let ly = y;
  let lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i]!;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, ly);
      lines++;
      if (lines >= maxLines) return;
      ly += lineHeight;
      line = words[i]!;
    } else {
      line = test;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, ly);
}

async function loadBorderImage(rarity: CompanionRarity, overlayUrl: string | null | undefined): Promise<HTMLImageElement> {
  const raw = (overlayUrl && overlayUrl.trim()) || defaultRarityBorderPath(rarity);
  const src = absolutizeMediaUrl(raw);
  return loadImageCors(src);
}

type DrawInteriorOpts = {
  ctx: CanvasRenderingContext2D;
  img: CanvasImageSource;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

function drawInteriorCover(opts: DrawInteriorOpts) {
  const { ctx, img, sx, sy, sw, sh } = opts;
  const scale = Math.max(FRAMED_CARD_OUT_W / sw, FRAMED_CARD_OUT_H / sh) * 1.02;
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (FRAMED_CARD_OUT_W - dw) / 2;
  const dy = (FRAMED_CARD_OUT_H - dh) / 2;
  ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
}

export type BakeFramedCardArgs = {
  companion: DbCompanion;
  heroStillUrl: string | null;
  /** MP4 interior when looping X preview is active */
  loopVideoUrl?: string | null;
  pinCount?: number;
};

/**
 * Raster companion + frame chrome to PNG (for Zernio when hero is still).
 */
export async function bakeFramedCardPngBlob(args: BakeFramedCardArgs): Promise<Blob> {
  const { companion, heroStillUrl, loopVideoUrl, pinCount = 0 } = args;
  const rarity = normalizeCompanionRarity(companion.rarity);
  const interiorIsVideo = Boolean(loopVideoUrl?.trim() && isVideoPortraitUrl(loopVideoUrl));
  if (interiorIsVideo) {
    throw new Error("Use recordFramedCardWebm for video heroes.");
  }
  const src = heroStillUrl?.trim() ? absolutizeMediaUrl(stablePortraitDisplayUrl(heroStillUrl) ?? heroStillUrl) : null;
  if (!src) throw new Error("No still URL to bake.");

  const canvas = document.createElement("canvas");
  canvas.width = FRAMED_CARD_OUT_W;
  canvas.height = FRAMED_CARD_OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported.");

  const heroImg = await loadImageCors(src);
  const borderImg = await loadBorderImage(rarity, companion.rarity_border_overlay_url);

  ctx.save();
  roundedClip(ctx, 0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H, INNER_RADIUS);
  const g = ctx.createLinearGradient(0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H);
  g.addColorStop(0, companion.gradient_from);
  g.addColorStop(1, companion.gradient_to);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H);
  drawInteriorCover({ ctx, img: heroImg, sx: 0, sy: 0, sw: heroImg.naturalWidth, sh: heroImg.naturalHeight });
  ctx.restore();

  drawBottomFade(ctx);

  const bleed = 1.12;
  ctx.save();
  roundedClip(ctx, 0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H, INNER_RADIUS);
  const bw = FRAMED_CARD_OUT_W * bleed;
  const bh = FRAMED_CARD_OUT_H * bleed;
  ctx.drawImage(borderImg, (FRAMED_CARD_OUT_W - bw) / 2, (FRAMED_CARD_OUT_H - bh) / 2, bw, bh);
  ctx.restore();

  drawPills(ctx, rarity, companion.id.startsWith("cc-"), pinCount);
  drawFooterText(ctx, companion.name, companion.tagline);

  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/png");
  });
}

export type RecordFramedCardArgs = BakeFramedCardArgs & {
  /** Hard cap for X-friendly clips (seconds). */
  maxDurationSec?: number;
};

/**
 * Record one loop of the profile MP4 with the same chrome as {@link bakeFramedCardPngBlob}.
 * Output is WebM (VP9/VP8) when supported — many pipelines accept it; re-encode server-side if needed.
 */
export async function recordFramedCardWebmBlob(args: RecordFramedCardArgs): Promise<Blob> {
  const { companion, loopVideoUrl, pinCount = 0, maxDurationSec = 12 } = args;
  const raw = loopVideoUrl?.trim();
  if (!raw || !isVideoPortraitUrl(raw)) throw new Error("No looping video URL to record.");

  const videoUrl = absolutizeMediaUrl(stablePortraitDisplayUrl(raw) ?? raw);
  const rarity = normalizeCompanionRarity(companion.rarity);

  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.muted = true;
  video.playsInline = true;
  video.src = videoUrl;

  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Video failed to load (CORS or URL)."));
  });
  await video.play().catch(() => {
    throw new Error("Video play failed — check autoplay policies or CORS.");
  });

  const dur = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 4;
  const duration = Math.min(maxDurationSec, Math.max(0.4, dur));

  const canvas = document.createElement("canvas");
  canvas.width = FRAMED_CARD_OUT_W;
  canvas.height = FRAMED_CARD_OUT_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported.");

  const borderImg = await loadBorderImage(rarity, companion.rarity_border_overlay_url);

  const stream = canvas.captureStream(30);
  const mimePriority = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
  const mime = mimePriority.find((m) => MediaRecorder.isTypeSupported(m)) ?? "video/webm";
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => {
    if (e.data.size) chunks.push(e.data);
  };

  const done = new Promise<Blob>((resolve, reject) => {
    rec.onstop = () => {
      const blob = new Blob(chunks, { type: mime.split(";")[0] });
      resolve(blob);
    };
    rec.onerror = () => reject(new Error("MediaRecorder error."));
  });

  rec.start(100);

  const start = performance.now();
  const endAt = start + duration * 1000;

  const frame = () => {
    ctx.save();
    roundedClip(ctx, 0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H, INNER_RADIUS);
    const g = ctx.createLinearGradient(0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H);
    g.addColorStop(0, companion.gradient_from);
    g.addColorStop(1, companion.gradient_to);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H);
    if (video.readyState >= 2) {
      drawInteriorCover({
        ctx,
        img: video,
        sx: 0,
        sy: 0,
        sw: video.videoWidth,
        sh: video.videoHeight,
      });
    }
    ctx.restore();

    drawBottomFade(ctx);

    const bleed = 1.12;
    ctx.save();
    roundedClip(ctx, 0, 0, FRAMED_CARD_OUT_W, FRAMED_CARD_OUT_H, INNER_RADIUS);
    const bw = FRAMED_CARD_OUT_W * bleed;
    const bh = FRAMED_CARD_OUT_H * bleed;
    ctx.drawImage(borderImg, (FRAMED_CARD_OUT_W - bw) / 2, (FRAMED_CARD_OUT_H - bh) / 2, bw, bh);
    ctx.restore();

    drawPills(ctx, rarity, companion.id.startsWith("cc-"), pinCount);
    drawFooterText(ctx, companion.name, companion.tagline);

    if (performance.now() < endAt) {
      requestAnimationFrame(frame);
    } else {
      video.pause();
      rec.stop();
    }
  };

  requestAnimationFrame(frame);
  return done;
}

export async function uploadFramedXMedia(
  supabase: SupabaseClient,
  blob: Blob,
  companionId: string,
): Promise<string> {
  const ext = blob.type.startsWith("image/") ? "png" : "webm";
  const sub =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const path = `admin/${companionId}/${sub}.${ext}`;
  const contentType = ext === "png" ? "image/png" : "video/webm";

  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: false,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  if (!data?.publicUrl) throw new Error("No public URL for upload.");
  return data.publicUrl.split("?")[0] ?? data.publicUrl;
}
