import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireAdminUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type StatsResult = {
  totalStock: number;
  totalCustom: number;
  totalCompanions: number;
  mostSavedWeek: { companion_id: string; count: number; name: string }[];
  trendingTags: { tag: string; count: number }[];
  pinCountsTop: Record<string, number>;
};

async function loadStats(): Promise<StatsResult> {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !key) {
    throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing");
  }
  const svc = createClient(url, key);

  const [stockC, customC, pinsRes] = await Promise.all([
    svc.from("companions").select("id", { count: "exact", head: true }),
    svc.from("custom_characters").select("id", { count: "exact", head: true }),
    svc.from("user_discover_pins").select("companion_id, created_at"),
  ]);

  const pins = pinsRes.data ?? [];
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - weekMs;
  const weekPins = pins.filter((p) => new Date(p.created_at).getTime() >= cutoff);
  const byWeek = new Map<string, number>();
  for (const p of weekPins) {
    byWeek.set(p.companion_id, (byWeek.get(p.companion_id) || 0) + 1);
  }
  const topWeek = [...byWeek.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16);

  const allById = new Map<string, number>();
  for (const p of pins) {
    allById.set(p.companion_id, (allById.get(p.companion_id) || 0) + 1);
  }

  const ids = [...new Set(topWeek.map(([id]) => id))];
  const nameById = new Map<string, string>();
  const stockIds = ids.filter((id) => !id.startsWith("cc-"));
  const ccIds = ids.filter((id) => id.startsWith("cc-")).map((id) => id.slice(3));
  if (stockIds.length) {
    const { data } = await svc.from("companions").select("id,name").in("id", stockIds);
    for (const r of data || []) nameById.set(r.id, r.name);
  }
  if (ccIds.length) {
    const { data } = await svc.from("custom_characters").select("id,name").in("id", ccIds);
    for (const r of data || []) nameById.set(`cc-${r.id}`, r.name);
  }

  const mostSavedWeek = topWeek.map(([companion_id, count]) => ({
    companion_id,
    count,
    name: nameById.get(companion_id) || companion_id,
  }));

  const tagCount = new Map<string, number>();
  const { data: stockRows } = await svc.from("companions").select("tags, kinks").eq("is_active", true).limit(500);
  const { data: customRows } = await svc.from("custom_characters").select("tags, kinks").limit(600);
  for (const row of [...(stockRows || []), ...(customRows || [])]) {
    const tags = Array.isArray(row.tags) ? row.tags as string[] : [];
    const kinks = Array.isArray(row.kinks) ? row.kinks as string[] : [];
    for (const t of [...tags, ...kinks]) {
      const s = String(t).trim();
      if (!s || s.length > 48) continue;
      tagCount.set(s, (tagCount.get(s) || 0) + 1);
    }
  }
  const trendingTags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 28).map(([tag, count]) => ({
    tag,
    count,
  }));

  const pinCountsTop: Record<string, number> = {};
  for (const [id, c] of [...allById.entries()].sort((a, b) => b[1] - a[1]).slice(0, 400)) {
    pinCountsTop[id] = c;
  }

  return {
    totalStock: stockC.count ?? 0,
    totalCustom: customC.count ?? 0,
    totalCompanions: (stockC.count ?? 0) + (customC.count ?? 0),
    mostSavedWeek,
    trendingTags,
    pinCountsTop,
  };
}

