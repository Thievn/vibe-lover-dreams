import { isLustforgeAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { defaultGrokProductChatModel, extractGrokAssistantText, grokChatCompletionRaw } from "../_shared/xaiGrokChatRaw.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_FALLBACK = ["Tell me more…", "I love that.", "Keep going."];

const getEnv = (n: string) => Deno.env.get(n);

function extractJsonObject(text: string): unknown {
  const t = text.trim();
  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(t.slice(start, end + 1)) as unknown;
    } catch {
      /* fall through */
    }
  }
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const session = await requireSessionUser(req);
    if ("response" in session) return session.response;
    const adminUnrestricted = await isLustforgeAdminUser(session.user);

    const { companionName, messages } = (await req.json().catch(() => ({}))) as {
      companionName?: string;
      messages?: { role: string; content: string }[];
    };

    const thread = Array.isArray(messages) ? messages.slice(-14) : [];
    if (thread.length === 0) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!resolveXaiApiKey(getEnv)) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(companionName ?? "Companion").slice(0, 80);
    const scopeLine = adminUnrestricted
      ? ""
      : ` Suggestions must stay in fantasy/roleplay with the companion — no homework, technical, product/app, or general Q&A prompts.`;
    const system = `You suggest 3 very short optional replies the USER could send next in an adults-only chat with "${name}".
Rules: Reply with **only** valid JSON, no markdown or code fences. Format: {"suggestions":["...","...","..."]}
Each string max 72 characters. Match thread energy: flirty, playful, or explicitly sexual language is allowed when it fits; stay consensual-adults fiction.${scopeLine}`;

    const model = defaultGrokProductChatModel(getEnv);
    const res = await grokChatCompletionRaw({
      model,
      messages: [
        { role: "system", content: system },
        ...thread.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: String(m.content ?? "").slice(0, 4000),
        })),
      ],
      temperature: 0.8,
      max_tokens: 220,
      top_p: 0.9,
    });

    if (!res.ok || res.json === null) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = extractGrokAssistantText(res.json);
    const parsed = extractJsonObject(content);
    let suggestions: string[] = [];
    if (parsed && typeof parsed === "object" && parsed !== null && "suggestions" in parsed) {
      const arr = (parsed as { suggestions: unknown }).suggestions;
      if (Array.isArray(arr)) {
        suggestions = arr.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    }

    const out = suggestions.slice(0, 3);
    while (out.length < 3) {
      out.push(STATIC_FALLBACK[out.length] ?? "…");
    }

    return new Response(JSON.stringify({ suggestions: out.slice(0, 3) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("chat-smart-replies:", err);
    return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
