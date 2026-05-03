import { resolveXaiApiKey } from "./resolveXaiApiKey.ts";

export type GrokChatRawResult = {
  ok: boolean;
  status: number;
  json: unknown;
  rawText: string;
};

const GROK_FETCH_TIMEOUT_MS = 115_000;

/** Raw xAI `/v1/chat/completions` POST (tools, JSON mode, etc.). */
export async function grokChatCompletionRaw(
  body: Record<string, unknown>,
  apiKeyOverride?: string | null,
): Promise<GrokChatRawResult> {
  const apiKey =
    (typeof apiKeyOverride === "string" && apiKeyOverride.trim() ? apiKeyOverride.trim() : null) ||
    resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
  if (!apiKey) {
    return { ok: false, status: 503, json: null, rawText: "Missing XAI_API_KEY or GROK_API_KEY" };
  }
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), GROK_FETCH_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const name = e instanceof Error ? e.name : "";
    if (name === "AbortError") {
      return {
        ok: false,
        status: 504,
        json: null,
        rawText: `xAI Grok request timed out after ${GROK_FETCH_TIMEOUT_MS / 1000}s — model may be overloaded or the key lacks access.`,
      };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, status: 0, json: null, rawText: msg || "Grok fetch failed" };
  } finally {
    clearTimeout(tid);
  }
  const rawText = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(rawText) as unknown;
  } catch {
    /* leave null */
  }
  return { ok: res.ok, status: res.status, json, rawText };
}

export function defaultGrokForgeParseModel(): string {
  return (Deno.env.get("GROK_FORGE_PARSE_MODEL") ?? Deno.env.get("GROK_CHAT_MODEL") ?? "grok-3").trim();
}

export function defaultGrokRewriteModel(getEnv: (name: string) => string | undefined): string {
  return getEnv("GROK_REWRITE_MODEL")?.trim() || getEnv("GROK_CHAT_MODEL")?.trim() || "grok-3";
}

/** One-shot assistant string from Grok chat completions (image prompt rewriter, etc.). */
export async function grokSingleChatAssistantText(args: {
  model: string;
  system: string;
  user: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const r = await grokChatCompletionRaw({
    model: args.model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
    temperature: args.temperature ?? 0.88,
    max_tokens: args.max_tokens ?? 900,
  });
  if (!r.ok || r.json === null) {
    throw new Error(`Grok rewriter HTTP ${r.status}: ${r.rawText.slice(0, 500)}`);
  }
  const c = (r.json as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content
    ?.trim();
  if (!c) throw new Error("Grok rewriter: empty assistant content");
  return c;
}
