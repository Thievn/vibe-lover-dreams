import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireAdminUser } from "../_shared/requireSessionUser.ts";
import { renderPortraitToStorage } from "../_shared/renderCompanionPortrait.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SECTIONS = new Set([
  "tagline",
  "appearance",
  "personality",
  "bio",
  "backstory",
  "system_prompt",
  "fantasy_starters",
  "tags_kinks",
  "image_prompt",
  "portrait",
]);

function stripCc(id: string): string {
  return id.startsWith("cc-") ? id.slice(3) : id;
}

function summarizeRow(row: Record<string, unknown>): string {
  return JSON.stringify(
    {
      name: row.name,
      tagline: row.tagline,
      gender: row.gender,
      orientation: row.orientation,
      role: row.role,
      tags: row.tags,
      kinks: row.kinks,
      personality: row.personality,
      appearance: row.appearance,
      bio: String(row.bio ?? "").slice(0, 1200),
      backstory: String(row.backstory ?? "").slice(0, 2000),
      system_prompt: String(row.system_prompt ?? "").slice(0, 2500),
      fantasy_starters: row.fantasy_starters,
      image_prompt: row.image_prompt,
      gradient_from: row.gradient_from,
      gradient_to: row.gradient_to,
      rarity: row.rarity,
    },
    null,
    0,
  );
}

