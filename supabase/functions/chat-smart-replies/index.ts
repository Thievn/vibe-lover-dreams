import { isLustforgeAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { openRouterChatCompletion, extractOpenRouterAssistantText, openRouterChatModel, resolveOpenRouterApiKey } from "../_shared/openRouter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATIC_FALLBACK = ["Tell me more…", "I love that.", "Keep going."];

const getEnv = (n: string) => Deno.env.get(n);

function smartRepliesModel(): string {
  return (getEnv("OPENROUTER_SMART_REPLIES_MODEL") ?? openRouterChatModel(getEnv)).trim();
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

    if (!resolveOpenRouterApiKey(getEnv)) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = String(companionName ?? "Companion").slice(0, 80);
    const scopeLine = adminUnrestricted
      ? ""
      : ` Suggestions must stay in fantasy/roleplay with the companion — no homework, technical, product/app, or general Q&A prompts.`;
    const system = `You suggest 3 very short optional replies the USER could send next in an adults-only chat with "${name}".
Rules: JSON only, no markdown. Format: {"suggestions":["...","...","..."]}
Each string max 72 characters. Match thread energy: flirty, playful, or explicitly sexual language is allowed when it fits; stay consensual-adults fiction.${scopeLine}`;

    const res = await openRouterChatCompletion({
      getEnv,
      model: smartRepliesModel(),
      messages: [
        { role: "system", content: system },
        ...thread.map((m) => ({
          role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
          content: String(m.content ?? "").slice(0, 4000),
        })),
      ],
      max_tokens: 220,
      temperature: 0.8,
      top_p: 0.9,
    });

    if (!res.ok || res.json === null) {
      return new Response(JSON.stringify({ suggestions: STATIC_FALLBACK, degraded: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const content = extractOpenRouterAssistantText(res.json);

    let suggestions: string[] = [];
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed?.suggestions)) {
        suggestions = (parsed as { suggestions: unknown[] }).suggestions.map((x) => String(x ?? "").trim()).filter(Boolean);
      }
    } catch {
      const m = content.match(/\[[\s\S]*\]/);
      if (m) {
        try {
          const arr = JSON.parse(m[0]) as unknown;
          if (Array.isArray(arr)) {
            suggestions = (arr as unknown[]).map((x) => String(x ?? "").trim()).filter(Boolean);
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
