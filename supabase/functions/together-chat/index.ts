/**
 * Classic typed chat + roleplay: Together.ai only (`TOGETHER_API_KEY`).
 * Default model: Qwen2.5-72B-Instruct-Turbo (override `TOGETHER_CHAT_MODEL`) — tuned for fast NSFW RP.
 * Live Voice assistant text uses `grok-chat` (Grok); TTS/STT use other Grok Edge functions.
 */
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { togetherChatServerSystemPrefix } from "../_shared/togetherRoleplaySystem.ts";
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

function json(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const sessionGate = await requireSessionUser(req);
    if ("response" in sessionGate) return sessionGate.response;

    const apiKey = requireTogetherApiKey();
    if (!apiKey) {
      return json(
        {
          error:
            "Together API not configured. Set Edge Function secret TOGETHER_API_KEY (create a key in Together’s dashboard; same account works with api.together.xyz).",
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

    const threadRaw = Array.isArray(body?.messages) ? body!.messages! : [];
    const messages: TogetherChatMessage[] = [
      {
        role: "system",
        content: `${togetherChatServerSystemPrefix()}\n${systemRaw}`.slice(0, 120_000),
      },
      ...threadRaw.slice(-40).map((m) => {
        const role = m.role === "assistant" ? "assistant" : "user";
        return {
          role,
          content: String(m.content ?? "").slice(0, 24_000),
        } as TogetherChatMessage;
      }),
    ];

    const model = defaultTogetherChatModel();
    /** Turbo: capped completion + moderate temp/top_p → faster responses without gutting heat. */
    const { content, raw } = await togetherChatCompletion({
      apiKey,
      model,
      messages,
      max_tokens: 1024,
      temperature: 0.8,
      top_p: 0.9,
    });

    return json({ response: content, model, usage: (raw as { usage?: unknown })?.usage ?? null });
  } catch (err) {
    console.error("together-chat:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg.length > 400 ? `${msg.slice(0, 397)}…` : msg }, 500);
  }
});
