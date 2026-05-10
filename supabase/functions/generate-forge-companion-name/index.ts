import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import {
  defaultGrokEdgeChatModel,
  extractGrokAssistantText,
  grokChatCompletionRaw,
} from "../_shared/xaiGrokChatRaw.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeNameKey(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sanitizeGender(g: unknown): string {
  if (typeof g !== "string") return "non-binary";
  const t = g.replace(/\s+/g, " ").trim().slice(0, 48);
  return t || "non-binary";
}

function parseSingleNameFromAssistant(raw: string): string {
  let t = raw.trim();
  t = t.replace(/^["'\u201c\u201d`]+|["'\u201c\u201d`]+$/g, "").trim();
  const firstLine = t.split(/\r?\n/).map((x) => x.trim()).find(Boolean) ?? "";
  const noLabel = firstLine.replace(/^(name|companion)\s*:\s*/i, "").trim();
  return noLabel.slice(0, 120);
}

function buildExactUserPrompt(gender: string): string {
  return `Generate a seductive, dark, high-quality name for a ${gender} AI companion. Style: cyber-goth, gothic fantasy, or sensual. Return only the name. Can be a single powerful word, a first + last name, or a themed dark name. Make it unique and memorable.`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sessionGate = await requireSessionUser(req);
  if ("response" in sessionGate) return sessionGate.response;

  try {
    const body = (await req.json()) as { gender?: unknown; avoid_names?: unknown };
    const gender = sanitizeGender(body.gender);
    const avoidRaw = Array.isArray(body.avoid_names) ? body.avoid_names : [];
    const avoidList = avoidRaw
      .map((x) => (typeof x === "string" ? x.trim().slice(0, 120) : ""))
      .filter(Boolean)
      .slice(0, 400);
    const avoidJson = JSON.stringify(avoidList);

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n));
    if (!xaiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Grok not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const system =
      `You name premium adult AI companions for LustForge (dark romance / cyber-gothic catalog).
The user's next message is the **complete** naming brief — follow it literally.
Rules: respond with **only** the companion's display name — no quotation marks, no role labels, no explanation, no trailing punctuation as a sentence. Maximum 120 characters.
${
        avoidList.length
          ? `Do not output any name that equals (case-insensitive, collapse spaces) an entry in this JSON array. Invent a clearly different label:\n${avoidJson}`
          : ""
      }`;

    const user = buildExactUserPrompt(gender);
    const model = defaultGrokEdgeChatModel((n) => Deno.env.get(n) ?? undefined);

    const r = await grokChatCompletionRaw(
      {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.9,
        max_tokens: 96,
      },
      xaiKey,
    );

    if (!r.ok) {
      return new Response(
        JSON.stringify({
          error: "Grok request failed",
          details: typeof r.rawText === "string" ? r.rawText.slice(0, 500) : "",
        }),
        { status: r.status || 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const text = extractGrokAssistantText(r.json);
    const name = parseSingleNameFromAssistant(text);
    if (!name || name.length < 2) {
      return new Response(JSON.stringify({ error: "Grok returned an empty name" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nk = normalizeNameKey(name);
    if (avoidList.some((a) => normalizeNameKey(a) === nk)) {
      return new Response(JSON.stringify({ error: "Grok returned a forbidden duplicate name" }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ name }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg || "generate-forge-companion-name failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
