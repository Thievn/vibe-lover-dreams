/**
 * Together.ai **image** generation (FLUX.2 family via `/v1/images/generations`).
 *
 * LustForge routes **all still image generation** here (Forge previews, chat/gallery images, companion portraits).
 * Text-side helpers use **xAI Grok** (see `xaiGrokChatRaw.ts`, `safeImagePromptRewriter.ts`).
 *
 * Default image model: **black-forest-labs/FLUX.2-dev** (override with profile `together_image_model` or secret `TOGETHER_IMAGE_MODEL`).
 *
 * @see https://docs.together.ai/docs/images-overview
 */

import { requireTogetherApiKey, togetherImageGenerationsUrl } from "./togetherClient.ts";

/** Default on Together when no profile override / secret is set. */
export const DEFAULT_TOGETHER_IMAGE_MODEL = "black-forest-labs/FLUX.2-dev";

export const DEFAULT_TOGETHER_IMAGE_MODEL_FALLBACK = "black-forest-labs/FLUX.2-flex";

/** Prepended to every FLUX prompt (artistic nude / fine-art wording in the base layer). */
export const FLUX_TOGETHER_UNIVERSAL_BASE_PREFIX =
  "masterpiece, best quality, beautiful woman, artistic nude, tasteful sensual photography, elegant female form, soft cinematic lighting, highly detailed skin texture, delicate beauty, sensual pose, aesthetic nude, graceful, alluring, seductive atmosphere, fine art photography, soft shadows, beautiful composition";

export function resolveTogetherImageModel(
  profileOverride: string | null | undefined,
  getEnv: (name: string) => string | undefined,
): string {
  const fromProfile = typeof profileOverride === "string" ? profileOverride.trim() : "";
  if (fromProfile) return fromProfile;
  return getEnv("TOGETHER_IMAGE_MODEL")?.trim() || DEFAULT_TOGETHER_IMAGE_MODEL;
}

export function resolveTogetherImageModelFallback(getEnv: (name: string) => string | undefined): string {
  return getEnv("TOGETHER_IMAGE_MODEL_FALLBACK")?.trim() || DEFAULT_TOGETHER_IMAGE_MODEL_FALLBACK;
}

function togetherImageSteps(getEnv: (name: string) => string | undefined): number {
  const raw = getEnv("TOGETHER_IMAGE_STEPS")?.trim();
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(n) && n >= 1 && n <= 50) return n;
  return 28;
}

function dimensionsForAspect(aspect?: "2:3" | "1:1" | "3:2"): { width: number; height: number } {
  if (aspect === "1:1") return { width: 1024, height: 1024 };
  if (aspect === "3:2") return { width: 1216, height: 832 };
  return { width: 768, height: 1344 };
}

function sniffImageMime(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/png";
}

/** Normalize Together `b64_json` (raw) or an existing data URL into `data:image/*;base64,...`. */
export function normalizeTogetherImageToDataUrl(b64OrDataUrl: string): string {
  const t = b64OrDataUrl.trim();
  if (t.startsWith("data:image")) return t;
  const binary = Uint8Array.from(atob(t), (c) => c.charCodeAt(0));
  const mime = sniffImageMime(binary);
  const CHUNK = 0x8000;
  let s = "";
  for (let i = 0; i < binary.length; i += CHUNK) {
    s += String.fromCharCode(...binary.subarray(i, i + CHUNK));
  }
  const outB64 = btoa(s);
  return `data:${mime};base64,${outB64}`;
}

