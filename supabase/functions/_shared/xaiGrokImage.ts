/**
 * xAI Grok **image** generation (`/v1/images/generations`, default `grok-imagine-image`)
 * and **identity-locked edits** (`/v1/images/edits` with a profile still as reference).
 * @see https://docs.x.ai/docs/guides/image-generations
 */
import { normalizeTogetherImageToDataUrl } from "./togetherImage.ts";

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

async function fetchHttpsImageUrlAsDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl.trim(), { redirect: "follow" });
  if (!res.ok) throw new Error(`Grok image fetch failed: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const mime = sniffImageMime(bytes);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function grokImageDataFromResponse(
  json: unknown,
  model: string,
): Promise<{ dataUrl: string; modelUsed: string }> {
  const data = (json as { data?: Array<{ b64_json?: string; url?: string }> })?.data?.[0];
  if (data?.b64_json?.trim()) {
    return { dataUrl: normalizeTogetherImageToDataUrl(data.b64_json.trim()), modelUsed: model };
  }
  if (data?.url?.trim()) {
    const dataUrl = await fetchHttpsImageUrlAsDataUrl(data.url.trim());
    return { dataUrl, modelUsed: model };
  }
  throw new Error("Grok image: empty response (no b64_json or url in data[0])");
}

export const DEFAULT_GROK_IMAGE_MODEL = "grok-imagine-image";

export type GrokGenerateImageDataUrlArgs = {
  apiKey: string;
  prompt: string;
  getEnv: (name: string) => string | undefined;
  aspectRatio?: "2:3" | "1:1" | "3:2";
  /**
   * Public `https://` URL or `data:image/...;base64,...` of the companion’s **still profile portrait**.
   * When set, calls `/v1/images/edits` so Imagine can **lock face/hair/body** while the prompt drives a new scene.
   */
  likenessEditSourceUrl?: string | null;
};

export async function grokGenerateImageDataUrl(
  args: GrokGenerateImageDataUrlArgs,
): Promise<{ dataUrl: string; modelUsed: string }> {
  const model = args.getEnv("GROK_IMAGE_MODEL")?.trim() || DEFAULT_GROK_IMAGE_MODEL;
  const ar = args.aspectRatio ?? "2:3";
  const prompt = args.prompt.trim().slice(0, 16_000);
  const ref = args.likenessEditSourceUrl?.trim() ?? "";

  const tryEdits =
    ref.startsWith("https://") ||
    (ref.startsWith("data:image/") && ref.includes("base64,"));

  if (tryEdits && ref.length > 32) {
    const body: Record<string, unknown> = {
      model,
      prompt,
      n: 1,
      response_format: "b64_json",
      aspect_ratio: ar,
      image: { type: "image_url", url: ref },
    };
    try {
      const res = await fetch("https://api.x.ai/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${args.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const rawText = await res.text();
      let json: unknown = null;
      try {
        json = JSON.parse(rawText) as unknown;
      } catch {
        /* leave null */
      }
      if (res.ok && json) {
        return await grokImageDataFromResponse(json, model);
      }
      console.warn(
        "grokGenerateImageDataUrl: edits failed, falling back to text-only generations",
        res.status,
        rawText.slice(0, 400),
      );
    } catch (e) {
      console.warn("grokGenerateImageDataUrl: edits exception, falling back to generations", e);
    }
  }

  const bodyGen: Record<string, unknown> = {
    model,
    prompt,
    n: 1,
    response_format: "b64_json",
    aspect_ratio: ar,
  };

  const res = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyGen),
  });
  const rawText = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(rawText) as unknown;
  } catch {
    /* leave null */
  }
  if (!res.ok) {
    const msg =
      typeof json === "object" && json !== null && "error" in json
        ? JSON.stringify((json as { error?: unknown }).error)
        : rawText.slice(0, 600);
    throw new Error(`Grok image HTTP ${res.status}: ${msg}`);
  }

  if (json == null) {
    throw new Error("Grok image: empty or invalid JSON body");
  }
  return await grokImageDataFromResponse(json, model);
}
