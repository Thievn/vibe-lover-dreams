import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEXUS_BASE = 250;
const NEXUS_INFUSE = 50;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function stripCc(id: string): string | null {
  const t = id.trim();
  if (!t.startsWith("cc-")) return null;
  const u = t.slice(3);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(u) ? u : null;
}

async function refundTokens(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    await supabase.from("profiles").update({ tokens_balance: bal + amount }).eq("user_id", userId);
  } catch (e) {
    console.error("nexus-merge refundTokens failed", e);
  }
}

function truncate(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function clampStat(n: unknown, fallback: number): number {
  if (typeof n !== "number" || !Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function normalizeMergeStats(raw: unknown): {
  compatibility: number;
  resonance: number;
  pulse: number;
  affinity: number;
} {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    compatibility: clampStat(o.compatibility, 78),
    resonance: clampStat(o.resonance, 72),
    pulse: clampStat(o.pulse, 81),
    affinity: clampStat(o.affinity, 69),
  };
}

function parentAllowedForMerge(
  row: Record<string, unknown>,
  operatorUserId: string,
  adminMerge: boolean,
): boolean {
  if (row.user_id === operatorUserId) return true;
  if (adminMerge && row.is_public === true && row.approved === true) return true;
  return false;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let body: {
    parentAId?: string;
    parentBId?: string;
    infuse?: boolean;
    favorParent?: "first" | "second" | null;
    adminMerge?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminMerge = Boolean(body.adminMerge);
  const authGate = adminMerge ? await requireAdminUser(req) : await requireSessionUser(req);
  if ("response" in authGate) return authGate.response;

  const userId = authGate.user.id;
  let charged = 0;

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const idA = typeof body.parentAId === "string" ? stripCc(body.parentAId) : null;
    const idB = typeof body.parentBId === "string" ? stripCc(body.parentBId) : null;
    if (!idA || !idB || idA === idB) {
      return new Response(JSON.stringify({ error: "Select two distinct companions to merge." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const infuse = Boolean(body.infuse);
    const favor = body.favorParent === "first" || body.favorParent === "second" ? body.favorParent : null;
    const totalCost = adminMerge ? 0 : NEXUS_BASE + (infuse ? NEXUS_INFUSE : 0);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: rows, error: fetchErr } = await supabase
      .from("custom_characters")
      .select("*")
      .in("id", [idA, idB]);

    if (fetchErr || !rows || rows.length !== 2) {
      return new Response(JSON.stringify({ error: "Could not load both parents." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pa = rows.find((r) => r.id === idA);
    const pb = rows.find((r) => r.id === idB);
    if (!pa || !pb) {
      return new Response(JSON.stringify({ error: "Could not load both parents." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      !parentAllowedForMerge(pa as Record<string, unknown>, userId, adminMerge) ||
      !parentAllowedForMerge(pb as Record<string, unknown>, userId, adminMerge)
    ) {
      return new Response(
        JSON.stringify({
          error: adminMerge
            ? "Admin Nexus: each parent must be your own forge OR an approved public gallery card (never another user’s private vault)."
            : "You can only merge companions you forged.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!adminMerge) {
      const now = Date.now();
      for (const p of [pa, pb]) {
        const until = p.nexus_cooldown_until ? new Date(p.nexus_cooldown_until as string).getTime() : 0;
        if (until > now) {
          return new Response(
            JSON.stringify({
              error: "One companion is still recovering from a recent Nexus merge. Try again after cooldown.",
              code: "NEXUS_COOLDOWN",
              cooldownUntil: p.nexus_cooldown_until,
            }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      }

      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (profErr || prof == null) {
        return new Response(JSON.stringify({ error: "Could not read forge credits balance." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (prof.tokens_balance < totalCost) {
        return new Response(
          JSON.stringify({
            error: `Not enough forge credits (${totalCost} required for this merge).`,
            code: "INSUFFICIENT_TOKENS",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { error: deductErr } = await supabase
        .from("profiles")
        .update({ tokens_balance: prof.tokens_balance - totalCost })
        .eq("user_id", userId);
      if (deductErr) {
        return new Response(JSON.stringify({ error: deductErr.message || "Could not reserve credits." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      charged = totalCost;
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      if (charged > 0) await refundTokens(supabase, userId, charged);
      charged = 0;
      return new Response(
        JSON.stringify({
          error:
            "xAI API key not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parentA = {
      name: pa.name,
      tagline: pa.tagline,
      gender: pa.gender,
      orientation: pa.orientation,
      role: pa.role,
      tags: pa.tags,
      kinks: pa.kinks,
      appearance: truncate(String(pa.appearance || ""), 1200),
      personality: truncate(String(pa.personality || ""), 900),
      bio: truncate(String(pa.bio || ""), 800),
      backstory: truncate(String(pa.backstory || ""), 2000),
      gradient_from: pa.gradient_from,
      gradient_to: pa.gradient_to,
      rarity: pa.rarity,
    };
    const parentB = {
      name: pb.name,
      tagline: pb.tagline,
      gender: pb.gender,
      orientation: pb.orientation,
      role: pb.role,
      tags: pb.tags,
      kinks: pb.kinks,
      appearance: truncate(String(pb.appearance || ""), 1200),
      personality: truncate(String(pb.personality || ""), 900),
      bio: truncate(String(pb.bio || ""), 800),
      backstory: truncate(String(pb.backstory || ""), 2000),
      gradient_from: pb.gradient_from,
      gradient_to: pb.gradient_to,
      rarity: pb.rarity,
    };

    let infuseLine = "";
    if (infuse) {
      if (adminMerge) {
        if (favor === "first") {
          infuseLine =
            " ADMIN INFUSION (no charge): bias inheritance toward Parent A (first) for silhouette, wardrobe vibe, and dominant speech — still weave Parent B’s kinks subtly.";
        } else if (favor === "second") {
          infuseLine =
            " ADMIN INFUSION (no charge): bias inheritance toward Parent B (second) for silhouette, wardrobe vibe, and dominant speech — still weave Parent A’s kinks subtly.";
        } else {
          infuseLine =
            " ADMIN INFUSION (no charge): amplify overlapping rare tags/kinks between both parents in the output.";
        }
      } else if (favor === "first") {
        infuseLine =
          " The user paid for INFUSION: bias inheritance toward Parent A (first) for appearance silhouette, wardrobe vibe, and dominant speech patterns — still mix Parent B’s kinks subtly.";
      } else if (favor === "second") {
        infuseLine =
          " The user paid for INFUSION: bias inheritance toward Parent B (second) for appearance silhouette, wardrobe vibe, and dominant speech patterns — still mix Parent A’s kinks subtly.";
      } else {
        infuseLine =
          " The user paid for INFUSION: amplify odds that rare overlapping tags/kinks between both parents surface in the child.";
      }
    }

    const sourceContext = adminMerge
      ? "Two adult companion source profiles (JSON) are provided — they may be the operator’s private forges and/or approved public gallery originals. Never assume minors; every output is a consenting adult persona."
      : "Two user-owned forged parent profiles (JSON) will be provided.";

    const system = `You are the fusion intelligence for "The Nexus", a premium dark-romance AI companion forge.

${sourceContext} Invent ONE new wholly original hybrid adult companion that believably mixes:
- physical presence and wardrobe cues from both
- personality voice and flirtation rhythm as a synthesis (not a bland average)
- tags and kinks: merge intelligently (overlap strengthens; contrast becomes tasteful friction)
- art direction: gradients should harmonize or dramatize duality (hex pairs)
- backstory: 3+ narrative paragraphs, cinematic, sensual-but-literary; never a comma-only trait dump
- bio: 2 vivid paragraphs
- system_prompt: full chat charter including limits and aftercare instincts
- image_prompt: single dense SFW vertical portrait brief (no nudity, no legible branding/signage)
- fantasy_starters: exactly 4; each description is the verbatim first USER chat line (in-world, seductive or playful per persona)

Naming: invent a distinctive new name (2–4 words or one rare compound). Never reuse either parent’s full name.${infuseLine}

Also output merge_stats integers 0-100 (compatibility = how fused the two essences feel; resonance = emotional chord stability; pulse = erotic charge / tension; affinity = user bond potential).

Output ONLY via the nexus_merge_companion tool call.`;

    const userContent = `Parent A:\n${JSON.stringify(parentA)}\n\nParent B:\n${JSON.stringify(parentB)}\n\nFuse them.`;

    const fantasyStartersSchema = {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
        },
        required: ["title", "description"],
      },
    };

    const mergeStatsSchema = {
      type: "object",
      properties: {
        compatibility: { type: "integer" },
        resonance: { type: "integer" },
        pulse: { type: "integer" },
        affinity: { type: "integer" },
      },
      required: ["compatibility", "resonance", "pulse", "affinity"],
    };

    const toolParameters = {
      type: "object",
      properties: {
        name: { type: "string" },
        tagline: { type: "string" },
        gender: { type: "string" },
        orientation: { type: "string" },
        role: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        kinks: { type: "array", items: { type: "string" } },
        appearance: { type: "string" },
        personality: { type: "string" },
        bio: { type: "string" },
        backstory: { type: "string" },
        system_prompt: { type: "string" },
        fantasy_starters: fantasyStartersSchema,
        gradient_from: { type: "string" },
        gradient_to: { type: "string" },
        image_prompt: { type: "string" },
        rarity: {
          type: "string",
          enum: ["common", "rare", "epic", "legendary", "mythic", "abyssal"],
          description: "At least as special as the more rare parent unless fusion is deliberately softer",
        },
        merge_stats: mergeStatsSchema,
        trait_fusion_summary: {
          type: "string",
          description: "One sensual sentence summarizing the fusion for UI replay",
        },
      },
      required: [
        "name",
        "tagline",
        "gender",
        "orientation",
        "role",
        "tags",
        "kinks",
        "appearance",
        "personality",
        "bio",
        "backstory",
        "system_prompt",
        "fantasy_starters",
        "gradient_from",
        "gradient_to",
        "image_prompt",
        "rarity",
        "merge_stats",
        "trait_fusion_summary",
      ],
    };

    const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "nexus_merge_companion",
              description: "Return the fused companion profile and merge_stats",
              parameters: toolParameters,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "nexus_merge_companion" } },
        temperature: 0.85,
      }),
    });

    if (!grokRes.ok) {
      const errText = await grokRes.text();
      console.error("nexus-merge Grok error:", errText);
      if (charged > 0) await refundTokens(supabase, userId, charged);
      charged = 0;
      return new Response(JSON.stringify({ error: "AI fusion service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grokData = await grokRes.json();
    const toolCall = grokData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "nexus_merge_companion") {
      if (charged > 0) await refundTokens(supabase, userId, charged);
      charged = 0;
      return new Response(JSON.stringify({ error: "Fusion model returned no structured profile." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(toolCall.function.arguments);
    } catch {
      if (charged > 0) await refundTokens(supabase, userId, charged);
      charged = 0;
      return new Response(JSON.stringify({ error: "Could not parse fusion output." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merge_stats = normalizeMergeStats(fields.merge_stats);
    const coolUntil = new Date(Date.now() + COOLDOWN_MS).toISOString();

    const insertRow: Record<string, unknown> = {
      user_id: userId,
      name: String(fields.name || "Unnamed Hybrid").slice(0, 120),
      tagline: String(fields.tagline || "").slice(0, 200),
      gender: String(fields.gender || "—").slice(0, 80),
      orientation: String(fields.orientation || "").slice(0, 80),
      role: String(fields.role || "Switch").slice(0, 80),
      tags: Array.isArray(fields.tags) ? fields.tags.map((x) => String(x)).slice(0, 16) : [],
      kinks: Array.isArray(fields.kinks) ? fields.kinks.map((x) => String(x)).slice(0, 20) : [],
      appearance: String(fields.appearance || ""),
      personality: String(fields.personality || ""),
      bio: String(fields.bio || ""),
      backstory: String(fields.backstory || ""),
      system_prompt: String(fields.system_prompt || ""),
      fantasy_starters: fields.fantasy_starters,
      gradient_from: String(fields.gradient_from || "#7B2D8E").slice(0, 16),
      gradient_to: String(fields.gradient_to || "#FF2D7B").slice(0, 16),
      image_prompt: String(fields.image_prompt || ""),
      image_url: null,
      avatar_url: null,
      static_image_url: null,
      animated_image_url: null,
      is_public: false,
      approved: false,
      is_nexus_hybrid: true,
      lineage_parent_ids: [idA, idB],
      merge_stats,
      rarity: String(fields.rarity || "rare").toLowerCase(),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("custom_characters")
      .insert(insertRow)
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("nexus-merge insert", insErr);
      if (charged > 0) await refundTokens(supabase, userId, charged);
      charged = 0;
      return new Response(JSON.stringify({ error: insErr?.message || "Could not save merged companion." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!adminMerge) {
      const { error: coolErr } = await supabase
        .from("custom_characters")
        .update({ nexus_cooldown_until: coolUntil })
        .in("id", [idA, idB]);

      if (coolErr) {
        console.error("nexus-merge cooldown update", coolErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        childId: `cc-${inserted.id}`,
        name: insertRow.name,
        merge_stats,
        trait_fusion_summary: String(fields.trait_fusion_summary || ""),
        creditsCharged: totalCost,
        adminMerge,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("nexus-merge", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (charged > 0 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      await refundTokens(createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), userId, charged);
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