function parseJsonFromModel(raw: string): { variations: { text: string; hashtags: string[] }[] } {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  }
  const parsed = JSON.parse(s) as { variations?: unknown };
  const vars = Array.isArray(parsed.variations) ? parsed.variations : [];
  const out: { text: string; hashtags: string[] }[] = [];
  for (const v of vars.slice(0, 8)) {
    if (!v || typeof v !== "object") continue;
    const o = v as Record<string, unknown>;
    const text = typeof o.text === "string" ? o.text.trim() : "";
    const tags = Array.isArray(o.hashtags) ? (o.hashtags as unknown[]).map((x) => String(x).replace(/^#/, "").trim()).filter(Boolean) : [];
    if (text) out.push({ text, hashtags: tags.slice(0, 8) });
  }
  return { variations: out };
}

const QUICK_GUIDE: Record<string, string> = {
  promote_new: "Announce a brand-new companion joining the roster — curiosity, FOMO, link vibe.",
  highlight_popular: "Spotlight a fan-favorite / highly saved persona — social proof, desire, tasteful heat.",
  hype_nexus: "Promote The Nexus merge lab — two parents, one hybrid, experimental energy.",
  sexual_tease: "Flirty tease that stays platform-safe: implication, tension, no graphic explicit acts.",
  community: "Invite replies, polls, or 'who would you pick' engagement — inclusive horny-adjacent tone.",
  rarity_drop: "Tease rarity tiers / Abyssal or epic drops — collector / TCG energy.",
};

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

function normalizeChatMessages(raw: unknown): ChatMsg[] {
  if (!Array.isArray(raw)) return [];
  const out: ChatMsg[] = [];
  for (const m of raw.slice(-24)) {
    if (!m || typeof m !== "object") continue;
    const o = m as Record<string, unknown>;
    const role = o.role === "assistant" ? "assistant" : o.role === "system" ? "system" : "user";
    const content = typeof o.content === "string" ? o.content.trim() : "";
    if (!content) continue;
    out.push({ role, content: content.slice(0, 8000) });
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const adminGate = await requireAdminUser(req);
  if ("response" in adminGate) return adminGate.response;

  try {
    const body = await req.json().catch(() => ({}));
    const mode = typeof body.mode === "string" ? body.mode : "";

    if (mode === "stats") {
      const stats = await loadStats();
      return new Response(JSON.stringify(stats), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            "xAI API key not configured. Set XAI_API_KEY or GROK_API_KEY on the Edge Function.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (mode === "chat") {
      const history = normalizeChatMessages(body.messages);
      if (history.length === 0) {
        return new Response(JSON.stringify({ error: "messages[] required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const contextBlock = typeof body.contextBlock === "string" ? body.contextBlock.slice(0, 14_000) : "";
      const system =
        `You are Grok, embedded in the LustForge AI **X Marketing Hub** for an adult (18+) AI companion product.\n` +
        `Help the operator refine tweets, threads, CTAs, hooks, tone shifts, and platform-safe innuendo.\n` +
        `Reply in **plain text** (no JSON) unless they explicitly ask for JSON.\n` +
        `Be concise but sharp. Never sexualize minors or non-consent. No slurs.\n` +
        (contextBlock ? `\n---\nContext dump (operator):\n${contextBlock}\n---\n` : "");

      const grokMessages: { role: string; content: string }[] = [
        { role: "system", content: system },
        ...history.map((m) => ({ role: m.role, content: m.content })),
      ];

      const response = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3",
          messages: grokMessages,
          temperature: 0.85,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("admin-x-marketing chat:", errText);
        return new Response(JSON.stringify({ error: "AI chat service error" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content;
      if (!reply || typeof reply !== "string") {
        return new Response(JSON.stringify({ error: "Empty AI reply" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ reply: reply.trim() }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode !== "generate") {
      return new Response(JSON.stringify({ error: "Invalid mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tone = typeof body.tone === "string" ? body.tone : "Professional";
    const tweetStyle = typeof body.tweetStyle === "string" ? body.tweetStyle.trim().slice(0, 160) : "";
    const customPrompt = typeof body.customPrompt === "string" ? body.customPrompt.trim() : "";
    const quickKind = typeof body.quickKind === "string" ? body.quickKind : "";
    const portraitTierRaw = typeof body.portraitTier === "string" ? body.portraitTier.trim().toLowerCase().slice(0, 16) : "selfie";
    const portraitTier = portraitTierRaw === "lewd" || portraitTierRaw === "nude" ? portraitTierRaw : "selfie";
    const companion = body.companion && typeof body.companion === "object" ? body.companion as Record<string, unknown> : null;
    const productAtlas = typeof body.productAtlas === "string" ? body.productAtlas.slice(0, 8000) : "";
    const siteSurface = body.siteSurface && typeof body.siteSurface === "object" ? body.siteSurface as Record<string, unknown> : null;

    const tags = companion && Array.isArray(companion.tags) ? (companion.tags as string[]).join(", ") : "";
    const kinks = companion && Array.isArray(companion.kinks) ? (companion.kinks as string[]).join(", ") : "";
    const name = companion && typeof companion.name === "string" ? companion.name : "LustForge";
    const tagline = companion && typeof companion.tagline === "string" ? companion.tagline : "";
    const rarity = companion && typeof companion.rarity === "string" ? companion.rarity : "common";
    const role = companion && typeof companion.role === "string" ? companion.role : "";
    const gender = companion && typeof companion.gender === "string" ? companion.gender : "";
    const personality =
      companion && typeof companion.personality === "string" ? (companion.personality as string).trim().slice(0, 600) : "";
    const bio = companion && typeof companion.bio === "string" ? (companion.bio as string).trim().slice(0, 700) : "";
    const appearance =
      companion && typeof companion.appearance === "string" ? (companion.appearance as string).trim().slice(0, 900) : "";

    const quickLine = quickKind && QUICK_GUIDE[quickKind] ? `\nCampaign angle: ${QUICK_GUIDE[quickKind]}` : "";
    const styleLine = tweetStyle ? `\nPost shape / format preference: ${tweetStyle}\n` : "";

    const portraitHeatLine =
      portraitTier === "nude"
        ? `\nHero visual tier: NUDE / explicit-aligned. Match tweet heat to spicy implication and CTA; do not describe genitals or explicit sex acts in tweet text. Platform-safe wording only.\n`
        : portraitTier === "lewd"
          ? `\nHero visual tier: LEWD / suggestive (lingerie, tease). Copy can be hotter than SFW; still avoid graphic explicit anatomy in the tweet body.\n`
          : `\nHero visual tier: SELFIE / SFW catalog portrait. Keep language flirty but broadly platform-safe.\n`;

    let surfaceBlock = "";
    if (siteSurface) {
      const sid = typeof siteSurface.id === "string" ? siteSurface.id : "feature";
      const slabel = typeof siteSurface.label === "string" ? siteSurface.label : sid;
      const spitch = typeof siteSurface.pitch === "string" ? siteSurface.pitch : "";
      surfaceBlock =
        `\n**Primary site surface to weave into copy:** ${slabel} (id: ${sid})\n${spitch}\n` +
        `Mention this module naturally when it fits — do not invent features that contradict the atlas below.\n`;
    }

    const system =
      `You are the lead social strategist for LustForge AI, an adults-only AI companion product. ` +
      `Return ONLY valid JSON (no markdown fences) with this exact shape:\n` +
      `{"variations":[` +
      `{"text":"tweet body without hashtags, max 240 chars each","hashtags":["TagOne","TagTwo"]}` +
      `]}\n` +
      `Rules: exactly 5 objects in "variations". Each "text" must be ≤ 240 characters, punchy, on-brand. ` +
      `3–6 hashtags per variation in the array (no # prefix in JSON values). ` +
      `No minors, no non-consensual themes. Tone for all copy: ${tone}. ` +
      `Hashtags can include LustForge, AI, 18Plus, NSFW as appropriate.`;

    const userBlock =
      `Product: LustForge AI — premium AI companions with chat, forge, Nexus hybrid merges, Lovense haptics, Discover gallery, and TCG-style stat flavor.\n` +
      (productAtlas ? `\nProduct module atlas (stay fact-consistent):\n${productAtlas}\n` : "") +
      surfaceBlock +
      (companion
        ? `Companion focus:\n- Name: ${name}\n- Tagline: ${tagline}\n- Rarity: ${rarity}\n- Role: ${role}\n- Gender: ${gender}\n- Tags: ${tags}\n- Interests/kinks labels: ${kinks}\n` +
          (personality ? `- Personality / voice: ${personality}\n` : "") +
          (bio ? `- Bio / hook lines: ${bio}\n` : "") +
          (appearance ? `- Look & aesthetic (for language and vibe, not explicit): ${appearance}\n` : "")
        : `No specific companion selected — write brand-level X posts that still feel premium and seductive.\n`) +
      styleLine +
      portraitHeatLine +
      (customPrompt ? `Operator instructions: ${customPrompt}\n` : "") +
      quickLine +
      `\nWrite 5 distinct angles (hook, CTA, question, lore tease, urgency) so the operator can pick one.`;

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
          { role: "user", content: userBlock },
        ],
        temperature: 0.88,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      return new Response(JSON.stringify({ error: "Empty AI response" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let variations: { text: string; hashtags: string[] }[];
    try {
      variations = parseJsonFromModel(content).variations;
    } catch {
      return new Response(JSON.stringify({ error: "Could not parse AI JSON. Try again." }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (variations.length < 5) {
      return new Response(JSON.stringify({ error: `Expected 5 variations, got ${variations.length}` }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ variations: variations.slice(0, 5) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
