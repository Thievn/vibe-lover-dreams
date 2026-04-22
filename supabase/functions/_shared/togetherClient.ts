/**
 * Together.ai OpenAI-compatible chat completions (Edge / Deno).
 * @see https://docs.together.ai/reference/chat-completions
 */

export type TogetherChatMessage = { role: "system" | "user" | "assistant"; content: string };

export type TogetherChatCompletionArgs = {
  apiKey: string;
  model: string;
  messages: TogetherChatMessage[];
  /** Creative long-form RP — high ceiling; Together bills by tokens. */
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
};

export type TogetherChatCompletionResult = {
  content: string;
  raw: unknown;
};

const TOGETHER_URL = "https://api.together.xyz/v1/chat/completions";

export async function togetherChatCompletion(
  args: TogetherChatCompletionArgs,
): Promise<TogetherChatCompletionResult> {
  const max_tokens = args.max_tokens ?? 4096;
  const temperature = args.temperature ?? 0.92;
  const top_p = args.top_p ?? 0.92;

  const res = await fetch(TOGETHER_URL, {
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
        "Together rejected the API key (401). In Supabase → Edge Functions → Secrets, set TOGETHER_API_KEY to the " +
          "key from https://api.together.xyz/settings/api-keys only (no word Bearer, no quotes). Redeploy functions after changing secrets.",
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

export function defaultTogetherChatModel(): string {
  return (Deno.env.get("TOGETHER_CHAT_MODEL") ?? "Qwen/Qwen2.5-72B-Instruct").trim();
}

/**
 * Supabase secrets are sometimes pasted with quotes, a `Bearer ` prefix, or newlines — Together rejects those with 401.
 */
export function normalizeTogetherApiKey(raw: string): string {
  let k = raw.replace(/\r\n/g, "\n").trim();
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
