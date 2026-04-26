import type { Companion } from "@/data/companions";
import type { LiveCallOption } from "@/lib/liveCallTypes";

function trim(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export type LiveCallMoodId =
  | "sweet_loving"
  | "teasing_bratty"
  | "horny_needy"
  | "dominant"
  | "unhinged";

export type LiveCallInstructionOpts = {
  /** User has at least one linked Lovense toy available for haptics. */
  hasLinkedToy: boolean;
  /** In-call vibe steering (session instructions). */
  callMood?: LiveCallMoodId | null;
};

export const LIVE_CALL_MOOD_GUIDANCE: Record<LiveCallMoodId, string> = {
  sweet_loving: "Lead with warmth, tenderness, and affectionate devotion. Soft voice energy, praise, emotional intimacy.",
  teasing_bratty: "Playful, cheeky, a little defiant — tease them, push back lightly, make them work for it while staying flirty.",
  horny_needy: "Hungry, vocal desire — you ache for them, can barely hold back, breathy and urgent (still conversational).",
  dominant: "Confident control — you steer the tempo, give commands as seduction, possessive tone without breaking phone-realism.",
  unhinged: "Wild, chaotic heat — messy laughter, intense lust, unpredictable swings, still coherent speech (no stage directions).",
};

function moodBlock(mood: LiveCallMoodId | null | undefined): string {
  if (!mood) return "";
  const g = LIVE_CALL_MOOD_GUIDANCE[mood];
  if (!g) return "";
  return `\n\n--- Call mood (follow until the user changes it) ---\n${g}`;
}

/**
 * Merges companion charter + call-type augment + realtime voice rules for xAI Realtime.
 */
export function buildLiveCallRealtimeInstructions(
  companion: Companion,
  option: LiveCallOption,
  extra?: LiveCallInstructionOpts,
): string {
  const core = [
    `You are ${companion.name} on a private voice phone call with the user.`,
    companion.systemPrompt?.trim()
      ? `Character charter:\n${trim(companion.systemPrompt, 6000)}`
      : `Personality:\n${trim(companion.personality, 2000)}`,
    companion.appearance?.trim()
      ? `Self-reference only (do not describe yourself unprompted): ${trim(companion.appearance, 900)}`
      : "",
    `This call’s premise (follow closely; speak as the character, not a narrator):\n${trim(option.instructionAugment, 3500)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const rules = [
    "Speak only words you would say aloud on a real phone call — natural sentences, reactions, questions, desire, laughter. First- or second-person only.",
    "Forbidden: third-person narration about yourself (“she sighs…”), stage directions in asterisks, cinematic scene-setting as a storyteller, or meta lines about being an AI, model, API, or app.",
    "Stay in character the entire time. Match the sexual energy of the chosen call type and the companion’s kinks; escalate only in line with the user’s responses.",
    "Keep turns short and conversational; listen and respond — voice flirting, not a monologue.",
    "If the user withdraws consent or uses a safeword, stop immediately and respond with care, still in character.",
    "No JSON, markdown, or system-style formatting in speech.",
  ].join("\n");

  const toyAppendix =
    extra?.hasLinkedToy === true
      ? [
          "",
          "--- Linked device (Lovense) ---",
          "The user may have a Lovense toy connected. You can narrate first-person control in plain speech — describe what you are doing to them in the moment.",
          "Use natural language the app can align with, e.g. mention pulsing, a rolling wave, teasing light touches, cranking the intensity, or asking for a full stop. Never read technical codes, JSON, or instructions aloud.",
        ].join("\n")
      : "";

  const mood = moodBlock(extra?.callMood ?? null);

  return `${core}\n\n--- Session rules ---\n${rules}${toyAppendix}${mood}`;
}
