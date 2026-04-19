import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";

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

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(companionName ?? "Companion").slice(0, 80);
    const system = `You suggest 3 very short optional replies the USER could send next in an adults-only chat with "${name}".
Rules: JSON only, no markdown. Format: {"suggestions":["...","...","..."]}
Each string max 72 characters. Match thread energy: flirty, playful, or explicitly sexual language is allowed when it fits; stay consensual-adults fiction. xAI applies its own policies — do not self-censor beyond that.`;

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: system },
          ...thread.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: String(m.content ?? "").slice(0, 4000),
          })),
        ],
        max_tokens: 220,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("smart-replies grok error:", errText);
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || "";
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
