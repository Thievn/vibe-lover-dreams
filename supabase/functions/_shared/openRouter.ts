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

function isUsableOpenRouterImageRef(s: string): boolean {
  const t = s.trim();
  return t.startsWith("data:image") || t.startsWith("https://") || t.startsWith("http://");
}

function safeOpenRouterJsonSnippet(v: unknown, max: number): string {
  try {
    const s = typeof v === "string" ? v : JSON.stringify(v);
    const one = s.replace(/\s+/g, " ").trim();
    return one.length > max ? `${one.slice(0, max)}…` : one;
  } catch {
    return String(v).slice(0, max);
  }
}

function openRouterErrorMetadataParts(errObj: Record<string, unknown>): string[] {
  const meta = errObj.metadata;
  if (!meta || typeof meta !== "object") return [];
  const m = meta as Record<string, unknown>;
  const parts: string[] = [];
  if (typeof m.provider_name === "string" && m.provider_name.trim()) parts.push(`provider=${m.provider_name.trim()}`);
  if (typeof m.model_slug === "string" && m.model_slug.trim()) parts.push(`model=${m.model_slug.trim()}`);
  if (m.raw !== undefined && m.raw !== null) parts.push(`raw=${safeOpenRouterJsonSnippet(m.raw, 700)}`);
  if (Array.isArray(m.reasons) && m.reasons.length) parts.push(`reasons=${safeOpenRouterJsonSnippet(m.reasons, 300)}`);
  return parts;
}

/** Rich OpenRouter / upstream error text (message is often only "Provider returned error"). */
export function formatOpenRouterApiError(json: unknown, fallbackRaw: string, httpStatus: number): string {
  const hasTopLevelError =
    json &&
    typeof json === "object" &&
    typeof (json as Record<string, unknown>).error === "object";

  const bits: string[] = [];
  if (httpStatus === 200 && hasTopLevelError) {
    bits.push("OpenRouter HTTP 200 + error body (upstream rejected request; check model id & request params)");
  } else {
    bits.push(`HTTP ${httpStatus}`);
  }

  if (json && typeof json === "object") {
    const top = json as Record<string, unknown>;
    const e = top.error;
    if (e && typeof e === "object") {
      const er = e as Record<string, unknown>;
      if (typeof er.message === "string" && er.message.trim()) bits.push(er.message.trim());
      if (er.code !== undefined && er.code !== null && String(er.code).trim()) bits.push(`code=${String(er.code)}`);
      if (typeof er.type === "string" && er.type.trim()) bits.push(`type=${er.type.trim()}`);
      const metaParts = openRouterErrorMetadataParts(er);
      bits.push(...metaParts);
      if (!metaParts.length) {
        bits.push(`error_json=${safeOpenRouterJsonSnippet(er, 900)}`);
      }
    } else if (typeof e === "string" && e.trim()) {
      bits.push(e.trim());
    }
  }
  if (bits.length <= 1) {
    const fb = fallbackRaw.replace(/\s+/g, " ").trim();
    if (fb) bits.push(fb.slice(0, 800));
  }
  return bits.join(" — ").slice(0, 1600);
}

function formatOpenRouterErrorObjectMetadata(errObj: Record<string, unknown>): string {
  const parts = openRouterErrorMetadataParts(errObj);
  if (!parts.length) return "";
  return ` | ${parts.join("; ")}`;
}

/** When HTTP 200 but no image: append `error.metadata` if OpenRouter still sent an error object. */
function formatOpenRouterTopLevelErrorExtra(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const err = (json as Record<string, unknown>).error;
  if (!err || typeof err !== "object") return "";
  return formatOpenRouterErrorObjectMetadata(err as Record<string, unknown>);
}

function extractOpenRouterChoiceLevelError(json: unknown): string | null {
  const root = unwrapOpenRouterChatCompletionJson(json);
  const choices = (root as { choices?: Array<Record<string, unknown>> })?.choices;
  if (!Array.isArray(choices)) return null;
  for (const ch of choices) {
    if (!ch || typeof ch !== "object") continue;
    const ce = ch.error;
    if (ce && typeof ce === "object") {
      const cer = ce as Record<string, unknown>;
      const msg = cer.message;
      if (typeof msg === "string" && msg.trim()) {
        return `${msg.trim()}${formatOpenRouterErrorObjectMetadata(cer)}`;
      }
    }
  }
  return null;
}

