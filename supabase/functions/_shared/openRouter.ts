/**
 * OpenRouter client for **non–live-voice** LustForge traffic (chat, admin tools, image rewriter, FLUX stills).
 *
 * Hybrid architecture:
 * - **OpenRouter** (this file): Classic companion chat, Forge/admin text helpers, prompt rewriter, FLUX image gen.
 * - **xAI / Grok** (elsewhere): Live Voice `grok-chat`, Realtime client secret, TTS/STT, Grok Imagine **video** (I2V).
 *
 * Secrets (Supabase Edge): `OPENROUTER_API_KEY`, optional `OPENROUTER_CHAT_MODEL`, `OPENROUTER_IMAGE_MODEL`, etc.
 */

const OPENROUTER_API = "https://openrouter.ai/api/v1";

/** Default text model — exact OpenRouter slug. */
export const DEFAULT_OPENROUTER_CHAT_MODEL = "deepseek/deepseek-v4-pro";

/** Default rewriter model — instruction-following text (avoid routing chat/reasoning models here). */
export const DEFAULT_OPENROUTER_REWRITE_MODEL = "openai/gpt-4o-mini";

export const DEFAULT_OPENROUTER_IMAGE_MODEL_PRIMARY = "black-forest-labs/flux.2-pro";
export const DEFAULT_OPENROUTER_IMAGE_MODEL_FALLBACK = "black-forest-labs/flux.2-flex";

export function resolveOpenRouterApiKey(getEnv: (name: string) => string | undefined): string | null {
  const k = getEnv("OPENROUTER_API_KEY")?.trim();
  return k || null;
}

export function openRouterChatModel(getEnv: (name: string) => string | undefined): string {
  return (
    getEnv("OPENROUTER_CHAT_MODEL")?.trim() ||
    getEnv("OPENROUTER_CHAT_MODEL_PRIMARY")?.trim() ||
    DEFAULT_OPENROUTER_CHAT_MODEL
  );
}

export function openRouterRewriteModel(getEnv: (name: string) => string | undefined): string {
  return getEnv("OPENROUTER_REWRITE_MODEL")?.trim() || DEFAULT_OPENROUTER_REWRITE_MODEL;
}

function openRouterImagePrimary(getEnv: (name: string) => string | undefined): string {
  return (
    getEnv("OPENROUTER_IMAGE_MODEL")?.trim() ||
    getEnv("OPENROUTER_IMAGE_MODEL_PRIMARY")?.trim() ||
    DEFAULT_OPENROUTER_IMAGE_MODEL_PRIMARY
  );
}

function openRouterImageFallback(getEnv: (name: string) => string | undefined): string {
  return getEnv("OPENROUTER_IMAGE_MODEL_FALLBACK")?.trim() || DEFAULT_OPENROUTER_IMAGE_MODEL_FALLBACK;
}

function refererHeader(getEnv: (name: string) => string | undefined): string {
  return getEnv("OPENROUTER_HTTP_REFERER")?.trim() || "https://lustforge.app";
}

function titleHeader(getEnv: (name: string) => string | undefined): string {
  return getEnv("OPENROUTER_APP_TITLE")?.trim() || "LustForge";
}

export type OpenRouterChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | OpenRouterContentPart[];
  tool_call_id?: string;
  name?: string;
};

export type OpenRouterContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type OpenRouterChatCompletionResult = {
  ok: boolean;
  status: number;
  json: unknown;
  rawText: string;
};

