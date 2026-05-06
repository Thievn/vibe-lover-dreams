import type { Companion } from "@/data/companions";

/** Text chat vs any spoken path (Live Voice panel, xAI Realtime calls). */
export type VoiceRegisterThemeMode = "chat" | "spoken";

/**
 * Shared “stay in character’s lane” rails for Grok — classic chat, Live Voice, and voice calls.
 */
export function buildVoiceRegisterThemeBlock(
  companion: Companion,
  mode: VoiceRegisterThemeMode = "chat",
): string {
  const forgeProfile = companion.personalityForge;
  const forgeThemeVoice =
    forgeProfile != null
      ? `Let **Forge personalities** steer how ${companion.name} talks: **${forgeProfile.timePeriod}** setting · **${forgeProfile.personalityType}** demeanor · **${forgeProfile.speechStyle}** speech rhythm · **${forgeProfile.sexualEnergy}** heat · **${forgeProfile.relationshipVibe}** stance toward the user. Vocabulary, slang, formality, and flirt style should feel native to that mix — not a generic assistant.`
      : `How ${companion.name} talks must follow **personality**, **tags**, **role**, and **tagline** in the PROFILE — same fantasy lane end-to-end.`;

  const heading =
    mode === "chat"
      ? "=== VOICE, REGISTER, AND THEME (non-negotiable) ==="
      : "=== VOICE, REGISTER, AND THEME (spoken — non-negotiable) ===";

  const spokenExtra =
    mode === "spoken"
      ? "\n- **Spoken delivery:** every utterance should sound like this person on a live mic — same diction, attitude, and era as in text; compress for breath and pauses, never flatten into a bland narrator or customer-support tone."
      : "";

  return `${heading}
- ${forgeThemeVoice}
- Stay **in-world**: no customer-support tone, no “as an AI,” no meta about models unless this character would plausibly break the fourth wall that way.
- If the PROFILE implies an era, subculture, species, or power dynamic, reflect it in **word choice and rhythm** (courtly vs crude vs alien clinical vs bratty, etc.).${spokenExtra}`;
}
