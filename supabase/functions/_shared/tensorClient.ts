import { buildTamsRsaAuthorization, hasTamsRsaCredentials, readTamsAppIdFromEnv, readTamsPrivateKeyFromEnv } from "./tamsRsaAuth.ts";

const DEFAULT_TENSOR_BASE_URL = "https://ap-east-1.tensorart.cloud";

/**
 * TAMS `sdModel` must be the numeric ID from the model page URL, e.g.
 * `https://tensor.art/models/935697227794352937` → use `935697227794352937`.
 * This default is **FLUX.2 DEV (FP8)** on Tensor — LustForge chat stills use this for picture/selfie/pic asks
 * unless you override with `TENSOR_IMAGE_MODEL` / `TENSOR_CHAT_IMAGE_MODEL` in `generate-image-tensor`.
 *
 * @see https://tams-docs.tensor.art/docs/api/guide/how-to-get-the-model-id
 */
export const DEFAULT_TENSOR_IMAGE_MODEL = "935697227794352937";

/**
 * I2V / `VIDEO_DIFFUSION` on TAMS — default **Wan 2.2** short loops (override with `TENSOR_VIDEO_MODEL`).
 * Confirm the id matches a Wan I2V-capable workflow in your TAMS app.
 */
export const DEFAULT_TENSOR_VIDEO_MODEL = "890953380564889159";

export const LUSTFORGE_IMAGE_WIDTH = 768;
export const LUSTFORGE_IMAGE_HEIGHT = 1024;

type TensorPrompt = { text?: string; weight?: number };

type TensorJobStatus = "CREATED" | "PENDING" | "RUNNING" | "WAITING" | "SUCCESS" | "FAILED" | "CANCELED";

type TensorImageInfo = {
  id?: string;
  url?: string;
};

type TensorVideoInfo = {
  id?: string;
  url?: string;
};

type TensorJobEnvelope = {
  job?: {
    /** TAMS returns large uint64 ids as JSON strings (unsafe as JS number). */
    id?: number | string;
    status?: TensorJobStatus;
    failedInfo?: { reason?: string; code?: string };
    successInfo?: {
      images?: TensorImageInfo[];
      videos?: TensorVideoInfo[];
    };
  };
};

/** Normalize job id for URLs — never use Number() on TAMS ids (precision loss). */
function normalizeTamsJobId(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  if (typeof raw === "string") {
    const t = raw.trim();
    return /^\d+$/.test(t) ? t : null;
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) {
    return String(Math.trunc(raw));
  }
  return null;
}

type TensorUploadAddress = {
  resourceId?: string;
  putUrl?: string;
  headers?: Record<string, string>;
};

function tensorBaseUrl(): string {
  return (Deno.env.get("TENSOR_API_BASE_URL") ?? DEFAULT_TENSOR_BASE_URL).replace(/\/+$/, "");
}

/**
 * TAMS supports (1) Bearer token from app settings, or (2) RSA signature (production).
 * Path must be the URL path only (e.g. `/v1/jobs`), matching the signing spec.
 */