/** Raw OpenAI-compatible chat completion. */
export async function openRouterChatCompletion(args: {
  messages: OpenRouterChatMessage[];
  getEnv: (name: string) => string | undefined;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  tools?: unknown[];
  tool_choice?: unknown;
}): Promise<OpenRouterChatCompletionResult> {
  const apiKey = resolveOpenRouterApiKey(args.getEnv);
  if (!apiKey) {
    throw new Error("OpenRouter: set Edge Function secret OPENROUTER_API_KEY (https://openrouter.ai/keys).");
  }
  const model = (args.model ?? openRouterChatModel(args.getEnv)).trim();
  const body: Record<string, unknown> = {
    model,
    messages: args.messages,
    temperature: args.temperature ?? 0.8,
    max_tokens: args.max_tokens ?? 1024,
  };
  if (args.top_p !== undefined) body.top_p = args.top_p;
  if (args.tools && args.tools.length) body.tools = args.tools;
  if (args.tool_choice !== undefined) body.tool_choice = args.tool_choice;

  const res = await fetch(`${OPENROUTER_API}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": refererHeader(args.getEnv),
      "X-Title": titleHeader(args.getEnv),
    },
    body: JSON.stringify(body),
  });
  const rawText = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(rawText) as unknown;
  } catch {
    /* leave json null */
  }
  return { ok: res.ok, status: res.status, json, rawText };
}

export function extractOpenRouterAssistantText(json: unknown): string {
  const choice = (json as { choices?: Array<{ message?: { content?: unknown } }> })?.choices?.[0]?.message;
  const c = choice?.content;
  if (typeof c === "string") return c.trim();
  if (Array.isArray(c)) {
    const parts = c as Array<{ type?: string; text?: string }>;
    const textParts = parts
      .filter((p) => p && typeof p.text === "string")
      .filter((p) => {
        const t = (p.type ?? "text").toLowerCase();
        return t === "text" || t === "output_text";
      })
      .map((p) => p.text!.trim())
      .filter(Boolean);
    if (textParts.length) return textParts.join("\n").trim();
    // Mis-tagged segments: still join plain `text` fields (some providers omit type or use custom labels).
    const any = parts
      .filter((p) => p && typeof p.text === "string")
      .map((p) => p.text!.trim())
      .filter(Boolean);
    return any.join("\n").trim();
  }
  return "";
}

export function extractFirstImageDataUrlFromOpenRouterResponse(json: unknown): string | null {
  const msg = (json as { choices?: Array<{ message?: { images?: Array<{ image_url?: { url?: string } }> } }> })?.choices?.[0]
    ?.message;
  const imgs = msg?.images;
  if (Array.isArray(imgs) && imgs.length > 0) {
    const u = imgs[0]?.image_url?.url;
    if (typeof u === "string" && u.startsWith("data:image")) return u;
  }
  return null;
}

/** Decode `data:image/png;base64,...` → bytes + mime. */
export function decodeOpenRouterImageDataUrl(dataUrl: string): { binary: Uint8Array; contentType: string; ext: string } {
  const m = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/i);
  if (!m) throw new Error("OpenRouter image: expected data:image/*;base64 URL");
  const mimeSub = m[1]!.toLowerCase();
  const b64 = m[2]!;
  const contentType = mimeSub === "jpg" ? "image/jpeg" : `image/${mimeSub}`;
  const ext = mimeSub === "jpeg" || mimeSub === "jpg" ? "jpg" : mimeSub === "png" ? "png" : mimeSub === "webp" ? "webp" : "jpg";
  const binary = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return { binary, contentType, ext };
}

/**
 * FLUX still via OpenRouter (chat completions + `modalities`).
 * Defaults: FLUX.2 Pro, then FLUX.2 Flex. Prompts stay the same rich NSFW-adjacent briefs built upstream.
 */
export async function openRouterGenerateFluxImage(args: {
  prompt: string;
  getEnv: (name: string) => string | undefined;
  aspectRatio?: "2:3" | "1:1" | "3:2";
}): Promise<{ dataUrl: string; modelUsed: string }> {
  const apiKey = resolveOpenRouterApiKey(args.getEnv);
  if (!apiKey) {
    throw new Error("OpenRouter: set OPENROUTER_API_KEY for image generation.");
  }
  const prompt = args.prompt.trim().slice(0, 12_000);
  const models = [openRouterImagePrimary(args.getEnv), openRouterImageFallback(args.getEnv)];
  let lastErr = "unknown";

  for (const model of models) {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image", "text"],
      max_tokens: 1024,
    };
    if (args.aspectRatio) {
      body.image_config = { aspect_ratio: args.aspectRatio };
    }

    const res = await fetch(`${OPENROUTER_API}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": refererHeader(args.getEnv),
        "X-Title": titleHeader(args.getEnv),
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
      const errObj = (json as { error?: { message?: string } })?.error?.message;
      lastErr = typeof errObj === "string" ? errObj : rawText.slice(0, 500);
      continue;
    }
    const dataUrl = extractFirstImageDataUrlFromOpenRouterResponse(json);
    if (dataUrl) return { dataUrl, modelUsed: model };
    lastErr = "response had no message.images[0].image_url (check model + modalities)";
  }

  throw new Error(`OpenRouter FLUX image failed: ${lastErr}`);
}
