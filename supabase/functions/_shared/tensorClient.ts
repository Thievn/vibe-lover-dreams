const DEFAULT_TENSOR_BASE_URL = "https://ap-east-1.tensorart.cloud";

export const DEFAULT_TENSOR_IMAGE_MODEL = "black-forest-labs/FLUX.2-dev";
export const DEFAULT_TENSOR_VIDEO_MODEL = "WAN_2_1";

export const LUSTFORGE_IMAGE_WIDTH = 768;
export const LUSTFORGE_IMAGE_HEIGHT = 1024;

type TensorPrompt = { text: string; weight?: number };

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
    id?: number;
    status?: TensorJobStatus;
    failedInfo?: { reason?: string; code?: string };
    successInfo?: {
      images?: TensorImageInfo[];
      videos?: TensorVideoInfo[];
    };
  };
};

type TensorUploadAddress = {
  resourceId?: string;
  putUrl?: string;
  headers?: Record<string, string>;
};

function tensorBaseUrl(): string {
  return (Deno.env.get("TENSOR_API_BASE_URL") ?? DEFAULT_TENSOR_BASE_URL).replace(/\/+$/, "");
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
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

  const createRes = await fetch(`${base}/v1/resource/image`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify({ expireSec }),
  });

  const { parsed, raw } = await parseJsonSafe<TensorUploadAddress>(createRes);
  if (!createRes.ok || !parsed?.resourceId || !parsed.putUrl) {
    throw new Error(
      `Tensor resource upload address failed (${createRes.status}): ${raw.slice(0, 500) || "empty response"}`,
    );
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

export async function submitTensorImageJob(args: SubmitTensorImageJobArgs): Promise<{ jobId: number }> {
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
          ...(negativePrompt?.trim() ? { negativePrompts: [{ text: negativePrompt.trim() } satisfies TensorPrompt] } : {}),
          sdModel: model,
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

  const res = await fetch(`${base}/v1/jobs`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
  const jobId = parsed?.job?.id;
  if (!res.ok || typeof jobId !== "number") {
    throw new Error(`Tensor image submit failed (${res.status}): ${raw.slice(0, 600) || "empty response"}`);
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
}): Promise<{ jobId: number }> {
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
        },
      },
    ],
  };

  const res = await fetch(`${base}/v1/jobs`, {
    method: "POST",
    headers: authHeaders(apiKey),
    body: JSON.stringify(payload),
  });
  const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
  const jobId = parsed?.job?.id;
  if (!res.ok || typeof jobId !== "number") {
    throw new Error(`Tensor video submit failed (${res.status}): ${raw.slice(0, 600) || "empty response"}`);
  }
  return { jobId };
}

export async function waitForTensorJobResult(args: {
  apiKey: string;
  jobId: number;
  timeoutMs?: number;
  pollIntervalMs?: number;
}): Promise<{ imageUrl?: string; videoUrl?: string }> {
  const { apiKey, jobId, timeoutMs = 8 * 60_000, pollIntervalMs = 4_000 } = args;
  const base = tensorBaseUrl();
  const deadline = Date.now() + timeoutMs;

  let lastStatus = "UNKNOWN";
  while (Date.now() < deadline) {
    const res = await fetch(`${base}/v1/jobs/${jobId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });
    const { parsed, raw } = await parseJsonSafe<TensorJobEnvelope>(res);
    if (!res.ok || !parsed?.job) {
      throw new Error(`Tensor poll failed (${res.status}): ${raw.slice(0, 400)}`);
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
