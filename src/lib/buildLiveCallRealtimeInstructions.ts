import type { Companion } from "@/data/companions";
import type { LiveCallOption } from "@/lib/liveCallTypes";

function trim(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/**
 * Merges companion charter + call-type augment + realtime voice rules for xAI Realtime.
 */
export function buildLiveCallRealtimeInstructions(companion: Companion, option: LiveCallOption): string {
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

  return `${core}\n\n--- Session rules ---\n${rules}`;
}