async function tensorAuthHeaders(
  method: string,
  pathOnly: string,
  body: string,
  bearerToken: string,
): Promise<HeadersInit> {
  if (hasTamsRsaCredentials()) {
    const appId = readTamsAppIdFromEnv();
    const pem = readTamsPrivateKeyFromEnv();
    const auth = await buildTamsRsaAuthorization(method, pathOnly, body, appId, pem);
    const h: Record<string, string> = { Authorization: auth, Accept: "application/json" };
    if (method !== "GET" && method !== "HEAD") {
      h["Content-Type"] = "application/json";
    }
    return h;
  }
  const t = bearerToken.replace(/^Bearer\s+/i, "").trim();
  if (!t) {
    throw new Error("Missing TENSOR_API_KEY, or set TAMS_APP_ID + TAMS_PRIVATE_KEY for RSA auth.");
  }
  return {
    Authorization: `Bearer ${t}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function parseJsonSafe<T>(res: Response): Promise<{ parsed: T | null; raw: string }> {
  const raw = await res.text();
  try {
    return { parsed: JSON.parse(raw) as T, raw };
  } catch {
    return { parsed: null, raw };
  }
}

function tamsDetailMessages(details: unknown): string[] {
  if (!Array.isArray(details)) return [];
  const out: string[] = [];
  for (const item of details) {
    if (item && typeof item === "object" && "message" in item) {
      const m = String((item as Record<string, unknown>).message ?? "").trim();
      if (m) out.push(m);
    }
  }
  return out;
}

/** Human-readable TAMS error for logs and client toasts. */
export function formatTensorApiFailure(status: number, raw: string): string {
  const trimmed = raw.trim().slice(0, 1200);
  let parsed: { code?: number; message?: string; tips?: string; details?: unknown } | null = null;
  try {
    parsed = JSON.parse(raw) as { code?: number; message?: string; tips?: string; details?: unknown };
  } catch {
    /* ignore */
  }

  const detailMsgs = parsed ? tamsDetailMessages(parsed.details) : [];
  const creditsLow = detailMsgs.some((m) => /credit[s]?\s*not\s*enough/i.test(m));
  if (creditsLow) {
    return (
      `Tensor TAMS: not enough API compute credits on your Tensor application (HTTP ${status}). ` +
      `Top up at https://tams.tensor.art/app → open your app → Info / Top Up (TAMS credits are separate from LustForge forge credits in this app).`
    );
  }

  if (parsed?.tips === "app not found" || /app not found/i.test(String(parsed?.tips ?? ""))) {
    return (
      `Tensor TAMS could not resolve your app (HTTP ${status}, app not found). ` +
      `1) Open https://tams.tensor.art/app → your app → copy the exact API base URL into Supabase secret TENSOR_API_BASE_URL ` +
      `(default is ${DEFAULT_TENSOR_BASE_URL}; wrong region/host causes this). ` +
      `2) Use the app's Bearer token in TENSOR_API_KEY (not a random site key). ` +
      `3) If your app uses RSA signing instead of Bearer, set TAMS_APP_ID and TAMS_PRIVATE_KEY (PKCS#8 PEM) and you can omit TENSOR_API_KEY.`
    );
  }

  const topMsg = String(parsed?.message ?? "").trim();
  const uselessTop = /^params\s*valid$/i.test(topMsg);

  if (detailMsgs.length) {
    const joined = detailMsgs.join("; ");
    if (topMsg && !uselessTop) {
      return `Tensor API error (${status}): ${topMsg} — ${joined}`;
    }
    return `Tensor API error (${status}): ${joined}`;
  }

  if (parsed?.message) {
    const detailStr =
      parsed.details === undefined
        ? ""
        : typeof parsed.details === "string"
          ? parsed.details
          : JSON.stringify(parsed.details);
    const bits = [parsed.message, parsed.tips, detailStr].filter(Boolean).join(" — ");
    return `Tensor API error (${status}): ${bits}`;
  }
  return `Tensor API error (${status}): ${trimmed || "empty response"}`;
}

/** TAMS tightened validation: sampler + sdVae are required (see tams-signature-demo). */
function diffusionQualityParams(): {
  sampler: string;
  sdVae: string;
  clipSkip: number;
  modelAccessKey?: string;
} {
  const sampler = (Deno.env.get("TENSOR_SAMPLER") ?? "DPM++ 2M Karras").trim() || "DPM++ 2M Karras";
  const sdVae = (Deno.env.get("TENSOR_SD_VAE") ?? "Automatic").trim() || "Automatic";
  const clipSkipRaw = Deno.env.get("TENSOR_CLIP_SKIP");
  const clipSkip = clipSkipRaw != null && clipSkipRaw !== "" ? Math.max(0, Math.min(4, Number(clipSkipRaw))) : 2;
  const modelAccessKey = (Deno.env.get("TENSOR_MODEL_ACCESS_KEY") ?? "").trim();
  return {
    sampler,
    sdVae,
    clipSkip: Number.isFinite(clipSkip) ? clipSkip : 2,
    ...(modelAccessKey ? { modelAccessKey } : {}),
  };
}

