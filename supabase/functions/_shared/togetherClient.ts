/**
 * Together.ai OpenAI-compatible **chat** completions and shared API base (Edge / Deno).
 * Image generation uses `/v1/images/generations` — see `togetherImage.ts`.
 * @see https://docs.together.ai/reference/chat-completions
 */

export type TogetherChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type TogetherChatCompletionArgs = {
  apiKey: string;
  model: string;
  messages: TogetherChatMessage[];
  /** Callers should pass an explicit cap for chat (e.g. Turbo); default 4096 if omitted. */
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

export type TogetherChatCompletionResult = {
  content: string;
  raw: unknown;
};

/**
 * Official inference API base is `https://api.together.xyz/v1` (docs also show api.together.ai — same keys).
 * Override with secret `TOGETHER_API_BASE_URL` if Together support points you elsewhere (no trailing slash).
 */
export function togetherApiV1Base(): string {
  let base = (Deno.env.get("TOGETHER_API_BASE_URL") ?? "https://api.together.xyz/v1").trim();
  base = base.replace(/\uFEFF/g, "").replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = "https://api.together.xyz/v1";
  }
  return base;
}

export function togetherChatCompletionsUrl(): string {
  return `${togetherApiV1Base()}/chat/completions`;
}

export function togetherImageGenerationsUrl(): string {
  return `${togetherApiV1Base()}/images/generations`;
}

/** OpenAI-shaped chat completion (tool calls, etc.) — raw JSON for Edge functions that parse `choices[0].message.tool_calls`. */
export type TogetherChatCompletionRawResult = {
  ok: boolean;
  status: number;
  json: unknown;
  rawText: string;
};

/**
 * Raw `/v1/chat/completions` POST (OpenAI-compatible). Use for tool calling; see `togetherChatCompletion` for simple text.
 */
export async function togetherChatCompletionRaw(body: Record<string, unknown>): Promise<TogetherChatCompletionRawResult> {
  const apiKey = requireTogetherApiKey();
  if (!apiKey) {
    throw new Error("Together: set Edge Function secret TOGETHER_API_KEY.");
  }
  const res = await fetch(togetherChatCompletionsUrl(), {
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
    /* leave null */
  }
  return { ok: res.ok, status: res.status, json, rawText };
}

export async function togetherChatCompletion(
  args: TogetherChatCompletionArgs,
): Promise<TogetherChatCompletionResult> {
  const max_tokens = args.max_tokens ?? 4096;
  const temperature = args.temperature ?? 0.92;
  const top_p = args.top_p ?? 0.92;

  const res = await fetch(togetherChatCompletionsUrl(), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: args.model,
      messages: args.messages,
      max_tokens,
      temperature,
      top_p,
    }),
  });

  const rawText = await res.text();
  let raw: unknown;
  try {
    raw = JSON.parse(rawText) as unknown;
  } catch {
    throw new Error(`Together API invalid JSON (HTTP ${res.status}): ${rawText.slice(0, 200)}`);
  }

  if (!res.ok) {
    const errMsg =
      typeof raw === "object" && raw !== null && "error" in raw
        ? JSON.stringify((raw as { error?: unknown }).error)
        : rawText.slice(0, 400);
    if (res.status === 401) {
      throw new Error(
        "Together rejected the API key (401). The inference host is still api.together.xyz (even if the website " +
          "redirects you to together.ai — same login, same key). In the Supabase project that matches your app " +
          "URL → Edge Functions → Secrets: name must be exactly TOGETHER_API_KEY; paste only the key (no Bearer, no quotes). " +
          "If it still fails, create a new key in Together’s API key settings and replace the secret.",
      );
    }
    throw new Error(`Together API HTTP ${res.status}: ${errMsg}`);
  }

  const obj = raw as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = obj.choices?.[0]?.message?.content?.trim() || "";
  return { content: content || "…", raw };
}

/**
 * Default: Qwen2.5-72B-Instruct-Turbo — faster replies than 235B while keeping strong uncensored RP.
 * Override with Edge secret `TOGETHER_CHAT_MODEL` (e.g. Qwen3-235B… if you prefer max quality over speed).
 */
export function defaultTogetherChatModel(): string {
  return (Deno.env.get("TOGETHER_CHAT_MODEL") ?? "Qwen/Qwen2.5-72B-Instruct-Turbo").trim();
}

/** Forge / `parse-companion-prompt` tool-calling model (defaults to same as chat if unset). */
export function togetherForgeParseModel(): string {
  const m = Deno.env.get("TOGETHER_FORGE_PARSE_MODEL")?.trim();
  if (m) return m;
  return defaultTogetherChatModel();
}

/**
 * Supabase secrets are sometimes pasted with quotes, a `Bearer ` prefix, or newlines — Together rejects those with 401.
 */
export function normalizeTogetherApiKey(raw: string): string {
  let k = raw.replace(/\uFEFF/g, "").replace(/\u00a0/g, " ").replace(/\r\n/g, "\n").trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1).trim();
  }
  if (/^bearer\s+/i.test(k)) {
    k = k.replace(/^bearer\s+/i, "").trim();
  }
  return k;
}

export function requireTogetherApiKey(): string | null {
  const k = normalizeTogetherApiKey(Deno.env.get("TOGETHER_API_KEY") ?? "");
  return k || null;
}
