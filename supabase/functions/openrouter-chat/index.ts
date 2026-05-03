/**
 * Classic in-app companion text chat — **OpenRouter** (`OPENROUTER_API_KEY`), not xAI.
 * Same JSON contract as `grok-chat` for a stable client (`{ response, model, usage }`).
 *
 * Hybrid: Live Voice assistant text stays on `grok-chat` (xAI) with voice uncensored prefix.
 */
import { isLustforgeAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveOpenRouterApiKey, openRouterChatModel, openRouterChatCompletion, extractOpenRouterAssistantText } from "../_shared/openRouter.ts";
import { lustforgeNarrowUserScopeBlock } from "../_shared/lustforgeNarrowUserScope.ts";
import { lustforgeChatServerSystemPrefix } from "../_shared/togetherRoleplaySystem.ts";

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

const getEnv = (name: string) => Deno.env.get(name);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sessionGate = await requireSessionUser(req);
    if ("response" in sessionGate) return sessionGate.response;
    const sessionUser = sessionGate.user;
    const adminUnrestricted = await isLustforgeAdminUser(sessionUser);

    const orKey = resolveOpenRouterApiKey(getEnv);
    if (!orKey) {
      return json(
        {
          error:
            "OpenRouter chat not configured. Set Edge Function secret OPENROUTER_API_KEY (https://openrouter.ai/keys).",
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
    const systemContent = `${lustforgeChatServerSystemPrefix()}\n${scopeBlock}${systemRaw}`.trim();

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

    const model = openRouterChatModel(getEnv);
    const res = await openRouterChatCompletion({
      getEnv,
      model,
      messages,
      temperature: 0.8,
      max_tokens: 1024,
      top_p: 0.9,
    });

    if (!res.ok || res.json === null) {
      const errMsg =
        typeof res.json === "object" && res.json !== null && "error" in res.json
          ? JSON.stringify((res.json as { error?: unknown }).error)
          : res.rawText.slice(0, 400);
      return json({ error: `OpenRouter HTTP ${res.status}: ${errMsg}` }, 502);
    }

    const content = extractOpenRouterAssistantText(res.json) || "…";
    const usage = (res.json as { usage?: unknown })?.usage ?? null;

    return json({ response: content, model, usage });
  } catch (err) {
    console.error("openrouter-chat:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg.length > 400 ? `${msg.slice(0, 397)}…` : msg }, 500);
  }
});
