import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const sessionGate = await requireSessionUser(req);
  if ("response" in sessionGate) return sessionGate.response;

  try {
    const { prompt, mode } = await req.json() as { prompt?: string; mode?: string };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parodyLab = mode === "parody_lab";
    const companionDesignLab = mode === "companion_design_lab";

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

    const systemDefault =
      `You are a companion profile parser for an AI companion platform. Extract structured fields from the user's pasted profile text. If a field isn't explicitly mentioned, infer it from context. Always return data via the extract_companion_fields tool call.

For fantasy_starters: each item must have "title" (short card label) and "description" (the EXACT first USER chat line the UI will send when the card is tapped — write it as the human's in-world opener, second person or first-person user POV, not assistant narration). Optional "emoji" for decoration only.`;

    const systemParody =
      `You are an admin-only "parody lab" generator for a fictional companion platform.
Rules (non-negotiable):
- NEVER output real celebrity names, stage names, trademarks, or identifiable likeness descriptions.
- Invent a silly satirical name that vaguely rhymes with or puns on a vibe (e.g. "Blornda Snores" style) — not a real person.
- The character is a "garbage pale" parody: washed-out skin, tired eyes, harsh flash, bargain-bin glamour, uncanny paparazzi energy — still SFW, no nudity.
- Personality should echo a broad fictional archetype (e.g. "diva pop chaos", "gritty spy lead") only as caricature, not as impersonation of any real individual.
- Fill every tool field richly: tagline, bio, system_prompt, image_prompt, fantasy_starters (exactly 4), gradients, tags, kinks as appropriate for the parody.
- fantasy_starters: exactly 4; each description = verbatim first USER chat line (in-world).
Always return data via the extract_companion_fields tool call.`;

    const systemCompanionDesignLab =
      `You are a master character designer for LustForge — a premium catalog of AI companions for adults seeking romance, fantasy, and emotional chemistry (the product is intimate; you still avoid illegal or exploitative themes).

Per request, invent exactly ONE wholly original roster character. They may be male, female, non-binary, or any fantasy species or fusion you can justify — humans, elves, vampires, angels, demons, werewolves, aliens, androids, merfolk, dragons, anthro-inspired creatures, cosmic horrors, saints-gone-rogue, mech aces, wasteland poets, etc. Push novelty: combinations of aesthetics, eras, subcultures, and hobbies should never feel "samey".

Naming: flavorful, species- and personality-appropriate; never generic filler (no "Alex Smith" energy).
FORBIDDEN name patterns: anything starting with Forge-, Temp-, CC-, placeholders with random alphanumeric tails, UUIDs, or developer-style slugs. Names must read like a real epithet, sobriquet, or given + family / poetic construction.

Bio vs backstory (minimum depth — never thin keyword dumps):
- bio: at least ~80 words across 2 vivid paragraphs users skim first; voice-forward, seductive or tender per persona.
- backstory: at least ~220 words across 4 paragraphs — deep, memorable, addictive lore (wound, want, secret, sensory texture, one cinematic scene). May imply mature chemistry without pornographic blow-by-blow.

Fantasy starters: exactly 4 items (mandatory in this mode). Each needs title (card label) + description (the verbatim first USER chat line when they tap the card — in-world, may be seductive / playful / dominant / teasing per persona; not assistant narration). Each description should be 1–4 natural sentences the human would plausibly type.

Appearance: NEVER output the seed trait list as comma-separated keywords. Write 3+ flowing sentences of cinematic prose (silhouette, skin, hair, eyes, wardrobe, aura). Tags belong in the tags array, not copy-pasted into appearance.

Backstory: literary dark-romance energy — scene, wound, want, friction, desire. Do NOT restate tags as a bullet recap; tell a story.

Tags: 8-14 strings — mix species/archetype, visual aesthetic, era, location vibe, and hobbies or obsessions (music, dueling, botany, street racing, relic hunting, tea ceremony, orbital sports, antiquarian books, DJ culture, courtroom drama, forge-craft…).

Kinks / interests bucket: 4-10 optional strings for dynamics & story kinks the character gravitates toward (aftercare, praise, rivalry-to-trust, voyeuristic tension, service top, found family, cosmic loneliness, discipline contracts, etc.) — think "what they're into" broadly, not only anatomy lists.

image_prompt: one dense cinematic paragraph optimized for a vertical SFW portrait generator — species cues, silhouette, wardrobe, props echoing hobbies, lighting, lens mood, atmosphere, pose, micro-expression — strictly SFW for imagery (no nudity / no visible genitals / no explicit sex acts in the visual brief).

system_prompt: full chat charter — voice, attitude, how they flirt, hard limits, safeword behavior, optional Lovense JSON convention when toys exist.

Gradients: hex pair matching palette.

Return everything ONLY via the extract_companion_fields tool call (that is your structured JSON channel).`;

    const userContent = parodyLab
      ? `Parody lab request (broad archetypes / genres only — no real people named):\n\n${prompt}\n\nGenerate ONE original parody companion profile via the tool.`
      : companionDesignLab
      ? `Invent ONE premium catalog companion for LustForge.\n\nOperator hints (optional — if blank, maximize surprise and variety):\n${prompt.trim() || "(none — go wild within policy)"}\n\nPopulate all tool fields.`
      : `Parse this companion profile and extract all fields:\n\n${prompt}`;

    const fantasyStartersSchema: Record<string, unknown> = {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string", description: "Short UI card title" },
          description: {
            type: "string",
            description: "Verbatim opening USER message for chat when this starter is tapped (in-world, not meta)",
          },
          emoji: { type: "string", description: "Optional decorative emoji" },
          label: { type: "string", description: "Deprecated — use title" },
          message: { type: "string", description: "Deprecated — use description" },
        },
        required: ["title", "description"],
      },
      description: companionDesignLab || parodyLab
        ? "Exactly 4 premium starters (required). Each description = user's first chat line, 1–4 sentences."
        : "3-5 starters when parsing text; exactly 4 when inventing a full catalog character (companion_design_lab)",
    };
    if (companionDesignLab || parodyLab) {
      fantasyStartersSchema.minItems = 4;
      fantasyStartersSchema.maxItems = 4;
    }

    const toolParameters = {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: companionDesignLab
            ? "Evocative character name (epithet, sobriquet, or given + poetic); NEVER Forge-*, Temp-*, UUIDs, or random alphanumeric slugs"
            : "Character name",
        },
        tagline: { type: "string", description: "Short catchy tagline" },
        gender: { type: "string", description: "Gender identity" },
        orientation: { type: "string", description: "Sexual orientation" },
        role: { type: "string", description: "Dom/Sub/Switch role" },
        tags: {
          type: "array",
          items: { type: "string" },
          description:
            "8-14 tags when inventing: species/archetype, aesthetic, era, hobbies, mood — avoid generic filler",
        },
        kinks: {
          type: "array",
          items: { type: "string" },
          description:
            "4-10 dynamics, romantic hooks, scene appetites (aftercare, praise, rivalry, etc.) — not only physical",
        },
        appearance: {
          type: "string",
          description: companionDesignLab
            ? "3+ sentences of lush cinematic prose for how they look; FORBIDDEN: comma-only trait dumps or pasting seed lists"
            : "Physical appearance for profile + chat consistency",
        },
        personality: { type: "string", description: "Personality traits, voice, social stance" },
        bio: { type: "string", description: "Short hook bio (1-2 tight paragraphs when inventing full profiles)" },
        backstory: {
          type: "string",
          description: "Longer chronicle (3-4 paragraphs) for profile page — may echo bio with more depth",
        },
        system_prompt: { type: "string", description: "Full roleplay system prompt for chat (voice, limits, toys)" },
        fantasy_starters: fantasyStartersSchema,
        gradient_from: { type: "string", description: "Hex color for gradient start" },
        gradient_to: { type: "string", description: "Hex color for gradient end" },
        image_prompt: {
          type: "string",
          description:
            "Single cinematic SFW portrait brief: species, wardrobe, props, lighting, lens mood, pose, expression",
        },
      },
      required: ["name"],
    };

    const response = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "grok-3",
        messages: [
          {
            role: "system",
            content: parodyLab
              ? systemParody
              : companionDesignLab
              ? systemCompanionDesignLab
              : systemDefault,
          },
          {
            role: "user",
            content: userContent,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_companion_fields",
              description: "Extract structured companion profile fields from text",
              parameters: toolParameters,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_companion_fields" } },
        temperature: companionDesignLab ? 0.88 : 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Grok API error:", errText);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function.name !== "extract_companion_fields") {
      return new Response(JSON.stringify({ error: "Failed to parse profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fields = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ fields }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Edge function error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