/** Gateways sometimes wrap the OpenAI-shaped body under `data`, `result`, or `output`. */
function unwrapOpenRouterChatCompletionJson(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const o = json as Record<string, unknown>;
  if (Array.isArray(o.choices)) return json;
  for (const key of ["data", "result", "output", "response"] as const) {
    const inner = o[key];
    if (inner && typeof inner === "object" && Array.isArray((inner as Record<string, unknown>).choices)) {
      return inner;
    }
  }
  return json;
}

function peelMessageLikeForImage(message: unknown): string | null {
  if (!message || typeof message !== "object") return null;
  const m = message as Record<string, unknown>;
  return peelImageFromImagesArray(m.images) ?? peelImageFromMessageContent(m.content);
}

/** Last resort: find an embedded base64 still anywhere in the tree (odd provider shapes). */
function deepScanOpenRouterDataImageUrl(json: unknown): string | null {
  let nodes = 0;
  const visit = (node: unknown, depth: number): string | null => {
    if (depth > 16 || nodes++ > 800) return null;
    if (typeof node === "string") {
      const t = node.trim();
      if (t.startsWith("data:image") && t.includes(";base64,") && t.length >= 80) return t;
      return null;
    }
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) {
      for (const x of node) {
        const u = visit(x, depth + 1);
        if (u) return u;
      }
      return null;
    }
    for (const v of Object.values(node as Record<string, unknown>)) {
      const u = visit(v, depth + 1);
      if (u) return u;
    }
    return null;
  };
  return visit(json, 0);
}

function peelUrlFromImageBlock(img: Record<string, unknown>): string | null {
  const nested = img.image_url ?? img.imageUrl;
  if (nested && typeof nested === "object") {
    const url = (nested as { url?: unknown }).url;
    if (typeof url === "string" && isUsableOpenRouterImageRef(url)) return url.trim();
  }
  if (typeof nested === "string" && isUsableOpenRouterImageRef(nested)) return nested.trim();
  if (typeof img.url === "string" && isUsableOpenRouterImageRef(img.url)) return img.url.trim();
  return null;
}

function peelImageFromImagesArray(images: unknown): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;
  for (const raw of images) {
    if (typeof raw === "string" && isUsableOpenRouterImageRef(raw)) return raw.trim();
    if (!raw || typeof raw !== "object") continue;
    const u = peelUrlFromImageBlock(raw as Record<string, unknown>);
    if (u) return u;
  }
  return null;
}

function peelImageFromMessageContent(content: unknown): string | null {
  if (!Array.isArray(content)) return null;
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const o = part as Record<string, unknown>;
    const typ = String(o.type ?? "").toLowerCase();
    if (typ !== "image_url" && typ !== "output_image") continue;
    const iu = o.image_url ?? o.imageUrl;
    if (iu && typeof iu === "object") {
      const url = (iu as { url?: unknown }).url;
      if (typeof url === "string" && isUsableOpenRouterImageRef(url)) return url.trim();
    }
  }
  return null;
}

/**
 * First usable image reference from an OpenRouter `/chat/completions` JSON body:
 * unwraps `data`/`result`/`output` wrappers; scans every `choices[]` entry; `message` / `delta` / choice-level `images`;
 * snake or camelCase; optional `message.content` image parts; `data:` or `http(s)` URLs; bounded deep-scan for `data:image`.
 */
export function extractOpenRouterImageUrlCandidate(json: unknown): string | null {
  const root = unwrapOpenRouterChatCompletionJson(json);
  const choices = (root as { choices?: unknown })?.choices;
  if (Array.isArray(choices)) {
    for (const choice of choices) {
      if (!choice || typeof choice !== "object") continue;
      const ch = choice as Record<string, unknown>;
      const u =
        peelImageFromImagesArray(ch.images) ??
        peelMessageLikeForImage(ch.message) ??
        peelMessageLikeForImage(ch.delta);
      if (u) return u;
    }
  }
  return deepScanOpenRouterDataImageUrl(root);
}

export function extractFirstImageDataUrlFromOpenRouterResponse(json: unknown): string | null {
  const c = extractOpenRouterImageUrlCandidate(json);
  return c && c.startsWith("data:image") ? c : null;
}

