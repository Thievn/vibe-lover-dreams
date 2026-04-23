/**
 * Grok tool-call channel for themed "Live Call" scenarios (voice session instructions augment only).
 */

export const LIVE_CALL_OPTIONS_TOOL_NAME = "emit_live_call_options";

export function liveCallOptionsSystemPrompt(): string {
  return `You are a creative director for an adults-only AI companion voice-call product.

Task: invent 6–8 DISTINCT phone-call scenario cards for ONE companion. Each card is a fantasy framing for a realtime voice session (not text chat).

Hard rules:
- Output ONLY via the tool call \`${LIVE_CALL_OPTIONS_TOOL_NAME}\` — no prose outside the tool.
- Every \`title\` must be unique within this response (no duplicate or near-duplicate titles).
- \`subtitle\` is one short line for the UI (flavor, not instructions).
- \`moodTag\` is 1–3 words (e.g. "Teasing", "After hours", "Possessive").
- \`slug\` is lowercase kebab-case, ASCII letters/digits/hyphens only, stable-ish per title (e.g. "midnight-check-in").
- \`instructionAugment\` is a dense single paragraph (80–220 words) of DIRECTOR NOTES merged into the voice model's system instructions: scenario premise, how they open the call, pacing, tone, boundaries implied by the persona, and how to stay voice-first and in-character. Do NOT mention APIs, models, or "the user knows". Write as imperative direction to the performer.
- Lean on this companion's tags and kinks for variety; avoid generic titles that could apply to any roster entry.
- A server nonce will appear in the user message — treat it as uniqueness salt (vary wording vs other companions) but do not echo it verbatim in UI fields.`;
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
    "Return 6–8 scenario cards via the tool. Titles must all differ.",
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
