/**
 * Grok Imagine video (I2V) — https://api.x.ai/v1/videos/generations
 * Uses the same XAI_API_KEY / GROK_API_KEY as the rest of the app.
 */
export const DEFAULT_GROK_VIDEO_MODEL = "grok-imagine-video";

/** Same rules as Tensor TAMS: Supabase public/signed image URLs that xAI can fetch. */
export function publicHttpsImageUrlForGrok(stored: string | null | undefined): string | null {
  if (!stored?.trim()) return null;
  let u = stored.trim();
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("/")) return null;
  const signMatch = u.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signMatch) {
    const [, origin, bucket, pathPart] = signMatch;
    u = `${origin}/storage/v1/object/public/${bucket}/${pathPart}`;
  } else if (u.includes("/storage/v1/object/sign/")) {
    u = (u.split("#")[0] ?? u).trim();
  }
  if (u.includes("/object/public/")) {
    return (u.split("?")[0] ?? u).trim() || null;
  }
  return u;
}

type VideoStatusResponse = {
  status?: string;
  request_id?: string;
  video?: { url?: string; duration?: number };
  error?: { message?: string } | string;
  message?: string;
};

export type GrokVideoPollResult =
  | { status: "processing" }
  | { status: "done"; videoUrl: string; duration?: number }
  | { status: "failed"; message: string }
  | { status: "expired" };

function parseStartError(text: string, status: number): Error {
  try {
    const j = JSON.parse(text) as { error?: { message?: string }; message?: string };
    const m = j.error && typeof j.error === "object" && "message" in j.error ? j.error.message : j.message;
    if (m) return new Error(`Grok video: ${m}`);
  } catch {
    /* fallthrough */
  }
  return new Error(`Grok video start failed HTTP ${status}: ${text.slice(0, 400)}`);
}

type StartGrokVideoArgs = {
  apiKey: string;
  prompt: string;
  sourceImageUrl: string;
  durationSeconds: number;
  aspectRatio: string;
  resolution?: "480p" | "720p";
  model?: string;
};

/**
 * Starts image-to-video only (POST); returns `request_id` for out-of-band polling.
 * Use when Edge wall clock is shorter than xAI render time (e.g. profile loop jobs).
 */
export async function startGrokImagineImageToVideo(args: StartGrokVideoArgs): Promise<{ requestId: string }> {
  const model = (args.model ?? DEFAULT_GROK_VIDEO_MODEL).trim() || DEFAULT_GROK_VIDEO_MODEL;
  const duration = Math.min(15, Math.max(1, Math.round(args.durationSeconds)));
  const resolution = args.resolution ?? "720p";

  const baseBody: Record<string, unknown> = {
    model,
    prompt: args.prompt,
    image: { url: args.sourceImageUrl.trim() },
    duration,
    aspect_ratio: args.aspectRatio,
    resolution,
  };

  let startRes = await fetch("https://api.x.ai/v1/videos/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify(baseBody),
  });

  let startText = await startRes.text();

  if (!startRes.ok && startRes.status === 400) {
    const retryBody = {
      model,
      prompt: args.prompt,
      image: args.sourceImageUrl.trim(),
      duration,
      aspect_ratio: args.aspectRatio,
      resolution,
    };
    startRes = await fetch("https://api.x.ai/v1/videos/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${args.apiKey}`,
      },
      body: JSON.stringify(retryBody),
    });
    startText = await startRes.text();
  }

  if (!startRes.ok) {
    throw parseStartError(startText, startRes.status);
  }

  let startJson: { request_id?: string; error?: unknown };
  try {
    startJson = JSON.parse(startText) as { request_id?: string; error?: unknown };
  } catch {
    throw new Error(`Grok video: non-JSON start response: ${startText.slice(0, 300)}`);
  }

  const requestId = startJson.request_id?.trim();
  if (!requestId) {
    throw new Error(`Grok video: no request_id in response: ${startText.slice(0, 300)}`);
  }

  return { requestId };
}

/** Single GET to xAI video status (one Edge invocation should stay under Supabase wall clock). */
export async function pollGrokVideoRequestOnce(
  apiKey: string,
  requestId: string,
): Promise<GrokVideoPollResult> {
  const pollRes = await fetch(`https://api.x.ai/v1/videos/${encodeURIComponent(requestId)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const pollText = await pollRes.text();
  let data: VideoStatusResponse;
  try {
    data = JSON.parse(pollText) as VideoStatusResponse;
  } catch {
    return { status: "processing" };
  }

  if (data.status === "done" && data.video?.url) {
    return { status: "done", videoUrl: data.video.url, duration: data.video.duration };
  }
  if (data.status === "expired") {
    return { status: "expired" };
  }
  if (data.status === "failed") {
    const em =
      typeof data.error === "string"
        ? data.error
        : data.error && typeof data.error === "object" && "message" in data.error
          ? String((data.error as { message?: string }).message)
          : data.message;
    return { status: "failed", message: em || "unknown" };
  }
  return { status: "processing" };
}

/**
 * Image-to-video: `prompt` + `image` (public URL) per xAI video generation API.
 * Polls until `done`, `failed`, or `expired`.
 *
 * **Note:** Supabase Edge has a short wall clock (often ~150s). For long renders, use
 * {@link startGrokImagineImageToVideo} + {@link pollGrokVideoRequestOnce} across invocations instead.
 */
export async function runGrokImagineImageToVideo(
  args: StartGrokVideoArgs & {
    pollIntervalMs?: number;
    maxWaitMs?: number;
  },
): Promise<{ videoUrl: string; duration?: number }> {
  const pollIntervalMs = args.pollIntervalMs ?? 5_000;
  const maxWaitMs = args.maxWaitMs ?? 20 * 60_000;

  const { requestId } = await startGrokImagineImageToVideo(args);

  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const r = await pollGrokVideoRequestOnce(args.apiKey, requestId);
    if (r.status === "done") {
      return { videoUrl: r.videoUrl, duration: r.duration };
    }
    if (r.status === "expired") {
      throw new Error("Grok video: request expired before completion.");
    }
    if (r.status === "failed") {
      throw new Error(`Grok video failed: ${r.message}`);
    }
    await new Promise((res) => setTimeout(res, pollIntervalMs));
  }

  throw new Error("Grok video: timed out waiting for completion (try again).");
}