function summarizeMissingOpenRouterImage(json: unknown): string {
  const rawTop = json && typeof json === "object" ? (json as Record<string, unknown>) : null;
  if (rawTop?.error && typeof rawTop.error === "object") {
    const er = rawTop.error as Record<string, unknown>;
    const em = er.message;
    if (typeof em === "string" && em.trim()) {
      return `${em.trim()}${formatOpenRouterErrorObjectMetadata(er)}`.slice(0, 1200);
    }
  }

  const root = unwrapOpenRouterChatCompletionJson(json);
  const top = root && typeof root === "object" ? (root as Record<string, unknown>) : null;
  const topKeys = top ? Object.keys(top).slice(0, 28).join(",") : "non-object";
  const rawKeys = rawTop && top !== rawTop ? Object.keys(rawTop).slice(0, 28).join(",") : "";

  const choices = top?.choices;
  if (!Array.isArray(choices)) {
    return `no choices[] in response (unwrapped keys: ${topKeys}${rawKeys ? `; outer keys: ${rawKeys}` : ""})`;
  }
  if (choices.length === 0) return `empty choices[] (top keys: ${topKeys})`;

  const ch0 = choices[0] as Record<string, unknown> | undefined;
  if (!ch0 || typeof ch0 !== "object") return `choices[0] invalid (choices.length=${choices.length})`;

  const msg = ch0.message;
  if (!msg || typeof msg !== "object") {
    const chKeys = Object.keys(ch0).join(",");
    return `choices[0].message missing or null (choice keys: ${chKeys}; finish_reason=${String(ch0.finish_reason)}; native_finish_reason=${String(ch0.native_finish_reason)})`;
  }

  const keys = Object.keys(msg).join(",");
  const im = msg.images;
  const imDesc = Array.isArray(im) ? `images.length=${im.length}` : `images=${typeof im}`;
  const c = msg.content;
  const cDesc = Array.isArray(c) ? `content.parts=${c.length}` : `content=${typeof c}`;
  return `no usable image URL (message keys: ${keys}; ${imDesc}; ${cDesc}). Check OPENROUTER_IMAGE_MODEL supports image output and modalities.`;
}

/** Fetch a hosted image URL and return a `data:image/*;base64,...` string for storage decode. */
export async function openRouterFetchImageUrlToDataUrl(imageUrl: string): Promise<string> {
  const res = await fetch(imageUrl.trim(), { redirect: "follow" });
  if (!res.ok) throw new Error(`OpenRouter image fetch failed: HTTP ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let ct = res.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() || "image/png";
  if (!ct.startsWith("image/")) ct = "image/png";
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  const b64 = btoa(binary);
  return `data:${ct};base64,${b64}`;
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
 * FLUX is **image-only** on OpenRouter — use `modalities: ["image"]` only (`["image","text"]` is for models like Gemini and breaks FLUX routing).
 * Do **not** send `max_tokens` here: BFL / some upstreams return 400 "Provider returned error" when it is present on image-only generations.
 * Defaults: FLUX.2 Pro, then FLUX.2 Flex.
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
      modalities: ["image"],
      stream: false,
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
      lastErr = formatOpenRouterApiError(json, rawText, res.status);
      continue;
    }
    const unwrapped = unwrapOpenRouterChatCompletionJson(json) as { choices?: unknown };
    const err200 = (json as { error?: { message?: string } })?.error?.message;
    if (typeof err200 === "string" && err200.trim() && !Array.isArray(unwrapped?.choices)) {
      lastErr = formatOpenRouterApiError(json, rawText, res.status);
      continue;
    }
    const candidate = extractOpenRouterImageUrlCandidate(json);
    let dataUrl: string | null = null;
    if (candidate) {
      if (candidate.startsWith("data:image")) {
        dataUrl = candidate;
      } else if (candidate.startsWith("http://") || candidate.startsWith("https://")) {
        try {
          dataUrl = await openRouterFetchImageUrlToDataUrl(candidate);
        } catch (fetchErr) {
          lastErr = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
          continue;
        }
      }
    }
    if (dataUrl) return { dataUrl, modelUsed: model };
    const choiceErr = extractOpenRouterChoiceLevelError(json);
    if (choiceErr) lastErr = choiceErr;
    else lastErr = summarizeMissingOpenRouterImage(json) + formatOpenRouterTopLevelErrorExtra(json);
  }

  throw new Error(`OpenRouter FLUX image failed: ${lastErr}`);
}