async function fetchImageBytes(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Could not fetch source image for img2img: HTTP ${res.status}`);
  }
  return new Uint8Array(await res.arrayBuffer());
}

export async function uploadTensorImageResource(opts: {
  apiKey: string;
  sourceImageUrl: string;
  expireSec?: number;
}): Promise<string> {
  const { apiKey, sourceImageUrl } = opts;
  const expireSec = Number.isFinite(opts.expireSec) ? Math.max(60, Math.floor(opts.expireSec!)) : 3600;
  const base = tensorBaseUrl();
  const resourceBody = JSON.stringify({ expireSec });

  const createRes = await fetch(`${base}/v1/resource/image`, {
    method: "POST",
    headers: await tensorAuthHeaders("POST", "/v1/resource/image", resourceBody, apiKey),
    body: resourceBody,
  });

  const { parsed, raw } = await parseJsonSafe<TensorUploadAddress>(createRes);
  if (!createRes.ok || !parsed?.resourceId || !parsed.putUrl) {
    throw new Error(formatTensorApiFailure(createRes.status, raw));
  }

  const bytes = await fetchImageBytes(sourceImageUrl);
  const putHeaders: HeadersInit = parsed.headers ?? { "Content-Type": "application/octet-stream" };
  if (!("Content-Type" in putHeaders)) {
    (putHeaders as Record<string, string>)["Content-Type"] = "application/octet-stream";
  }

  const putRes = await fetch(parsed.putUrl, {
    method: "PUT",
    headers: putHeaders,
    body: bytes,
  });
  if (!putRes.ok) {
    const body = await putRes.text();
    throw new Error(`Tensor image upload failed (${putRes.status}): ${body.slice(0, 500)}`);
  }

  return parsed.resourceId;
}

type SubmitTensorImageJobArgs = {
  apiKey: string;
  prompt: string;
  model?: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
  cfgScale?: number;
  steps?: number;
  denoisingStrength?: number;
  referenceImageUrl?: string;
};

export async function submitTensorImageJob(args: SubmitTensorImageJobArgs): Promise<{ jobId: string }> {
  const {
    apiKey,
    prompt,
    model = DEFAULT_TENSOR_IMAGE_MODEL,
    width = LUSTFORGE_IMAGE_WIDTH,
    height = LUSTFORGE_IMAGE_HEIGHT,
    negativePrompt,
    cfgScale = 7,
    steps = 28,
    denoisingStrength,
    referenceImageUrl,
  } = args;
  const base = tensorBaseUrl();

  let imageResourceId: string | undefined;
  if (referenceImageUrl?.trim()) {
    imageResourceId = await uploadTensorImageResource({ apiKey, sourceImageUrl: referenceImageUrl.trim() });
  }

  const dq = diffusionQualityParams();
  const negText = negativePrompt?.trim() ?? "";
  const neg: TensorPrompt[] = [{ text: negText }];

  const payload = {
    requestId: crypto.randomUUID(),
    stages: [
      {
        type: "INPUT_INITIALIZE",
        inputInitialize: {
          seed: -1,
          count: 1,
          ...(imageResourceId ? { imageResourceId } : {}),
        },
      },
      {
        type: "DIFFUSION",
        diffusion: {
          width,
          height,
          prompts: [{ text: prompt } satisfies TensorPrompt],
          negativePrompts: neg,
          sdModel: model,
          sampler: dq.sampler,
          sdVae: dq.sdVae,
          clipSkip: dq.clipSkip,
          ...(dq.modelAccessKey ? { modelAccessKey: dq.modelAccessKey } : {}),
          steps,
          cfgScale,
          ...(imageResourceId
            ? {
                denoisingStrength:
                  typeof denoisingStrength === "number" && Number.isFinite(denoisingStrength)
                    ? Math.max(0.05, Math.min(0.95, denoisingStrength))
                    : 0.45,
              }
            : {}),
        },
      },
    ],
  };

  const jobBody = JSON.stringify(payload);
  const res = await fetch(`${base}/v1/jobs`, {
    method: "POST",
    headers: await tensorAuthHeaders("POST", "/v1/jobs", jobBody, apiKey),
    body: jobBody,
  });

  const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
  const jobId = normalizeTamsJobId(parsed?.job?.id);
  if (!res.ok || !jobId) {
    throw new Error(`Tensor image submit failed: ${formatTensorApiFailure(res.status, raw)}`);
  }
  return { jobId };
}

export async function submitTensorImageToVideoJob(args: {
  apiKey: string;
  prompt: string;
  sourceImageUrl: string;
  model?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
}): Promise<{ jobId: string }> {
  const {
    apiKey,
    prompt,
    sourceImageUrl,
    model = DEFAULT_TENSOR_VIDEO_MODEL,
    durationSeconds = 8,
    width = 544,
    height = 960,
  } = args;
  const base = tensorBaseUrl();
  const clampedDuration = Math.max(5, Math.min(10, Math.round(durationSeconds)));
  const totalFrames = clampedDuration * 8;

  const imageResourceId = await uploadTensorImageResource({ apiKey, sourceImageUrl });

  const payload = {
    requestId: crypto.randomUUID(),
    stages: [
      {
        type: "INPUT_INITIALIZE",
        inputInitialize: {
          seed: -1,
          count: 1,
          imageResourceId,
        },
      },
      {
        type: "VIDEO_DIFFUSION",
        videoDiffusion: {
          sdModel: model,
          generationMode: "IMAGE_TO_VIDEO",
          width,
          height,
          fps: 8,
          totalFrames,
          prompts: [{ text: prompt } satisfies TensorPrompt],
          negativePrompts: [{ text: "" }],
        },
      },
    ],
  };

  const videoJobBody = JSON.stringify(payload);
  const res = await fetch(`${base}/v1/jobs`, {
    method: "POST",
    headers: await tensorAuthHeaders("POST", "/v1/jobs", videoJobBody, apiKey),
    body: videoJobBody,
  });
  const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
  const jobId = normalizeTamsJobId(parsed?.job?.id);
  if (!res.ok || !jobId) {
    throw new Error(`Tensor video submit failed: ${formatTensorApiFailure(res.status, raw)}`);
  }
  return { jobId };
}

export async function waitForTensorJobResult(args: {
  apiKey: string;
  jobId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<{ imageUrl?: string; videoUrl?: string }> {
  const { apiKey, jobId, timeoutMs = 8 * 60_000, pollIntervalMs = 4_000 } = args;
  const base = tensorBaseUrl();
  const deadline = Date.now() + timeoutMs;

  let lastStatus = "UNKNOWN";
  while (Date.now() < deadline) {
    const pollPath = `/v1/jobs/${jobId}`;
    const res = await fetch(`${base}/v1/jobs/${jobId}`, {
      headers: await tensorAuthHeaders("GET", pollPath, "", apiKey),
    });
    const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
    if (!res.ok || !parsed?.job) {
      throw new Error(`Tensor poll failed: ${formatTensorApiFailure(res.status, raw)}`);
    }

    const status = parsed.job.status ?? "UNKNOWN";
    lastStatus = status;
    if (status === "SUCCESS") {
      const imageUrl = parsed.job.successInfo?.images?.[0]?.url;
      const videoUrl = parsed.job.successInfo?.videos?.[0]?.url;
      if (!imageUrl && !videoUrl) {
        throw new Error("Tensor job succeeded but returned no image/video URL.");
      }
      return { imageUrl, videoUrl };
    }
    if (status === "FAILED" || status === "CANCELED") {
      const reason = parsed.job.failedInfo?.reason ?? "No failure reason from Tensor.";
      throw new Error(`Tensor job ${status.toLowerCase()}: ${reason}`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Tensor job timeout (last status: ${lastStatus})`);
}
