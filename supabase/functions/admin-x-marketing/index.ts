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

const REQUIRED_BASE_HASHTAGS = ["GrokAI", "Lovense"] as const;

function cleanHashtag(tag: string): string {
  return tag.replace(/^#/, "").replace(/[^a-zA-Z0-9_]/g, "").trim();
}

function titleToTag(raw: string): string {
  return cleanHashtag(
    raw
      .split(/[\s/_-]+/)
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(""),
  );
}

function uniquePush(list: string[], val: string) {
  const t = cleanHashtag(val);
  if (!t) return;
  if (list.some((x) => x.toLowerCase() === t.toLowerCase())) return;
  list.push(t);
}

function rotatePick(pool: string[], count: number, offset: number): string[] {
  if (pool.length === 0 || count <= 0) return [];
  const out: string[] = [];
  for (let i = 0; i < pool.length && out.length < count; i++) {
    const p = pool[(offset + i) % pool.length]!;
    uniquePush(out, p);
  }
  return out;
}

function buildRelatedHashtagPool(args: {
  tone: string;
  quickKind: string;
  portraitTier: "selfie" | "lewd" | "nude";
  companion: Record<string, unknown> | null;
}): string[] {
  const out: string[] = [];
  const companion = args.companion;
  const add = (raw: string) => uniquePush(out, raw);

  // Strong platform/product anchors.
  add("LustForge");
  add("AICompanion");
  add("AIGirlfriend");
  add("18Plus");

  if (args.portraitTier === "lewd") add("LewdAI");
  if (args.portraitTier === "nude") add("NSFWAI");
  if (args.portraitTier === "selfie") add("AISelfie");

  const tone = args.tone.toLowerCase();
  if (tone.includes("mysterious")) add("DarkFantasy");
  if (tone.includes("elegant")) add("LuxuryAesthetic");
  if (tone.includes("aggressive")) add("FOMO");
  if (tone.includes("teasing") || tone.includes("horny")) add("SpicyAI");

  const quick = args.quickKind.toLowerCase();
  if (quick === "hype_nexus") add("NexusForge");
  if (quick === "rarity_drop") add("AIDrop");
  if (quick === "promote_new") add("NewDrop");
  if (quick === "community") add("AICommunity");

  if (companion) {
    const rarity = typeof companion.rarity === "string" ? companion.rarity : "";
    if (rarity) add(`${titleToTag(rarity)}Tier`);
    const role = typeof companion.role === "string" ? companion.role : "";
    if (role) add(titleToTag(role));
    const tags = Array.isArray(companion.tags) ? (companion.tags as unknown[]).map((x) => String(x)) : [];
    for (const t of tags.slice(0, 8)) add(titleToTag(t));
    const kinks = Array.isArray(companion.kinks) ? (companion.kinks as unknown[]).map((x) => String(x)) : [];
    for (const k of kinks.slice(0, 6)) add(titleToTag(k));
  }

  return out.filter(Boolean);
}

function enforceMarketingHashtags(args: {
  variations: { text: string; hashtags: string[] }[];
  tone: string;
  quickKind: string;
  portraitTier: "selfie" | "lewd" | "nude";
  companion: Record<string, unknown> | null;
}): { text: string; hashtags: string[] }[] {
  const pool = buildRelatedHashtagPool({
    tone: args.tone,
    quickKind: args.quickKind,
    portraitTier: args.portraitTier,
    companion: args.companion,
  });
  return args.variations.map((v, idx) => {
    const mergedRelated = rotatePick(pool, 3, idx * 2);
    const finalTags: string[] = [];
    for (const t of REQUIRED_BASE_HASHTAGS) uniquePush(finalTags, t);
    for (const t of mergedRelated) uniquePush(finalTags, t);
    // Backfill from model-proposed tags if pool is unexpectedly too small.
    if (finalTags.length < 5) {
      for (const t of v.hashtags) {
        uniquePush(finalTags, t);
        if (finalTags.length >= 5) break;
      }
    }
    return { text: v.text, hashtags: finalTags.slice(0, 5) };
  });
}

function inferCompanionStyleRules(companion: Record<string, unknown> | null): string {
  if (!companion) {
    return "No single companion selected: stay brand-forward, modern, and avoid forcing gothic language unless requested.";
  }
  const tags = Array.isArray(companion.tags) ? (companion.tags as unknown[]).map((x) => String(x).toLowerCase()) : [];
  const kinks = Array.isArray(companion.kinks) ? (companion.kinks as unknown[]).map((x) => String(x).toLowerCase()) : [];
  const appearance = String(companion.appearance ?? "").toLowerCase();
  const personality = String(companion.personality ?? "").toLowerCase();
  const timePeriod = String(companion.timePeriod ?? "").toLowerCase();
  const mergedCorpus = `${tags.join(" ")} ${kinks.join(" ")} ${appearance} ${personality} ${timePeriod}`;
  const gothicSignals = /(goth|gothic|vamp|cathedral|victorian|dark fantasy|occult|shadow queen|blood|abyss)/i.test(
    mergedCorpus,
  );
  const cyberSignals = /(cyber|neon|android|futur|tech|holo)/i.test(mergedCorpus);
  const softSignals = /(cute|sweet|soft|innocent|girl next door|romantic|gentle)/i.test(mergedCorpus);
  const luxurySignals = /(luxury|elegant|high fashion|editorial|classy)/i.test(mergedCorpus);

  const style: string[] = [];
  if (gothicSignals) {
    style.push("Gothic/dark-romance tone is allowed because companion data supports it.");
  } else {
    style.push("Do NOT force gothic/dark-vampire wording unless companion data explicitly supports it.");
  }
  if (cyberSignals) style.push("Lean into futuristic/neon language.");
  if (softSignals) style.push("Use warmer playful-romantic wording over harsh dark language.");
  if (luxurySignals) style.push("Use polished luxury/editorial wording.");
  style.push("Copy must mirror this companion's actual profile settings and vibe first, brand second.");
  return style.join(" ");
}

function companionGothicSignalsAllowed(companion: Record<string, unknown> | null): boolean {
  if (!companion) return false;
  const tags = Array.isArray(companion.tags) ? (companion.tags as unknown[]).map((x) => String(x).toLowerCase()) : [];
  const kinks = Array.isArray(companion.kinks) ? (companion.kinks as unknown[]).map((x) => String(x).toLowerCase()) : [];
  const appearance = String(companion.appearance ?? "").toLowerCase();
  const personality = String(companion.personality ?? "").toLowerCase();
  const timePeriod = String(companion.timePeriod ?? "").toLowerCase();
  const mergedCorpus = `${tags.join(" ")} ${kinks.join(" ")} ${appearance} ${personality} ${timePeriod}`;
  return /(goth|gothic|vamp|cathedral|victorian|dark fantasy|occult|shadow queen|blood|abyss)/i.test(mergedCorpus);
}

function buildStyleSourcePayload(args: {
  companion: Record<string, unknown> | null;
  tone: string;
  tweetStyle: string;
  quickKind: string;
  portraitTier: string;
  siteSurface: Record<string, unknown> | null;
}): Record<string, unknown> {
  const c = args.companion;
  const chips: { label: string; value: string }[] = [];
  const push = (label: string, value: string) => {
    const v = value.trim();
    if (!v) return;
    chips.push({ label, value: v.length > 80 ? `${v.slice(0, 77)}…` : v });
  };

  if (c) {
    push("Companion", String(c.name ?? ""));
    push("Tagline", String(c.tagline ?? ""));
    push("Rarity", String(c.rarity ?? ""));
    push("Role", String(c.role ?? ""));
    push("Time period", String(c.timePeriod ?? ""));
    push("Personality type", String(c.personalityType ?? ""));
    push("Speech style", String(c.speechStyle ?? ""));
    push("Relationship vibe", String(c.relationshipVibe ?? ""));
    push("Sexual energy", String(c.sexualEnergy ?? ""));
    if (Boolean(c.isNexusHybrid)) {
      const lineage = Array.isArray(c.lineageParentIds)
        ? (c.lineageParentIds as unknown[]).map((x) => String(x)).filter(Boolean).slice(0, 3).join(", ")
        : "";
      push("Nexus", lineage ? `Hybrid · parents: ${lineage}` : "Hybrid merge");
    }
    const tagList = Array.isArray(c.tags) ? (c.tags as string[]).slice(0, 6).join(", ") : "";
    const kinkList = Array.isArray(c.kinks) ? (c.kinks as string[]).slice(0, 4).join(", ") : "";
    if (tagList) push("Tags (sample)", tagList);
    if (kinkList) push("Interests (sample)", kinkList);
  }

  push("Portrait tier", args.portraitTier);
  push("Marketing tone", args.tone);
  push("Post shape", args.tweetStyle);
  if (args.quickKind.trim()) push("Quick campaign", args.quickKind);
  if (args.siteSurface && typeof args.siteSurface.label === "string") {
    push("Site surface", String(args.siteSurface.label));
  }

  const gothicOk = companionGothicSignalsAllowed(c);
  return {
    generatedAt: new Date().toISOString(),
    companionId: c && typeof c.id === "string" ? c.id : null,
    companionName: c && typeof c.name === "string" ? c.name : null,
    styleLock: gothicOk ? "gothic_ok" : "gothic_avoid",
    styleLockHint: gothicOk
      ? "Profile signals allow gothic / dark-romance wording."
      : "Style lock: avoid default gothic — mirror this profile’s actual vibe.",
    chips,
    summaryLine: c
      ? `${String(c.name ?? "Companion")} · ${args.portraitTier} hero · ${args.tone}${args.quickKind ? ` · ${args.quickKind}` : ""}`
      : `Brand post · ${args.portraitTier} hero · ${args.tone}`,
  };
}

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
    const timePeriod = companion && typeof companion.timePeriod === "string" ? companion.timePeriod : "";
    const speechStyle = companion && typeof companion.speechStyle === "string" ? companion.speechStyle : "";
    const relationshipVibe = companion && typeof companion.relationshipVibe === "string" ? companion.relationshipVibe : "";
    const sexualEnergy = companion && typeof companion.sexualEnergy === "string" ? companion.sexualEnergy : "";
    const personalityType = companion && typeof companion.personalityType === "string" ? companion.personalityType : "";
    const isNexusHybrid = companion ? Boolean(companion.isNexusHybrid) : false;
    const lineageParentIds = companion && Array.isArray(companion.lineageParentIds)
      ? (companion.lineageParentIds as unknown[]).map((x) => String(x)).slice(0, 4)
      : [];
    const styleRules = inferCompanionStyleRules(companion);

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
      `Exactly 5 hashtags per variation in the array (no # prefix in JSON values). Always include GrokAI and Lovense, plus 3 context-relevant hashtags. ` +
      `No minors, no non-consensual themes. Tone for all copy: ${tone}. ` +
      `Hashtags can include LustForge, AI, 18Plus, NSFW as appropriate.\n` +
      `Critical style lock: never default every companion to gothic/noir language. Match each selected companion profile precisely.`;

    const userBlock =
      `Product: LustForge AI — premium AI companions with chat, forge, Nexus hybrid merges, Lovense haptics, Discover gallery, and TCG-style stat flavor.\n` +
      (productAtlas ? `\nProduct module atlas (stay fact-consistent):\n${productAtlas}\n` : "") +
      surfaceBlock +
      (companion
        ? `Companion focus:\n- Name: ${name}\n- Tagline: ${tagline}\n- Rarity: ${rarity}\n- Role: ${role}\n- Gender: ${gender}\n- Tags: ${tags}\n- Interests/kinks labels: ${kinks}\n` +
          (personality ? `- Personality / voice: ${personality}\n` : "") +
          (bio ? `- Bio / hook lines: ${bio}\n` : "") +
          (appearance ? `- Look & aesthetic (for language and vibe, not explicit): ${appearance}\n` : "") +
          (timePeriod ? `- Time period / world: ${timePeriod}\n` : "") +
          (speechStyle ? `- Speech style: ${speechStyle}\n` : "") +
          (relationshipVibe ? `- Relationship vibe: ${relationshipVibe}\n` : "") +
          (sexualEnergy ? `- Sexual energy: ${sexualEnergy}\n` : "") +
          (personalityType ? `- Personality type: ${personalityType}\n` : "") +
          `- Nexus hybrid: ${isNexusHybrid ? "yes" : "no"}\n` +
          (lineageParentIds.length ? `- Nexus lineage parent ids: ${lineageParentIds.join(", ")}\n` : "") +
          `- Style lock: ${styleRules}\n`
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

    const normalized = enforceMarketingHashtags({
      variations: variations.slice(0, 5),
      tone,
      quickKind,
      portraitTier,
      companion,
    });

    const styleSource = buildStyleSourcePayload({
      companion,
      tone,
      tweetStyle,
      quickKind,
      portraitTier,
      siteSurface,
    });

    return new Response(JSON.stringify({ variations: normalized, styleSource }), {
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
