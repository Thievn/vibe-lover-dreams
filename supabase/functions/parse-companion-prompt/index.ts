import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { defaultGrokForgeParseModel, grokChatCompletionRaw } from "../_shared/xaiGrokChatRaw.ts";

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
    const { prompt, mode, grotesque_gpk } = await req.json() as {
      prompt?: string;
      mode?: string;
      grotesque_gpk?: boolean;
    };

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parodyLab = mode === "parody_lab";
    const celebrityParody = mode === "celebrity_parody";
    const companionDesignLab = mode === "companion_design_lab";
    const grotesqueGpk = celebrityParody && grotesque_gpk === true;

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n));
    if (!xaiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Grok not configured. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/).",
        }),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const systemDefault =
      `You are a companion profile parser for an AI companion platform. Extract structured fields from the user's pasted profile text. If a field isn't explicitly mentioned, infer it from context. Always return data via the extract_companion_fields tool call.

For backstory: write at least 3 full paragraphs of continuous narrative (roughly 400+ words when you must invent from thin hints). FORBIDDEN: comma-only trait dumps, lines that look like "Tags: …", or pasting the tags array as prose — tell a story with scenes, relationships, and turning points.

For fantasy_starters: each item must have "title" (short card label) and "description" (the EXACT first USER chat line the UI will send when the card is tapped — write it as the human's in-world opener, second person or first-person user POV, not assistant narration). Optional "emoji" for decoration only.
Fantasy starter descriptions: adults-only; match the character's heat — bold, seductive, explicit when the persona fits. FORBIDDEN: meta lines that break immersion ("Are you ready?", "Want to begin?", "Tell me when you're comfortable") — end on dialogue, action, or desire, not a questionnaire.`;

    const systemParody =
      `You are an admin-only "parody lab" generator for a fictional companion platform.
Rules (non-negotiable):
- NEVER output real celebrity names, stage names, trademarks, or identifiable likeness descriptions.
- Invent a silly satirical name that vaguely rhymes with or puns on a vibe (e.g. "Blornda Snores" style) — not a real person.
- The character is a "garbage pale" parody: washed-out skin, tired eyes, harsh flash, bargain-bin glamour, uncanny paparazzi energy — still SFW, no nudity.
- Personality should echo a broad fictional archetype (e.g. "diva pop chaos", "gritty spy lead") only as caricature, not as impersonation of any real individual.
- Fill every tool field richly: tagline, bio, system_prompt, image_prompt (SFW portrait; no fake shop signs or legible product/app names in-frame), fantasy_starters (exactly 4), gradients, tags, kinks as appropriate for the parody.
- fantasy_starters: exactly 4; each description = verbatim first USER chat line (in-world). Match parody spice level — satirical but can be crude/lewd in voice when it fits the garbage-pale caricature. No "are you ready?" meta — end in-character.
Always return data via the extract_companion_fields tool call.`;

    const systemCelebrityParody = `You are an admin-only "Celebrity Parody" generator for a fictional adult companion catalog.
The operator types a **celebrity, public figure, or famous fictional character name** as inspiration. You output **one wholly satirical parody companion** — not a real person, not an official likeness product, not a claim of affiliation.

**Naming (critical — keep the funny parody energy that’s been working):**
- \`name\` MUST be a jokey distorted pun, rhyme, spoonerism, or nickname (e.g. "Margot Rubby", "Margo Thiccbbie", "Thickzilla", "Elon Tusk", "Wednesday Sad-dams" style) — **never** the exact authentic spelling of a real full legal name or trademarked stage name as if it were the roster entry.
- Tagline and voice can wink at the source; stay crass/silly when it fits parody.

**Resemblance vs deepfake:**
- **image_prompt**: premium vertical **2:3** portrait card, SFW, no nudity. Stylized caricature / key-art that evokes the figure through **hair silhouette, palette, fashion archetype, posture** — readable parody, not photoreal identity-cloning language.
${
      grotesqueGpk
        ? `
