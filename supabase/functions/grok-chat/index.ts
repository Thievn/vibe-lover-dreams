/**
 * In-chat assistant text (Classic + Live Voice) — xAI Grok only (`XAI_API_KEY` / `GROK_API_KEY`).
 * Same request/response shape as the legacy `together-chat` function for a stable client.
 */
import { isLustforgeAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { lustforgeNarrowUserScopeBlock } from "../_shared/lustforgeNarrowUserScope.ts";
import { togetherChatServerSystemPrefix } from "../_shared/togetherRoleplaySystem.ts";

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

function defaultGrokChatModel(): string {
  return (Deno.env.get("GROK_CHAT_MODEL") ?? "grok-3").trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sessionGate = await requireSessionUser(req);
    if ("response" in sessionGate) return sessionGate.response;
    const sessionUser = sessionGate.user;
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
      companionId?: string;
      messages?: { role: string; content: string }[];
      systemPrompt?: string;
      companionName?: string;
      connectedToys?: unknown;
    } | null;

    const systemRaw = String(body?.systemPrompt ?? "").trim();
    if (!systemRaw) {
      return json({ error: "systemPrompt is required" }, 400);
    }

    const scopeBlock = adminUnrestricted ? "" : `${lustforgeNarrowUserScopeBlock()}\n`;
    const systemContent = `${togetherChatServerSystemPrefix()}\n${scopeBlock}${systemRaw}`.trim();

    const threadRaw = Array.isArray(body?.messages) ? body!.messages! : [];
    const messages = [
      {
        role: "system" as const,
        content: systemContent.slice(0, 120_000),
      },
      ...threadRaw.slice(-40).map((m) => {
        const role = m.role === "assistant" ? ("assistant" as const) : ("user" as const);
        return { role, content: String(m.content ?? "").slice(0, 24_000) };
      }),
    ];

    const model = defaultGrokChatModel();

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.8,
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

    return json({ response: content, model, usage: (raw as { usage?: unknown })?.usage ?? null });
  } catch (err) {
    console.error("grok-chat:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg.length > 400 ? `${msg.slice(0, 397)}…` : msg }, 500);
  }
});
