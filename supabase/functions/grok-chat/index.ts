/**
 * xAI Grok (`XAI_API_KEY` / `GROK_API_KEY`):
 * - **classic_chat** — main in-app companion text chat.
 * - **live_voice** — Live Voice assistant text (uncensored voice stack prefix).
 * - **image_teaser** — one short in-character line before a still is shown.
 * - **smart_replies** — three short suggested user replies (JSON).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { isLustforgeAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { publicApiTeaserGuardResponse } from "../_shared/publicApiTeaserGate.ts";
import { assertUserUnlockedCompanionForSpend } from "../_shared/requireCompanionFcUnlock.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { defaultGrokProductChatModel } from "../_shared/xaiGrokChatRaw.ts";
import { lustforgeNarrowUserScopeBlock } from "../_shared/lustforgeNarrowUserScope.ts";
import { lustforgeChatServerSystemPrefix } from "../_shared/togetherRoleplaySystem.ts";
import { GROK_VOICE_UNCENSORED_SYSTEM_PREFIX } from "../_shared/grokVoiceUncensoredPrefix.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/** Stable per `(userId, companionId)` for xAI prompt-cache affinity (`x-grok-conv-id`). */
async function grokConversationCacheId(userId: string, companionId: string): Promise<string> {
  const raw = new TextEncoder().encode(`${userId}:${companionId}`);
  const digest = await crypto.subtle.digest("SHA-256", raw);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

const STATIC_SMART_FALLBACK = ["Tell me more…", "I love that.", "Keep going."];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sessionGate = await requireSessionUser(req);
    if ("response" in sessionGate) return sessionGate.response;
    const sessionUser = sessionGate.user;
    const teaserBlock = await publicApiTeaserGuardResponse(sessionUser);
    if (teaserBlock) return teaserBlock;
    const adminUnrestricted = await isLustforgeAdminUser(sessionUser);

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return json(
        {
          error:
            "Grok chat not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        },
        503,
      );
    }

    const body = (await req.json().catch(() => null)) as {
      intent?: string;
      companionId?: string;
      messages?: { role: string; content: string }[];
      systemPrompt?: string;
      companionName?: string;
      connectedToys?: unknown;
    } | null;

    const intent = String(body?.intent ?? "").trim();
    const allowed = new Set(["live_voice", "image_teaser", "classic_chat", "smart_replies"]);
    if (!allowed.has(intent)) {
      return json(
        {
          error:
            "grok-chat: pass body.intent one of: \"classic_chat\", \"live_voice\", \"image_teaser\", \"smart_replies\".",
        },
        400,
      );
    }

    const systemRaw = String(body?.systemPrompt ?? "").trim();
    if (intent !== "smart_replies" && !systemRaw) {
      return json({ error: "systemPrompt is required" }, 400);
    }

    const companionIdForGate = String(body?.companionId ?? "").trim();
    if (intent === "classic_chat" || intent === "live_voice" || intent === "smart_replies" || intent === "image_teaser") {
      if (!companionIdForGate) {
        return json(
          {
            error:
              "companionId is required — the server checks that this card is in your vault before running AI (same rule as Discover).",
            code: "MISSING_COMPANION_ID",
          },
          400,
        );
      }
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const svcKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !svcKey) return json({ error: "Server misconfigured" }, 500);
      const svc = createClient(supabaseUrl, svcKey);
      const gate = await assertUserUnlockedCompanionForSpend(svc, sessionUser.id, companionIdForGate);
      if (!gate.ok) return json({ error: gate.message, code: "COMPANION_LOCKED" }, 403);
    }

    const threadRaw = Array.isArray(body?.messages) ? body!.messages! : [];

    let messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    let maxTokens = 1024;
    let temperature = 0.8;

    if (intent === "image_teaser") {
      messages = [
        { role: "system", content: systemRaw.slice(0, 120_000) },
        ...threadRaw.slice(-8).map((m) => {
          const role = m.role === "assistant" ? ("assistant" as const) : ("user" as const);
          return { role, content: String(m.content ?? "").slice(0, 24_000) };
        }),
      ];
      maxTokens = 512;
      temperature = 0.85;
    } else if (intent === "smart_replies") {
      const name = String(body?.companionName ?? "Companion").slice(0, 80);
      const scopeLine = adminUnrestricted
        ? ""
        : ` Suggestions must stay in fantasy/roleplay with the companion — no homework, technical, product/app, or general Q&A prompts.`;
      const sys = `You suggest 3 very short optional replies the USER could send next in an adults-only chat with "${name}".
Rules: Reply with **only** valid JSON, no markdown or code fences. Format: {"suggestions":["...","...","..."]}
Each string max 72 characters. Match thread energy: flirty, playful, or explicitly sexual language is allowed when it fits; stay consensual-adults fiction.${scopeLine}`;
      messages = [
        { role: "system", content: sys },
        ...threadRaw.slice(-14).map((m) => {
          const role = m.role === "assistant" ? ("assistant" as const) : ("user" as const);
          return { role, content: String(m.content ?? "").slice(0, 4000) };
        }),
      ];
      maxTokens = 220;
      temperature = 0.8;
    } else if (intent === "classic_chat") {
      const scopeBlock = adminUnrestricted ? "" : `${lustforgeNarrowUserScopeBlock()}\n`;
      const systemContent = `${lustforgeChatServerSystemPrefix()}\n${scopeBlock}${systemRaw}`.trim();
      messages = [
        { role: "system", content: systemContent.slice(0, 120_000) },
        ...threadRaw.slice(-100).map((m) => {
          const role = m.role === "assistant" ? ("assistant" as const) : ("user" as const);
          return { role, content: String(m.content ?? "").slice(0, 24_000) };
        }),
      ];
    } else {
      /* live_voice */
      const scopeBlock = adminUnrestricted ? "" : `${lustforgeNarrowUserScopeBlock()}\n`;
      const systemContent =
        `${GROK_VOICE_UNCENSORED_SYSTEM_PREFIX}${lustforgeChatServerSystemPrefix()}\n${scopeBlock}${systemRaw}`.trim();
      messages = [
        { role: "system", content: systemContent.slice(0, 120_000) },
        ...threadRaw.slice(-100).map((m) => {
          const role = m.role === "assistant" ? ("assistant" as const) : ("user" as const);
          return { role, content: String(m.content ?? "").slice(0, 24_000) };
        }),
      ];
    }

    const model = defaultGrokProductChatModel((n) => Deno.env.get(n));

    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };
    if (companionIdForGate) {
      headers["x-grok-conv-id"] = await grokConversationCacheId(sessionUser.id, companionIdForGate);
    }

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        top_p: 0.9,
      }),
    });

    const rawText = await res.text();
    let raw: unknown;
    try {
      raw = JSON.parse(rawText) as unknown;
    } catch {
      return json({ error: `xAI invalid JSON (HTTP ${res.status})` }, 502);
    }

    if (!res.ok) {
      const errMsg =
        typeof raw === "object" && raw !== null && "error" in raw
          ? JSON.stringify((raw as { error?: unknown }).error)
          : rawText.slice(0, 400);
      return json({ error: `xAI HTTP ${res.status}: ${errMsg}` }, 502);
    }

    const obj = raw as { choices?: Array<{ message?: { content?: string } }> };
    const content = obj.choices?.[0]?.message?.content?.trim() || "…";

    if (intent === "smart_replies") {
      const parsed = extractJsonObject(content);
      let suggestions: string[] = [];
      if (parsed && typeof parsed === "object" && parsed !== null && "suggestions" in parsed) {
        const arr = (parsed as { suggestions: unknown }).suggestions;
        if (Array.isArray(arr)) {
          suggestions = arr.map((x) => String(x ?? "").trim()).filter(Boolean).slice(0, 3);
        }
      }
      if (suggestions.length < 3) {
        suggestions = [...suggestions, ...STATIC_SMART_FALLBACK].slice(0, 3);
      }
      return json({ suggestions, model, usage: (raw as { usage?: unknown })?.usage ?? null });
    }

    return json({ response: content, model, usage: (raw as { usage?: unknown })?.usage ?? null });
  } catch (err) {
    console.error("grok-chat:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg.length > 400 ? `${msg.slice(0, 397)}…` : msg }, 500);
  }
});
