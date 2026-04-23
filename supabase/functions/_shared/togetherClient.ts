/**
 * Together.ai OpenAI-compatible chat completions (Edge / Deno).
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
 * Official inference API is `https://api.together.xyz/v1` (docs.together.ai). The marketing site
 * uses together.ai; API keys from the dashboard work against this host.
 * Override only if Together support points you elsewhere: secret `TOGETHER_API_BASE_URL` (no trailing slash).
 */
export function togetherChatCompletionsUrl(): string {
  let base = (Deno.env.get("TOGETHER_API_BASE_URL") ?? "https://api.together.xyz/v1").trim();
  base = base.replace(/\uFEFF/g, "").replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(base)) {
    base = "https://api.together.xyz/v1";
  }
  return `${base}/chat/completions`;
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