async function fetchHostedImageToDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl.trim(), { redirect: "follow" });
  if (!res.ok) throw new Error(`Together image fetch failed: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mime = sniffImageMime(bytes);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

function formatTogetherImageError(json: unknown, fallbackRaw: string, httpStatus: number): string {
  const bits: string[] = [`HTTP ${httpStatus}`];
  if (json && typeof json === "object") {
    const err = (json as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) bits.push(err.trim());
    else if (err && typeof err === "object") {
      const e = err as Record<string, unknown>;
      if (typeof e.message === "string" && e.message.trim()) bits.push(e.message.trim());
      else bits.push(JSON.stringify(err).slice(0, 600));
    }
  }
  if (bits.length <= 1) {
    const fb = fallbackRaw.replace(/\s+/g, " ").trim();
    if (fb) bits.push(fb.slice(0, 800));
  }
  return bits.join(" — ").slice(0, 1600);
}

/** Decode `data:image/png;base64,...` → bytes + mime (shared by portrait + chat image uploads). */
export function decodeImageDataUrl(dataUrl: string): { binary: Uint8Array; contentType: string; ext: string } {
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/i);
  if (!m) throw new Error("Image data URL: expected data:image/*;base64,…");
  const mimeSub = m[1]!.toLowerCase();
  const b64 = m[2]!;
  const contentType = mimeSub === "jpg" ? "image/jpeg" : `image/${mimeSub}`;
  const ext =
    mimeSub === "jpeg" || mimeSub === "jpg"
      ? "jpg"
      : mimeSub === "png"
        ? "png"
        : mimeSub === "webp"
          ? "webp"
          : "jpg";
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { binary, contentType, ext };
}

/**
 * FLUX still via Together `/v1/images/generations` (default **FLUX.2-dev**, optional fallback model).
 * `disable_safety_checker` avoids 422 NSFW keyword trips on adult prompts (see Together docs).
 */
export async function togetherGenerateFluxImage(args: {
  prompt: string;
  getEnv: (name: string) => string | undefined;
  aspectRatio?: "2:3" | "1:1" | "3:2";
  /** Optional `profiles.together_image_model` — empty uses `TOGETHER_IMAGE_MODEL` secret or code default (FLUX.2-dev). */
  profileTogetherImageModel?: string | null;
}): Promise<{ dataUrl: string; modelUsed: string }> {
  const apiKey = requireTogetherApiKey();
  if (!apiKey) {
    throw new Error("Together: set Edge Function secret TOGETHER_API_KEY (https://api.together.ai) for image generation.");
  }

  const rawUser = args.prompt.trim();
  const sep = "\n\n";
  const maxUser = Math.max(0, 12_000 - FLUX_TOGETHER_UNIVERSAL_BASE_PREFIX.length - sep.length);
  const prompt = `${FLUX_TOGETHER_UNIVERSAL_BASE_PREFIX}${sep}${rawUser.slice(0, maxUser)}`.trim();

  const primary = resolveTogetherImageModel(args.profileTogetherImageModel, args.getEnv);
  const fb = resolveTogetherImageModelFallback(args.getEnv);
  const models = (primary === fb ? [primary] : [primary, fb]).filter(Boolean);

  const { width, height } = dimensionsForAspect(args.aspectRatio);
  const steps = togetherImageSteps(args.getEnv);
  let lastErr = "unknown";

  for (const model of models) {
    const body: Record<string, unknown> = {
      model,
      prompt,
      width,
      height,
      steps,
      n: 1,
      response_format: "base64",
      disable_safety_checker: true,
    };

    const res = await fetch(togetherImageGenerationsUrl(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    const rawText = await res.text();
    let json: unknown = null;
    try {
      json = JSON.parse(rawText) as unknown;
    } catch {
      lastErr = `HTTP ${res.status} non-JSON`;
      continue;
    }
    if (!res.ok) {
      lastErr = formatTogetherImageError(json, rawText, res.status);
      continue;
    }

    const dataArr = (json as { data?: Array<{ b64_json?: unknown; url?: unknown }> })?.data;
    const first = Array.isArray(dataArr) && dataArr.length ? dataArr[0] : null;
    const b64 = first && typeof first.b64_json === "string" ? first.b64_json : null;
    const url = first && typeof first.url === "string" ? first.url : null;

    try {
      if (b64?.trim()) {
        const dataUrl = normalizeTogetherImageToDataUrl(b64);
        return { dataUrl, modelUsed: model };
      }
      if (url?.trim()) {
        const dataUrl = await fetchHostedImageToDataUrl(url);
        return { dataUrl, modelUsed: model };
      }
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
      continue;
    }

    lastErr = "Together returned no b64_json or url in data[0]";
  }

  throw new Error(`Together FLUX image failed: ${lastErr}`);
}
