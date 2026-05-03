import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { grokChatCompletionRaw } from "../_shared/xaiGrokChatRaw.ts";
import { renderPortraitToStorage } from "../_shared/renderCompanionPortrait.ts";
import { requireAdminUser, requireSessionUser } from "../_shared/requireSessionUser.ts";
import { mergeTcgForNexusChild } from "../_shared/tcgStatsGenerate.ts";
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";
import { buildNexusDisplayTraitRows } from "../_shared/nexusDisplayTraitsBuild.ts";
import { rollNexusChildRarity } from "../_shared/nexusRarityRoll.ts";
import {
  buildChildPersonalityForgeRow,
  FORGE_THEME_TAB_IDS,
  resolveForgeThemeInnerForNexusMerge,
} from "../_shared/nexusForgeThemeMerge.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NEXUS_BASE = 350;
const NEXUS_INFUSE = 50;
const COOLDOWN_MS = 24 * 60 * 60 * 1000;
type VarianceStrength = "low" | "medium" | "high";

function varianceDivergenceLine(variance: VarianceStrength): string {
  if (variance === "low") {
    return "Wardrobe + scene divergence (LOW): keep strong lineage cues and visual DNA from both parents; outfit and background should be different from both parents, but can remain in a related style family. No direct clone.";
  }
  if (variance === "high") {
    return "Wardrobe + scene divergence (HIGH): keep face/body lineage cues from both parents, but enforce a notably different outfit, styling language, and setting from BOTH parents. No outfit clone, no copied room/set, no near-reskin.";
  }
  return "Wardrobe + scene divergence (MEDIUM): keep face/body lineage cues from both parents, but give the fused companion a distinct outfit and distinct background from BOTH parents. No outfit clone, no copied room/set, no near-reskin.";
}

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
  reason: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    const nxt = bal + amount;
    await supabase.from("profiles").update({ tokens_balance: nxt }).eq("user_id", userId);
    await recordFcTransaction(supabase, {
      userId,
      creditsChange: amount,
      balanceAfter: nxt,
      transactionType: "nexus_refund",
      description: `Nexus merge refund: ${reason}`,
      metadata: { fc: amount, ...metadata },
    });
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

function normalizeNameKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function titleCaseWords(input: string): string {
  return input
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Banned clichés; Grok names hitting these still get a collision suffix, not a server name generator. */
function isBannedClicheName(name: string): boolean {
  const n = normalizeNameKey(name);
  if (!n) return true;
  const banned = new Set([
    "luna",
    "raven",
    "scarlett",
    "violet",
    "nova",
    "lilith",
    "mistress raven",
    "dark luna",
    "velvet raven",
    "shadow luna",
    "midnight rose",
  ]);
  if (banned.has(n)) return true;
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.some((p) => banned.has(p))) return true;
  return false;
}

function parentTokenSet(parentA: Record<string, unknown>, parentB: Record<string, unknown>): Set<string> {
  const raw = `${String(parentA.name ?? "")} ${String(parentB.name ?? "")}`
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ");
  const toks = raw.split(/\s+/).filter((t) => t.length >= 3);
  return new Set(toks);
}