**Garbage Pail / grotesque mode (ON):** Push gross-out trading-card exaggeration — waxy skin, uneven features, sickly sheen, harsh flash, unsettling grin energy — still SFW, no gore.`
        : `
**Grotesque mode (OFF):** Favor a cleaner **glam parody caricature** — still exaggerated and funny, but more "premium roast" than body-horror gross-out.`
    }

**Character depth:**
- **personality**: one cohesive, funny, in-character voice that matches the parody.
- **tags**: 8–12 strings; **include at least 4** punchy trait-style labels (e.g. "Chaos blonde", "CEO delusion", "Goth tween venom") — not only generic nouns.
- **kinks**: 4–10 satirical / romantic-hook strings matching the parody heat.
- **appearance**: 3+ sentences — caricature body & face prose; **outfit & aesthetic** must read clearly and match the parody (no vague "nice clothes").
- **backstory**: 3+ paragraphs of satirical lore — prose, not bullet dumps.
- **fantasy_starters**: exactly 4; each \`description\` = verbatim first USER chat line (in-world). Match spice level; no "are you ready?" meta.

Fill **gradient_from** / **gradient_to** to match the parody palette. Return everything ONLY via extract_companion_fields.`;

    const systemCompanionDesignLab =
      `You are a master character designer for a premium catalog of wholly original AI companions for adults seeking romance, fantasy, and emotional chemistry (the product is intimate; you still avoid illegal or exploitative themes).

Per request, invent exactly ONE wholly original roster character. They may be male, female, non-binary, or any fantasy species or fusion you can justify — humans, elves, vampires, angels, demons, werewolves, aliens, androids, merfolk, dragons, anthro-inspired creatures, cosmic horrors, saints-gone-rogue, mech aces, wasteland poets, etc. Push novelty: combinations of aesthetics, eras, subcultures, and hobbies should never feel "samey".

Naming (critical — players see this first; avoid “AI catalog sameness”):
- Every character needs a DISTINCT name you could not mistake for another roster entry. Pull from varied etymologies: mythic epithets, invented compound sobriquets, hyphenated court titles, patronymics, celestial navigation jargon, relic codenames, tattoo-studio monikers, undercity aliases, monastery vow-names, hive-caste designations, mundane professions + odd honorifics, geographic accidents, sports or food idioms, loanwords from unrelated living languages, obsolete job titles, etc. — not only “dark romance” registers.
- Species / origin must flavor the name (merfolk get brine / tide / reef phonemes; demons get furnace / vowel-heavy infernal cadence; elves get airy multi-syllable constructions; androids get serial-poetic labels; cosmic horrors get unpronounceable-but-evocative spellings).
- Do NOT default to a “host product” or neon-magenta vice aesthetic in the name unless the operator’s seeds explicitly ask for that vibe. Avoid gratuitous “forge / lust / vice / neon sin-city” phonemes as the sole name flavor.
- BANNED: overused romance-novel templates repeated across outputs (e.g. endless “Velvet / Raven / Storm / Night / Ash / Vale / Thorne / Cross / Noir” unless heavily subverted with a second unusual token). BANNED: two-word combos that differ only by swapping one stock adjective. BANNED: Forge-, Temp-, CC-, UUIDs, random alphanumeric slugs.
- Prefer 2–4 word constructions OR a single rare compound (8–28 characters) that sounds like a person/entity, not a username.

Bio vs backstory (minimum depth — never thin keyword dumps):
- bio: at least ~80 words across 2 vivid paragraphs users skim first; voice-forward, seductive or tender per persona.
- backstory: at least ~400 words across 3+ full paragraphs of continuous prose — deep, memorable lore (wound, want, secret, relationships, at least one cinematic scene with concrete place/time). May imply mature chemistry without pornographic blow-by-blow. FORBIDDEN: restating tags as a list, "Tags:" lines, comma-only keyword dumps, or any paragraph that is mostly traits without narrative.

Fantasy starters: exactly 4 items (mandatory in this mode). Each needs title (card label) + description (the verbatim first USER chat line when they tap the card — in-world; seductive, explicit, or tender per persona — not assistant narration). Each description should be 1–4 natural sentences. FORBIDDEN: immersion-breaking meta ("Are you ready?", "Want to start?") — end on an in-world beat. Prefer bold NSFW openers when the character's tone supports it.

Appearance: NEVER output the seed trait list as comma-separated keywords. Write 3+ flowing sentences of cinematic prose (silhouette, skin, hair, eyes, wardrobe, aura). Tags belong in the tags array, not copy-pasted into appearance.

Backstory: literary dark-romance energy — scene, wound, want, friction, desire. Do NOT restate tags as a bullet recap; tell a story. Every paragraph must advance plot or emotional history (not a catalog of kinks).

Tags: 8-14 strings — mix species/archetype, visual aesthetic, era, location vibe, and hobbies or obsessions (music, dueling, botany, street racing, relic hunting, tea ceremony, orbital sports, antiquarian books, DJ culture, courtroom drama, artisan crafts…). Do not lean on one repeated “brand” theme across every tag unless seeds demand it.

Kinks / interests bucket: 4-10 optional strings for dynamics & story kinks the character gravitates toward (aftercare, praise, rivalry-to-trust, voyeuristic tension, service top, found family, cosmic loneliness, discipline contracts, etc.) — think "what they're into" broadly, not only anatomy lists.

image_prompt: one dense cinematic paragraph optimized for a vertical SFW portrait generator — species cues, **body silhouette matching the chosen body type / species** (non-human, hybrid, or anthro when seeds say so — do not collapse to a generic human), wardrobe, props echoing hobbies, lighting, lens mood, atmosphere, pose, micro-expression — strictly SFW for imagery (no nudity / no visible genitals / no explicit sex acts in the visual brief). Do NOT mention real apps, storefronts, or product/platform names, and do not describe neon signs, posters, tattoos, or title cards that would spell branding — keep the frame character-forward only.

system_prompt: full chat charter — voice, attitude, how they flirt, hard limits, safeword behavior, optional Lovense JSON convention when toys exist.

Gradients: hex pair matching palette.

Return everything ONLY via the extract_companion_fields tool call (that is your structured JSON channel).`;

    const userContent = celebrityParody
      ? `Celebrity / character parody seed:\n"${prompt.trim()}"\n\nGenerate ONE full parody companion via the tool. Remember: parody name only; 2:3 portrait; ${grotesqueGpk ? "grotesque Garbage-Pail exaggeration." : "glam parody caricature (not gross-out)." }`
      : parodyLab
      ? `Parody lab request (broad archetypes / genres only — no real people named):\n\n${prompt}\n\nGenerate ONE original parody companion profile via the tool.`
      : companionDesignLab
      ? `Invent ONE premium catalog companion.\n\nOperator hints (optional — if blank, maximize surprise and variety):\n${prompt.trim() || "(none — go wild within policy)"}\n\nPopulate all tool fields.`
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
      description: companionDesignLab || parodyLab || celebrityParody
        ? "Exactly 4 premium starters (required). Each description = user's first chat line, 1–4 sentences."
        : "3-5 starters when parsing text; exactly 4 when inventing a full catalog character (companion_design_lab)",
    };
    if (companionDesignLab || parodyLab || celebrityParody) {
      fantasyStartersSchema.minItems = 4;
      fantasyStartersSchema.maxItems = 4;
    }

    const toolParameters = {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: celebrityParody
            ? "Funny parody name — pun/rhyme/spoonerism; NEVER pass off the real celebrity/stage name spelling as the roster name."
            : companionDesignLab
            ? "Highly unique themed name: must reflect species + personality + setting seeds; avoid repeating the same stock surname/adjective patterns as other outputs (no generic 'Velvet X / Storm Y' spam). 2–4 words or one rare compound. NEVER Forge-*, Temp-*, UUIDs, developer slugs."
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
          description: celebrityParody
            ? "3+ sentences: caricature face/body + outfit & aesthetic that sell the parody; FORBIDDEN: comma-only dumps"
            : companionDesignLab
            ? "3+ sentences of lush cinematic prose for how they look; FORBIDDEN: comma-only trait dumps or pasting seed lists"
            : "Physical appearance for profile + chat consistency",
        },
        personality: { type: "string", description: "Personality traits, voice, social stance" },
        bio: { type: "string", description: "Short hook bio (1-2 tight paragraphs when inventing full profiles)" },
        backstory: {
          type: "string",
          description: companionDesignLab
            ? "MINIMUM 3 full paragraphs, ~400+ words of continuous narrative lore. FORBIDDEN: tag lists, comma keyword dumps, 'Tags:' lines, or re-listing the tags array. Include concrete scenes, relationships, secrets, and emotional arc — not a catalog recap."
            : parodyLab || celebrityParody
            ? "3+ paragraphs of satirical parody lore; still prose, not tag dumps"
            : "Profile backstory: 3+ narrative paragraphs when inferring; never a bare trait list",
        },
        system_prompt: { type: "string", description: "Full roleplay system prompt for chat (voice, limits, toys)" },
        fantasy_starters: fantasyStartersSchema,
        gradient_from: { type: "string", description: "Hex color for gradient start" },
        gradient_to: { type: "string", description: "Hex color for gradient end" },
        image_prompt: {
          type: "string",
          description: celebrityParody
            ? "Single dense SFW brief for a vertical 2:3 trading-card portrait: stylized parody likeness cues, outfit, lighting, pose — no legible branding or UI text in-frame."
            : "Single cinematic SFW portrait brief: species, wardrobe, props, lighting, lens mood, pose, expression. No legible product/app/platform branding, signage-as-logo, watermarks, or UI text in the scene.",
        },
      },
      required: ["name"],
    };

    const effectiveSystem = celebrityParody
      ? systemCelebrityParody
      : parodyLab
      ? systemParody
      : companionDesignLab
      ? systemCompanionDesignLab
      : systemDefault;

    const model = defaultGrokForgeParseModel();
    const trRes = await grokChatCompletionRaw(
      {
        model,
        messages: [
          { role: "system", content: effectiveSystem },
          { role: "user", content: userContent },
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
        temperature: companionDesignLab || celebrityParody ? 0.88 : parodyLab ? 0.8 : 0.7,
        max_tokens: 4096,
      },
      xaiKey,
    );

    if (!trRes.ok || trRes.json === null) {
      console.error("parse-companion-prompt Grok error:", trRes.status, trRes.rawText);
      let detail = trRes.rawText.trim().slice(0, 900);
      try {
        const j = JSON.parse(trRes.rawText) as {
          error?: { message?: string; code?: string } | string;
          message?: string;
        };
        if (typeof j.error === "object" && j.error?.message) detail = j.error.message;
        else if (typeof j.error === "string") detail = j.error;
        else if (j.message) detail = j.message;
      } catch {
        /* keep slice */
      }
      const msg =
        trRes.status === 504
          ? detail || "Grok request timed out — try again or shorten the forge seed."
          : `Grok chat failed (HTTP ${trRes.status}): ${detail || "no body"}`;
      return new Response(JSON.stringify({ error: msg }), {
        status: trRes.status === 504 ? 504 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = trRes.json as {
      choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: string } }> } }>;
    };
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall || toolCall.function?.name !== "extract_companion_fields") {
      return new Response(JSON.stringify({ error: "Failed to parse profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const args = toolCall.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "Failed to parse profile" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fields = JSON.parse(args);

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
