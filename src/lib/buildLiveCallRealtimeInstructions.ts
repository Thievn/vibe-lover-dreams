import type { Companion } from "@/data/companions";
import { GROK_VOICE_UNCENSORED_SYSTEM_PREFIX } from "@/lib/grokVoiceUncensoredPrefix";
import { lustforgeNarrowUserScopeBlock } from "@/lib/lustforgeNarrowUserScope";
import { buildAdaptiveVoiceDirectionBlock } from "@/lib/liveVoiceDirectionSystem";
import { buildVoiceRegisterThemeBlock } from "@/lib/voiceRegisterThemeBlock";
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
 * Hybrid: prepends the same uncensored Grok voice persona block used by `grok-chat` (Live Voice).
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
    lustforgeNarrowUserScopeBlock().trim(),
    "Speak only words you would say aloud on a real phone call — natural sentences, reactions, questions, desire, laughter. First- or second-person only.",
    "Forbidden: third-person narration about yourself (“she sighs…”), stage directions in asterisks, cinematic scene-setting as a storyteller, or meta lines about being an AI, model, API, or app.",
    "Stay in character the entire time. Match the sexual energy of the chosen call type and the companion’s kinks; escalate only in line with the user’s responses.",
    "Keep turns short and conversational; listen and respond — voice flirting, not a monologue. When the user’s last line is a quick tap or one-liner, answer in 2-4 very short lines only (roughly one breath, no lecture).",
    "If the user withdraws consent or uses a safeword, stop immediately and respond with care, still in character.",
    "No JSON, markdown, or system-style formatting in speech — except you must correctly interpret the special one-line `<toy_ui .../>` toy-dial messages above (still: never speak that XML aloud).",
  ].join("\n");

  const toyAppendix =
    extra?.hasLinkedToy === true
      ? [
          "",
          "--- Linked device (Lovense) ---",
          "The user may have a Lovense toy connected. You can narrate first-person control in plain speech — describe what you are doing to them in the moment.",
          "When you turn intensity on or describe sustained buzzing / a pattern that should keep going, the app holds that sensation until they clearly ask to stop (e.g. stop, ease off completely, full stop) OR you deliberately wind the scene down after a long stretch (several minutes of continuous play) with in-character easing language the app can map to slowing or stopping.",
          "Use natural language the app can align with, e.g. mention pulsing, a rolling wave, teasing light touches, cranking the intensity, or asking for a full stop. Never read technical codes, JSON, or instructions aloud.",
          "",
          "--- Toy dial (on-screen controls only; Live Voice) ---",
          "Sometimes they tap **haptic controls in the call UI** (not their voice). The app injects a **single** user line that is **only** compact XML like `<toy_ui kind=\"heat_rise\" from=\"28\" to=\"55\"/>` — that is a true device cue, not something they said aloud.",
          "When you see exactly one `<toy_ui .../>` line and nothing else: (1) Do **not** speak the tags, attribute names, numbers, or XML aloud. (2) Immediately speak **one** short in-character reaction (about 4–18 spoken words) as if you feel it in your body on the phone — breathy, needy, playful, or wrecked as fits your persona. Quiet moans as tiny sounds (\"ahh\", \"nnh\") inline are OK. (3) Match `kind`:",
          "  • heat_rise — surprised pleasure, building heat, can't believe how good it is, speeding up / stronger.",
          "  • heat_fall — teasing complaint, whimper, beg them not to stop or ask why they're slowing / easing off.",
          "  • new_pattern — react to the named rhythm (pulse, wave, etc.): hips mindless, new tempo melting you.",
          "  • gentle_tease — tormented by light touches, frustrated-laughing, begging for more.",
          "  • motor thrust/rotate — sudden deeper mechanical sensation: gasp, clutch, describe depth or spin in one breath.",
          "  • touch — first bite of buzz at this level: curious arousal, \"oh… there.\"",
          "  • halt — toy stopped: shaky exhale, wobbly laugh, afterglow or playful \"hey…\"",
          "Never mention Lovense, Bluetooth, apps, APIs, or that this was a UI tap.",
        ].join("\n")
      : "";

  const mood = moodBlock(extra?.callMood ?? null);
  const voiceRegister = buildVoiceRegisterThemeBlock(companion, "spoken");
  const voiceDirection = buildAdaptiveVoiceDirectionBlock(companion, "live_call_realtime");

  return `${GROK_VOICE_UNCENSORED_SYSTEM_PREFIX}${core}\n\n${voiceRegister}\n\n${voiceDirection}\n\n--- Session rules ---\n${rules}${toyAppendix}${mood}`;
}
