import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import {
  LIVE_CALL_OPTIONS_TOOL_NAME,
  LIVE_CALL_OPTIONS_TOOL_SCHEMA,
  buildLiveCallOptionsUserMessage,
  liveCallOptionsSystemPrompt,
  type CompanionTraitsPayload,
} from "../_shared/liveCallOptionsPrompt.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function excerpt(s: string, max: number): string {
  const t = String(s ?? "").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function slugifyBase(s: string): string {
  return String(s ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "call";
}

type RawOption = {
  slug?: string;
  title?: string;
  subtitle?: string;
  moodTag?: string;
  instructionAugment?: string;
};

function normalizeOptions(raw: RawOption[]): {
  slug: string;
  title: string;
  subtitle: string;
  moodTag: string;
  instructionAugment: string;
}[] {
  const out: ReturnType<typeof normalizeOptions> = [];
  const usedSlugs = new Set<string>();
  const usedTitles = new Set<string>();

  for (const r of raw) {
    const title = String(r.title ?? "").trim();
    const subtitle = String(r.subtitle ?? "").trim();
    const moodTag = String(r.moodTag ?? "").trim();
    const instructionAugment = String(r.instructionAugment ?? "").trim();
    if (!title || !subtitle || !moodTag || !instructionAugment) continue;

    let baseSlug = slugifyBase(String(r.slug ?? "").trim() || title);
    let slug = baseSlug;
    let n = 2;
    while (usedSlugs.has(slug)) {
      slug = `${baseSlug}-${n++}`;
    }
    usedSlugs.add(slug);

    let uniqueTitle = title;
    let ti = 2;
    while (usedTitles.has(uniqueTitle.toLowerCase())) {
      uniqueTitle = `${title} (${ti++})`;
    }
    usedTitles.add(uniqueTitle.toLowerCase());

    out.push({
      slug,
      title: uniqueTitle,
      subtitle: subtitle.slice(0, 200),
      moodTag: moodTag.slice(0, 80),
      instructionAugment: instructionAugment.slice(0, 4000),
    });
    if (out.length >= 8) break;
  }
  return out;
}

function traitsFromRow(row: Record<string, unknown>, companionId: string): CompanionTraitsPayload {
  const tags = Array.isArray(row.tags) ? (row.tags as string[]) : [];
  const kinks = Array.isArray(row.kinks) ? (row.kinks as string[]) : [];
  return {
    companionId,
    name: String(row.name ?? "").trim() || "Companion",
    tagline: String(row.tagline ?? "").trim(),
    role: String(row.role ?? "").trim(),
    personality: String(row.personality ?? "").trim(),
    tags,
    kinks,
    bioExcerpt: excerpt(String(row.bio ?? ""), 900),
    backstoryExcerpt: excerpt(String(row.backstory ?? ""), 900),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sessionGate = await requireSessionUser(req);
  if ("response" in sessionGate) return sessionGate.response;
  const user = sessionGate.user;

  try {
    const body = (await req.json().catch(() => null)) as { companionId?: string } | null;
    const companionId = typeof body?.companionId === "string" ? body.companionId.trim() : "";
    if (!companionId) {
      return new Response(JSON.stringify({ error: "companionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const svc = createClient(supabaseUrl, serviceKey);
    let row: Record<string, unknown>;

    if (companionId.startsWith("cc-")) {
      const rowPk = companionId.slice(3);
      const { data, error } = await svc.from("custom_characters").select("*").eq("id", rowPk).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return new Response(JSON.stringify({ error: "Companion not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      row = data as Record<string, unknown>;
      const owner = String(row.user_id ?? "").trim();
      if (owner && owner !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data, error } = await svc.from("companions").select("*").eq("id", companionId).maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        return new Response(JSON.stringify({ error: "Companion not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      row = data as Record<string, unknown>;
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "xAI API key not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const traits = traitsFromRow(row, companionId);
    const nonce = crypto.randomUUID();
    const userMessage = buildLiveCallOptionsUserMessage(traits, nonce);

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: liveCallOptionsSystemPrompt() },
          { role: "user", content: userMessage },
        ],
        tools: [LIVE_CALL_OPTIONS_TOOL_SCHEMA],
        tool_choice: { type: "function", function: { name: LIVE_CALL_OPTIONS_TOOL_NAME } },
        temperature: 0.88,
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error("Grok live-call-options error:", errText);
      return new Response(JSON.stringify({ error: "AI service error", details: errText.slice(0, 400) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await grokRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== LIVE_CALL_OPTIONS_TOOL_NAME) {
      return new Response(JSON.stringify({ error: "Malformed AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: { options?: RawOption[] };
    try {
      parsed = JSON.parse(toolCall.function.arguments) as { options?: RawOption[] };
    } catch {
      return new Response(JSON.stringify({ error: "Invalid tool JSON" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawList = Array.isArray(parsed.options) ? parsed.options : [];
    const options = normalizeOptions(rawList);
    if (options.length < 4) {
      return new Response(JSON.stringify({ error: "Too few valid options from model" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ options }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("generate-live-call-options:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
