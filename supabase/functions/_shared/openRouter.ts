/**
 * OpenRouter client for **text** LustForge traffic (chat, admin tools, prompt rewriter, vision classify).
 *
 * Hybrid architecture:
 * - **OpenRouter** (this file): Classic companion chat, Forge/admin text helpers, prompt rewriter (no FLUX / image modality here).
 * - **Together.ai** (`togetherImage.ts`, `togetherClient.ts`): All **FLUX.2** stills — default **black-forest-labs/FLUX.2-dev** on Together `/v1/images/generations` (profile `together_image_model` or `TOGETHER_IMAGE_MODEL` overrides).
 * - **xAI / Grok** (elsewhere): Live Voice `grok-chat`, Realtime client secret, TTS/STT, Grok **video** (I2V).
 *
 * Secrets (Supabase Edge): `OPENROUTER_API_KEY`, optional `OPENROUTER_CHAT_MODEL`, `OPENROUTER_REWRITE_MODEL`, etc.
 */

const OPENROUTER_API = "https://openrouter.ai/api/v1";

/** Default text model — exact OpenRouter slug. */
export const DEFAULT_OPENROUTER_CHAT_MODEL = "deepseek/deepseek-v4-pro";

/** Default rewriter model — instruction-following text (avoid routing chat/reasoning models here). */
export const DEFAULT_OPENROUTER_REWRITE_MODEL = "openai/gpt-4o-mini";

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