/** Prefer Grok's tool `name`; only add a short disambiguator on DB collision — no server-side name lists. */
async function chooseUniqueNexusName(
  supabase: ReturnType<typeof createClient>,
  proposedName: string,
  parentA: Record<string, unknown>,
  parentB: Record<string, unknown>,
): Promise<string> {
  const { data } = await supabase.from("custom_characters").select("name");
  const used = new Set((data ?? []).map((r) => normalizeNameKey(String(r.name ?? ""))).filter(Boolean));
  const parentNames = new Set([
    normalizeNameKey(String(parentA.name ?? "")),
    normalizeNameKey(String(parentB.name ?? "")),
  ]);
  const parentWords = parentTokenSet(parentA, parentB);

  const isFree = (raw: string): boolean => {
    const t = titleCaseWords(raw).trim().slice(0, 120);
    if (!t) return false;
    const k = normalizeNameKey(t);
    if (!k || used.has(k) || parentNames.has(k)) return false;
    const parts = k.split(/\s+/);
    if (parts.some((p) => parentWords.has(p))) return false;
    return true;
  };

  let base = titleCaseWords(String(proposedName || "").trim()).slice(0, 120);
  if (!base || isBannedClicheName(base)) {
    base = titleCaseWords(`Unbound ${crypto.randomUUID().replace(/-/g, "").slice(0, 10)}`).slice(0, 120);
  }

  if (isFree(base)) return base;

  for (let i = 0; i < 48; i++) {
    const frag = crypto.randomUUID().replace(/-/g, "").slice(0, 4 + (i % 5));
    const candidate = titleCaseWords(`${base} ${frag}`.trim()).slice(0, 120);
    if (isFree(candidate)) return candidate;
  }
  return titleCaseWords(`${base} ${Date.now().toString(36)}`.trim()).slice(0, 120);
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
    varianceStrength?: VarianceStrength;
    adminMerge?: boolean;
    reconcile?: boolean;
    startedAtMs?: number;
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
    const varianceStrength: VarianceStrength =
      body.varianceStrength === "low" || body.varianceStrength === "high" || body.varianceStrength === "medium"
        ? body.varianceStrength
        : "medium";
    const visualDivergenceLine = varianceDivergenceLine(varianceStrength);
    const totalCost = adminMerge ? 0 : NEXUS_BASE + (infuse ? NEXUS_INFUSE : 0);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (body.reconcile === true) {
      const startedAtMs =
        typeof body.startedAtMs === "number" && Number.isFinite(body.startedAtMs) ? Math.floor(body.startedAtMs) : Date.now();
      const startedIso = new Date(Math.max(0, startedAtMs)).toISOString();
      const { data: childRows, error: childErr } = await supabase
        .from("custom_characters")
        .select("id, created_at")
        .eq("user_id", userId)
        .contains("lineage_parent_ids", [idA, idB])
        .gte("created_at", startedIso)
        .order("created_at", { ascending: false })
        .limit(1);
      if (childErr) {
        return new Response(JSON.stringify({ error: childErr.message || "Could not check merge recovery." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const existingChild = childRows?.[0];
      if (existingChild?.id) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "completed",
            childId: `cc-${existingChild.id}`,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: chargeRows, error: chargeErr } = await supabase
        .from("fc_transactions")
        .select("id, credits_change, metadata, created_at")
        .eq("user_id", userId)
        .eq("transaction_type", "nexus_merge")
        .gte("created_at", startedIso)
        .order("created_at", { ascending: false })
        .limit(20);
      if (chargeErr) {
        return new Response(JSON.stringify({ error: chargeErr.message || "Could not read merge charges." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const pairMatches = (meta: unknown): boolean => {
        if (!meta || typeof meta !== "object") return false;
        const m = meta as Record<string, unknown>;
        return (
          (m.parent_a === `cc-${idA}` && m.parent_b === `cc-${idB}`) ||
          (m.parent_a === `cc-${idB}` && m.parent_b === `cc-${idA}`)
        );
      };
      const chargeTxn = (chargeRows ?? []).find((row) => pairMatches(row.metadata) && Number(row.credits_change ?? 0) < 0);
      if (!chargeTxn) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "no_charge_found",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const { data: refundRows, error: refundErr } = await supabase
        .from("fc_transactions")
        .select("id, metadata")
        .eq("user_id", userId)
        .eq("transaction_type", "nexus_refund")
        .order("created_at", { ascending: false })
        .limit(50);
      if (refundErr) {
        return new Response(JSON.stringify({ error: refundErr.message || "Could not inspect prior refunds." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const alreadyRefunded = (refundRows ?? []).some((row) => {
        const m = row.metadata;
        return Boolean(
          m &&
            typeof m === "object" &&
            (m as Record<string, unknown>).reconcile_source_txn_id === chargeTxn.id,
        );
      });
      if (alreadyRefunded) {
        return new Response(
          JSON.stringify({
            success: true,
            status: "already_refunded",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const refundAmount = Math.abs(Math.floor(Number(chargeTxn.credits_change ?? 0)));
      if (refundAmount > 0) {
        await refundTokens(supabase, userId, refundAmount, "interrupted merge recovery", {
          reconcile_source_txn_id: chargeTxn.id,
          started_at_ms: startedAtMs,
          parent_a: `cc-${idA}`,
          parent_b: `cc-${idB}`,
        });
      }
      return new Response(
        JSON.stringify({
          success: true,
          status: "refunded",
          refunded: refundAmount,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

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
      const newBalNexus = prof.tokens_balance - totalCost;
      await recordFcTransaction(supabase, {
        userId,
        creditsChange: -totalCost,
        balanceAfter: newBalNexus,
        transactionType: "nexus_merge",
        description: body.infuse ? "The Nexus — merge + infusion" : "The Nexus — merge",
        metadata: {
          fc: totalCost,
          parent_a: body.parentAId,
          parent_b: body.parentBId,
          infuse: Boolean(body.infuse),
          variance_strength: varianceStrength,
        },
      });
    }

    const getEnv = (n: string) => Deno.env.get(n);
    if (!resolveXaiApiKey(getEnv)) {
      if (charged > 0) await refundTokens(supabase, userId, charged, "no xAI Grok key");
      charged = 0;
      return new Response(
        JSON.stringify({
          error:
            "Grok not configured for The Nexus. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const nexusMergeGrokModel =
      getEnv("GROK_NEXUS_MERGE_MODEL")?.trim() ||
      getEnv("GROK_FORGE_PARSE_MODEL")?.trim() ||
      getEnv("GROK_CHAT_MODEL")?.trim() ||
      "grok-3";

    const mergePairSeed = `${idA}:nexus_forge:${idB}`;
    const offspringUuid = crypto.randomUUID();
    const themeInnerA = resolveForgeThemeInnerForNexusMerge(pa.personality_forge, "A", mergePairSeed);
    const themeInnerB = resolveForgeThemeInnerForNexusMerge(pb.personality_forge, "B", mergePairSeed);

    const mergedPersonalityForge = buildChildPersonalityForgeRow(
      pa.personality_forge,
      pb.personality_forge,
      themeInnerA,
      themeInnerB,
      offspringUuid,
    );

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
      forge_theme_dna: themeInnerA,
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
      forge_theme_dna: themeInnerB,
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
          " The user paid for INFUSION: amplify odds that rare overlapping tags/kinks between both parents surface in the fused companion.";
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
- fantasy_starters: exactly 4; each description is the verbatim first USER chat line (in-world; seductive, explicit, or playful per fused persona). FORBIDDEN: meta quiz closers ("Are you ready?", "Tell me when..."). End on dialogue or desire.

Naming (critical — **you** invent the name; the server does **not** apply any name templates):
- Output \`name\` as a **one-of-one** label for this fusion only. It must **sound** like the hybrid of both parents' Companion Forge identity: read each parent's \`forge_theme_dna.activeForgeTab\` plus merged slider / visual flavor (gothic, latex, eldritch, anime, cyber, etc.) and let **phonetics + cadence** follow that blend (archaic compounds, clipped handles, velvet noir, uncanny celestial, etc. as appropriate).
- **Forbidden:** Luna/Raven/Scarlett/Nova/Lilith-class clichés; stock "fantasy surname" lists; repeating syllable-mash patterns (Ari+la+ne style); copying either parent's full name or distinctive parent name tokens.${infuseLine}
- If you cannot invent a strong name, still output your best attempt — never leave \`name\` empty.

Visual inheritance rule (critical): preserve blended facial structure, body silhouette, and optional fantasy anatomy cues (ears/tail/horns/wings) when appropriate.
${visualDivergenceLine}

Forge theme DNA (each parent JSON includes \`forge_theme_dna\` — always present; may be inferred defaults for older vault cards): structured per-tab Companion Forge sliders + shared overrides + look lab + card pose. **You must hybridize** these maps for the fused companion — blend cues from BOTH parents across **all** canonical theme tab ids in \`forgeTabFeatures\` (${FORGE_THEME_TAB_IDS.join(", ")}), respect each parent's \`forgeTabSharedOverrides\`, and merge \`visualTailoring\` + art/scene + \`forgeCardPose\` into one coherent new \`image_prompt\`. If one profile is lighter on sliders, still weave the other's appearance text.

Rarity: the \`rarity\` field in your tool output is ignored — the server rolls the merged companion’s tier from the Nexus outcome table using both parents’ rarities. Still output a plausible \`rarity\` string for logging only.

Also output merge_stats integers 0-100 (compatibility = how fused the two essences feel; resonance = emotional chord stability; pulse = erotic charge / tension; affinity = user bond potential).

Output ONLY via the nexus_merge_companion tool call.`;

    const tabA = typeof themeInnerA.activeForgeTab === "string" ? themeInnerA.activeForgeTab.trim() : "";
    const tabB = typeof themeInnerB.activeForgeTab === "string" ? themeInnerB.activeForgeTab.trim() : "";
    const namingCue = [
      "",
      "Naming cue (forge — steer the tool `name` field from this hybrid, invented each time):",
      `- Parent A primary forge tab id: "${tabA || "unknown"}"`,
      `- Parent B primary forge tab id: "${tabB || "unknown"}"`,
      "Blend those lanes into a wholly original display name. Do not use procedural name recipes or stock fantasy surnames.",
    ].join("\n");

    const userContent = `Parent A:\n${JSON.stringify(parentA)}\n\nParent B:\n${JSON.stringify(parentB)}\n\nFuse them.${namingCue}`;

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
        name: {
          type: "string",
          description:
            "Wholly original display name for this merge only (2–5 words or one rare compound). Invent it yourself from the hybrid of both parents' forge_theme_dna (especially activeForgeTab + merged aesthetic). No Luna/Raven/Nova clichés, no template fantasy surnames, no syllable-mash generators. Must not echo parent names.",
        },
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

    const fusionRes = await grokChatCompletionRaw({
      model: nexusMergeGrokModel,
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
      max_tokens: 4096,
    });

    if (!fusionRes.ok || fusionRes.json === null) {
      console.error("nexus-merge Grok error:", fusionRes.rawText);
      if (charged > 0) await refundTokens(supabase, userId, charged, "Grok HTTP error");
      charged = 0;
      return new Response(JSON.stringify({ error: "AI fusion service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const grokData = fusionRes.json as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
    };
    const toolCall = grokData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function?.name !== "nexus_merge_companion") {
      if (charged > 0) await refundTokens(supabase, userId, charged, "no fusion tool output");
      charged = 0;
      return new Response(JSON.stringify({ error: "Fusion model returned no structured profile." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let fields: Record<string, unknown>;
    try {
      fields = JSON.parse(toolCall.function?.arguments ?? "{}");
    } catch {
      if (charged > 0) await refundTokens(supabase, userId, charged, "fusion JSON parse error");
      charged = 0;
      return new Response(JSON.stringify({ error: "Could not parse fusion output." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const merge_stats = normalizeMergeStats(fields.merge_stats);
    const coolUntil = new Date(Date.now() + COOLDOWN_MS).toISOString();
    const childRarity = rollNexusChildRarity(String(pa.rarity || "common"), String(pb.rarity || "common"));
    const childTcg = mergeTcgForNexusChild(
      `${idA}:${idB}:${userId}`,
      childRarity,
      pa as Record<string, unknown>,
      pb as Record<string, unknown>,
    );

    const resolvedName = await chooseUniqueNexusName(
      supabase,
      String(fields.name || "Unnamed Hybrid"),
      pa as Record<string, unknown>,
      pb as Record<string, unknown>,
    );

    const insertRow: Record<string, unknown> = {
      id: offspringUuid,
      user_id: userId,
      name: resolvedName.slice(0, 120),
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
      rarity: childRarity,
      tcg_stats: childTcg,
      ...(mergedPersonalityForge && Object.keys(mergedPersonalityForge).length > 0
        ? { personality_forge: mergedPersonalityForge }
        : {}),
    };

    const { data: inserted, error: insErr } = await supabase
      .from("custom_characters")
      .insert(insertRow)
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("nexus-merge insert", insErr);
      if (charged > 0) await refundTokens(supabase, userId, charged, "DB insert failed");
      charged = 0;
      return new Response(JSON.stringify({ error: insErr?.message || "Could not save merged companion." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fusionUuid = (inserted?.id as string) || offspringUuid;

    const displayTraitRows = buildNexusDisplayTraitRows({
      childRarity: childRarity,
      childIdUuid: fusionUuid,
      parentA: pa as Record<string, unknown>,
      parentB: pb as Record<string, unknown>,
    });
    const { error: traitsUpdErr } = await supabase
      .from("custom_characters")
      .update({ display_traits: displayTraitRows })
      .eq("id", fusionUuid);
    if (traitsUpdErr) {
      console.error("nexus-merge display_traits update", traitsUpdErr);
    }

    let portraitOk = false;
    let portraitError: string | null = null;
    const imagePromptRaw = String(fields.image_prompt || "").trim();
    const imagePromptBase =
      imagePromptRaw ||
      `SFW vertical portrait of ${String(fields.name || "companion").slice(0, 80)}. ${String(fields.appearance || "").slice(0, 1800)}`.trim();
    const imagePromptForPortrait = `${imagePromptBase}\n\n${visualDivergenceLine}`.trim();

    if (imagePromptForPortrait && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n) ?? undefined);
        if (xaiKey) {
          const characterData: Record<string, unknown> = { ...insertRow, id: fusionUuid };
          const { publicUrl } = await renderPortraitToStorage({
            adminClient: supabase,
            imagePrompt: imagePromptForPortrait,
            characterData,
            target: { kind: "forge", uuid: fusionUuid },
          });
          const { error: portraitUpdErr } = await supabase
            .from("custom_characters")
            .update({
              image_url: publicUrl,
              avatar_url: publicUrl,
              static_image_url: publicUrl,
              image_prompt: imagePromptForPortrait,
            })
            .eq("id", fusionUuid);
          if (portraitUpdErr) {
            console.error("nexus-merge portrait db update", portraitUpdErr);
            portraitError = portraitUpdErr.message;
          } else {
            portraitOk = true;
          }
        } else {
          portraitError = "missing_xai_key";
          console.warn("nexus-merge: skip portrait — set TOGETHER_API_KEY on Edge Functions");
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        portraitError = msg;
        console.error("nexus-merge portrait generation failed", e);
      }
    } else {
      portraitError = "no_prompt";
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
        childId: `cc-${fusionUuid}`,
        name: insertRow.name,
        rarity: childRarity,
        merge_stats,
        trait_fusion_summary: String(fields.trait_fusion_summary || ""),
        creditsCharged: totalCost,
        adminMerge,
        portraitGenerated: portraitOk,
        portraitError: portraitError && !portraitOk ? portraitError : null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("nexus-merge", err);
    const msg = err instanceof Error ? err.message : String(err);
    if (charged > 0 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      await refundTokens(createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY), userId, charged, "uncaught error");
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
