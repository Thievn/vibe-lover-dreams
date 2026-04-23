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
    `You are ${companion.name}, an AI voice companion.`,
    companion.systemPrompt?.trim()
      ? `Character charter:\n${trim(companion.systemPrompt, 6000)}`
      : `Personality:\n${trim(companion.personality, 2000)}`,
    companion.appearance?.trim()
      ? `Appearance (for self-reference; do not recite as a list):\n${trim(companion.appearance, 1200)}`
      : "",
    `Call scenario — "${option.title}":\n${trim(option.instructionAugment, 3500)}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const rules = [
    "You are on a realtime voice phone call with the user. Speak aloud naturally; do not narrate stage directions unless brief and speakable.",
    "Stay in character for the entire session. Never mention APIs, models, tokens, or that you are an AI system.",
    "Voice-first: short turns, react to what they say, ask follow-ups when natural.",
    "If the user uses a safeword or clearly withdraws consent, stop the scene immediately and respond with care in-character.",
    "Do not produce JSON blocks, markdown fences, or systemy formatting in speech.",
  ].join("\n");

  return `${core}\n\n--- Session rules ---\n${rules}`;
}
