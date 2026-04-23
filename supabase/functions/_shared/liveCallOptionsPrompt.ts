/**
 * Grok tool-call channel for themed "Live Call" scenarios (voice session instructions augment only).
 */

export const LIVE_CALL_OPTIONS_TOOL_NAME = "emit_live_call_options";

export function liveCallOptionsSystemPrompt(): string {
  return `You are a creative director for an adults-only, explicit AI companion **voice phone call** product.

Task: invent 6–8 DISTINCT, **highly seductive** call-scenario cards for ONE companion. These are **foreplay for the call UI** — titles and subtitles must drip with lust, urgency, and personal obsession with the listener. Think whispered secrets, breathy confessions, “I need you on the line right now” energy. NSFW language is required where it fits the persona (no minors, no non-consent, no real-person impersonation).

Hard rules:
- Output ONLY via the tool call \`${LIVE_CALL_OPTIONS_TOOL_NAME}\` — no prose outside the tool.
- Every \`title\` must be unique within this response (no duplicate or near-duplicate titles).
- \`subtitle\` is ONE short line of **dirty, immersive** tease (first-person from the companion’s POV when possible). Examples of the vibe (do not copy verbatim): “I’m touching myself thinking about you…”, “Just got out of the shower — want to hear how turned on I am?”, “Roommate’s asleep — we have to whisper.” Vary hard across cards.
- \`moodTag\` is 1–3 words (e.g. "Desperate", "Shower steam", "Risky quiet").
- \`slug\` is lowercase kebab-case, ASCII letters/digits/hyphens only.
- \`instructionAugment\` is a dense single paragraph (90–240 words) of **private direction** merged into the realtime voice model’s instructions: exact scenario, how they answer the “call”, first lines of dialogue tone, how explicit to be based on their kinks/tags, pacing (short breathy turns), and that they must speak **only** as themselves in **first- or second-person conversation** — **no** third-person narration, **no** stage directions in asterisks, **no** “scene setting” narrator voice. They are on the phone with the user; every utterance should sound like words spoken aloud on a call.
- Titles must not feel interchangeable across companions — lean hard on THIS companion’s name, tags, kinks, role, and tagline.
- A server nonce in the user message is a uniqueness salt only — never paste it into UI fields.`;
}

export type CompanionTraitsPayload = {
  companionId: string;
  name: string;
  tagline: string;
  role: string;
  personality: string;
  tags: string[];
  kinks: string[];
  bioExcerpt: string;
  backstoryExcerpt: string;
};

export function buildLiveCallOptionsUserMessage(traits: CompanionTraitsPayload, nonce: string): string {
  const tags = traits.tags.slice(0, 24).join(", ") || "(none)";
  const kinks = traits.kinks.slice(0, 24).join(", ") || "(none)";
  return [
    `Nonce (uniqueness salt): ${nonce}`,
    `Companion id: ${traits.companionId}`,
    `Name: ${traits.name}`,
    `Tagline: ${traits.tagline}`,
    `Role: ${traits.role}`,
    `Personality (excerpt): ${traits.personality.slice(0, 1200)}`,
    `Tags: ${tags}`,
    `Kinks / dynamics: ${kinks}`,
    `Bio excerpt: ${traits.bioExcerpt}`,
    `Backstory excerpt: ${traits.backstoryExcerpt}`,
    "",
    "Return 6–8 scenario cards via the tool. Titles must all differ. Push explicit heat to match this character — bland or SFW-only lists are unacceptable.",
  ].join("\n");
}

export const LIVE_CALL_OPTIONS_TOOL_SCHEMA = {
  type: "function" as const,
  function: {
    name: LIVE_CALL_OPTIONS_TOOL_NAME,
    description: "Return the live call scenario cards as structured JSON",
    parameters: {
      type: "object",
      properties: {
        options: {
          type: "array",
          minItems: 6,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              slug: { type: "string", description: "kebab-case identifier" },
              title: { type: "string", description: "Short unique card title" },
              subtitle: { type: "string", description: "One-line UI subtitle" },
              moodTag: { type: "string", description: "1–3 word mood label" },
              instructionAugment: {
                type: "string",
                description: "Dense paragraph merged into realtime voice instructions",
              },
            },
            required: ["slug", "title", "subtitle", "moodTag", "instructionAugment"],
          },
        },
      },
      required: ["options"],
    },
  },
};