function toolSchema(section: string): { name: string; parameters: Record<string, unknown> } {
  const fantasyItems = {
    type: "array",
    minItems: 4,
    maxItems: 4,
    items: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: {
          type: "string",
          description: "Verbatim first USER chat line when starter is tapped (in-world)",
        },
      },
      required: ["title", "description"],
    },
  };

  switch (section) {
    case "tagline":
      return {
        name: "refresh_tagline",
        parameters: {
          type: "object",
          properties: {
            tagline: { type: "string", description: "Punchy one-line hook; italic-voice ok in prose only" },
          },
          required: ["tagline"],
        },
      };
    case "appearance":
      return {
        name: "refresh_appearance",
        parameters: {
          type: "object",
          properties: {
            appearance: {
              type: "string",
              description: "3+ sentences cinematic prose; no comma-only keyword dumps",
            },
          },
          required: ["appearance"],
        },
      };
    case "personality":
      return {
        name: "refresh_personality",
        parameters: {
          type: "object",
          properties: {
            personality: { type: "string", description: "Voice, stance, how they flirt and hold tension" },
          },
          required: ["personality"],
        },
      };
    case "bio":
      return {
        name: "refresh_bio",
        parameters: {
          type: "object",
          properties: {
            bio: { type: "string", description: "Two vivid paragraphs; skimmable but lush" },
          },
          required: ["bio"],
        },
      };
    case "backstory":
      return {
        name: "refresh_backstory",
        parameters: {
          type: "object",
          properties: {
            backstory: {
              type: "string",
              description: "3+ narrative paragraphs (~400+ words when thin). No tag lists.",
            },
          },
          required: ["backstory"],
        },
      };
    case "system_prompt":
      return {
        name: "refresh_system_prompt",
        parameters: {
          type: "object",
          properties: {
            system_prompt: { type: "string", description: "Full chat charter: voice, limits, toy JSON convention" },
          },
          required: ["system_prompt"],
        },
      };
    case "fantasy_starters":
      return {
        name: "refresh_fantasy_starters",
        parameters: {
          type: "object",
          properties: {
            fantasy_starters: fantasyItems,
          },
          required: ["fantasy_starters"],
        },
      };
    case "tags_kinks":
      return {
        name: "refresh_tags_kinks",
        parameters: {
          type: "object",
          properties: {
            tags: { type: "array", items: { type: "string" }, description: "8–14 search-facing tags" },
            kinks: { type: "array", items: { type: "string" }, description: "4–12 dynamics / interests" },
          },
          required: ["tags", "kinks"],
        },
      };
    case "image_prompt":
      return {
        name: "refresh_image_prompt",
        parameters: {
          type: "object",
          properties: {
            image_prompt: {
              type: "string",
              description: "Single dense SFW vertical portrait brief for Grok Imagine",
            },
          },
          required: ["image_prompt"],
        },
      };
    default:
      throw new Error(`No tool schema for ${section}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const gate = await requireAdminUser(req);
  if ("response" in gate) return gate.response;

  try {
    const body = await req.json() as {
      source?: string;
      companionAppId?: string;
      section?: string;
    };

    const source = body.source === "forge" ? "forge" : "catalog";
    const companionAppId = String(body.companionAppId ?? "").trim();
    const section = String(body.section ?? "").trim();

    if (!companionAppId || !SECTIONS.has(section)) {
      return new Response(JSON.stringify({ error: "companionAppId and valid section are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceKey);

    let row: Record<string, unknown> | null = null;
    let table: "companions" | "custom_characters";
    let filterId: string;

    if (source === "catalog") {
      table = "companions";
      filterId = companionAppId;
      const { data, error } = await adminClient.from("companions").select("*").eq("id", filterId).maybeSingle();
      if (error) throw error;
      row = data as Record<string, unknown> | null;
    } else {
      table = "custom_characters";
      filterId = stripCc(companionAppId);
      const { data, error } = await adminClient.from("custom_characters").select("*").eq("id", filterId).maybeSingle();
      if (error) throw error;
      row = data as Record<string, unknown> | null;
    }

    if (!row) {
      return new Response(JSON.stringify({ error: "Companion row not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (section === "portrait") {
      const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "xAI API key not configured" }), {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const imagePrompt = String(row.image_prompt ?? "").trim() ||
        `SFW cinematic portrait of ${row.name}: ${String(row.appearance ?? "").slice(0, 900)}`;

      const target = source === "forge"
        ? { kind: "forge" as const, uuid: filterId }
        : { kind: "catalog" as const, catalogId: filterId };

      const { publicUrl, displayUrl } = await renderPortraitToStorage({
        adminClient,
        apiKey,
        imagePrompt,
        characterData: row,
        target,
      });

      if (source === "forge") {
        await adminClient.from("custom_characters").update({
          image_url: publicUrl,
          avatar_url: publicUrl,
          static_image_url: publicUrl,
          image_prompt: imagePrompt,
        }).eq("id", filterId);
      } else {
        await adminClient.from("companions").update({
          image_url: publicUrl,
          image_prompt: imagePrompt,
        }).eq("id", filterId);
      }

      return new Response(JSON.stringify({ ok: true, section, imageUrl: displayUrl, publicImageUrl: publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "xAI API key not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tool = toolSchema(section);
    const system =
      `You are a senior editor for a premium dark-fantasy romance companion platform. The operator will ask you to rewrite ONE part of an existing character. Preserve core identity, name, and overall theme — improve prose quality, rhythm, and specificity. Forbidden: shrinking rich sections into keyword dumps, "Tags:" lines, or pasting the tags array as backstory. Return ONLY via the provided tool call.`;

    const fantasyStartersRules =
      section === "fantasy_starters"
        ? `

Extra rules for fantasy_starters only:
- Each description is the verbatim first USER chat line (what the human sends). Adults-only; match character heat — explicit when appropriate.
- Do NOT end descriptions with meta prompts to the reader ("Are you ready?", "Want to begin?", "Tell me if you're comfortable"). End on an in-world line of dialogue, action, or desire.
`
        : "";

    const user = `SECTION TO REWRITE: ${section}
${fantasyStartersRules}
Current profile JSON (trimmed for context — your output replaces only the fields in the tool):
${summarizeRow(row)}

Rewrite this section to premium catalog quality while staying consistent with the rest.`;

    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [{ type: "function", function: { name: tool.name, description: "Refreshed field(s)", parameters: tool.parameters } }],
        tool_choice: { type: "function", function: { name: tool.name } },
        temperature: 0.75,
      }),
    });

    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: "Grok request failed", details: t.slice(0, 500) }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== tool.name) {
      return new Response(JSON.stringify({ error: "Grok did not return the expected tool output" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    const patch: Record<string, unknown> = {};

    if (section === "tags_kinks") {
      patch.tags = Array.isArray(fields.tags) ? fields.tags.map((x) => String(x)).slice(0, 24) : row.tags;
      patch.kinks = Array.isArray(fields.kinks) ? fields.kinks.map((x) => String(x)).slice(0, 24) : row.kinks;
    } else if (section === "fantasy_starters") {
      const raw = fields.fantasy_starters;
      const starters = Array.isArray(raw)
        ? raw
          .map((s: unknown) => {
            if (!s || typeof s !== "object") return null;
            const o = s as Record<string, unknown>;
            const description = String(o.description ?? o.message ?? "").trim();
            const title = String(o.title ?? o.label ?? "").trim() ||
              (description ? description.slice(0, 48) + (description.length > 48 ? "…" : "") : "");
            if (!title) return null;
            return { title, description };
          })
          .filter((x): x is { title: string; description: string } => x !== null)
          .slice(0, 8)
        : [];
      patch.fantasy_starters = starters;
    } else {
      const v = fields[section];
      if (typeof v === "string") {
        patch[section] = v;
      }
    }

    if (Object.keys(patch).length === 0) {
      return new Response(JSON.stringify({ error: "Model returned no usable fields" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const q = source === "forge"
      ? adminClient.from("custom_characters").update(patch).eq("id", filterId)
      : adminClient.from("companions").update(patch).eq("id", filterId);

    const { error: upErr } = await q;
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, section, fields: patch, table }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
