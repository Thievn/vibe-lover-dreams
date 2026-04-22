import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import {
  defaultTogetherChatModel,
  requireTogetherApiKey,
  togetherChatCompletion,
  type TogetherChatMessage,
} from "../_shared/togetherClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_FALLBACK = ["Tell me more…", "I love that.", "Keep going."];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const session = await requireSessionUser(req);
    if ("response" in session) return session.response;

    const { companionName, messages } = await req.json() as {
      companionName?: string;
      messages?: { role: string; content: string }[];
    };

    const thread = Array.isArray(messages) ? messages.slice(-14) : [];
    if (thread.length === 0) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = requireTogetherApiKey();
    if (!apiKey) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(companionName ?? "Companion").slice(0, 80);
    const system = `You suggest 3 very short optional replies the USER could send next in an adults-only chat with "${name}".
Rules: JSON only, no markdown. Format: {"suggestions":["...","...","..."]}
Each string max 72 characters. Match thread energy: flirty, playful, or explicitly sexual language is allowed when it fits; stay consensual-adults fiction.`;

    const model = defaultTogetherChatModel();
    const chatMessages: TogetherChatMessage[] = [
      { role: "system", content: system },
      ...thread.map((m) => ({
        role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
        content: String(m.content ?? "").slice(0, 4000),
      })),
    ];

    const { content: raw } = await togetherChatCompletion({
      apiKey,
      model,
      messages: chatMessages,
      max_tokens: 220,
      temperature: 0.85,
      top_p: 0.9,
    });

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(raw.trim());
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = parsed.suggestions.map((x: unknown) => String(x ?? "").trim()).filter(Boolean);
      }
    } catch {
      const m = raw.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]) as unknown;
          if (Array.isArray(arr)) {
            suggestions = arr.map((x) => String(x ?? "").trim()).filter(Boolean);
          }
        } catch {
          /* ignore */
        }
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
