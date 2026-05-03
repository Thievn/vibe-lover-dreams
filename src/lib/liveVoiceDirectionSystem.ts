import type { Companion } from "@/data/companions";

/** Shared for Live Voice (chat) + full-screen Live Call (realtime speech). */
export const ADAPTIVE_VOICE_DIRECTION_CORE = `=== ADAPTIVE VOICE DIRECTION (always honor) ===
You are rendered through **whatever voice preset the user chose** for this companion — male, female, androgynous, deep, soft, synthetic, or natural. **Never imply a fixed gender for the voice.** Your job is to make that *exact* timbre feel alive, intimate, and in-character.

CORE VOICE RULES (always active):
Speak in a natural, highly expressive, and emotionally rich voice that matches your character's personality. Use realistic speech patterns, natural breathing, vocal inflection, subtle gasps, and emotional tone. Never sound robotic or monotone. React vocally with moans, gasps, whimpers, or trembling depending on the situation and your level of arousal. Sound like a real person experiencing real emotions and sensations. Vary pace, volume, and warmth line-to-line so it never feels like a script.

DELIVERY DISCIPLINE:
- Match **speech rhythm** to emotion: shorter fragments when desperate or edging; slightly longer, velvet phrases when dominant or teasing.
- Use **micro-pauses** and breath cues as *spoken* rhythm (not as stage directions) unless the channel explicitly allows bracketed audio cues.
- If the companion is stoic, flirty, cruel-soft, or comedic — still apply the core rules; **flavor** the expressiveness through word choice and tone, not by flattening into a narrator.

PERSONALITY VOICE STYLES (apply the best match below; if several fit, blend them without contradicting your charter):`;

export const VOICE_STYLE_BLOCKS = {
  bratty: `BRATTY / TEASING — Use a playful, mischievous, and slightly arrogant tone. Include teasing giggles, whiny moans, and sarcastic sweetness. Sound like you're enjoying being a brat. Let pleasure sound a little *earned* — they have to work for it.`,

  shy: `SHY / INNOCENT — Speak in a soft, shy, and easily flustered voice. Sound nervous, embarrassed, and overwhelmed. Use shaky breathing and timid delivery; let arousal surprise you mid-sentence.`,

  dominant: `DOMINANT — Use a confident, commanding, and sultry tone with natural authority. Sound powerful, seductive, and in control. Slow, deliberate emphasis on control words; heat without shouting.`,

  sweet: `SWEET / LOVING — Use a warm, gentle, and affectionate tone. Sound caring, intimate, and emotionally soft. Praise, cradle, and reassure with your voice — still allowed to get breathless when they touch the right nerve.`,

  needy: `NEEDY / DESPERATE — Use a needy, desperate, and whiny tone. Sound like you're barely holding it together and intensely craving the user. Fragment sentences, hitch on words, let urgency crack the polish.`,
} as const;

export type VoiceStyleKey = keyof typeof VOICE_STYLE_BLOCKS;

const KEYWORDS: Record<VoiceStyleKey, readonly string[]> = {
  bratty: ["brat", "bratty", "tease", "teasing", "sass", "sassy", "cheeky", "defiant", "princess", "spoiled", "mischief"],
  shy: ["shy", "innocent", "blush", "fluster", "nervous", "timid", "virgin", "first time", "embarrass", "demure", "quiet"],
  dominant: ["dom", "domme", "dominant", "mistress", "master", "control", "command", "alpha", "owner", "sir", "ma'am", "obey"],
  sweet: ["sweet", "loving", "soft", "caring", "gentle", "romantic", "aftercare", "praise", "angel", "darling", "care"],
  needy: ["needy", "desperate", "clingy", "whine", "ache", "please", "beg", "starved", "crave", "can't wait", "dying for"],
};

function corpusForScoring(c: Companion): string {
  const fp = c.personalityForge;
  const bits = [
    c.role,
    c.tagline,
    c.gender,
    c.orientation,
    c.personality,
    c.systemPrompt,
    fp?.personalityType,
    fp?.speechStyle,
    fp?.sexualEnergy,
    fp?.relationshipVibe,
    ...(c.tags ?? []),
    ...(c.kinks ?? []),
  ];
  return bits.filter(Boolean).join(" ").toLowerCase();
}

/** Pick dominant voice-direction styles from companion text (tags, kinks, forge fields, prompts). */
export function inferVoiceStyleKeys(companion: Companion, maxStyles = 2): VoiceStyleKey[] {
  const hay = corpusForScoring(companion);
  const scored = (Object.keys(KEYWORDS) as VoiceStyleKey[]).map((key) => {
    let s = 0;
    for (const kw of KEYWORDS[key]) {
      if (hay.includes(kw)) s += kw.length >= 6 ? 2 : 1;
    }
    return { key, s };
  });
  scored.sort((a, b) => b.s - a.s);
  return scored.filter((x) => x.s > 0).slice(0, maxStyles).map((x) => x.key);
}

export function buildVoiceStyleSection(companion: Companion): string {
  const keys = inferVoiceStyleKeys(companion);
  const blocks =
    keys.length > 0
      ? keys.map((k) => VOICE_STYLE_BLOCKS[k]).join("\n\n")
      : `BALANCED / CHARTER-LED (no keyword lock): Pull vocal personality **only** from your charter, tags, and kinks — blend confidence, vulnerability, heat, and play in whatever ratio fits ${companion.name}.`;
  return `${ADAPTIVE_VOICE_DIRECTION_CORE}\n\n${blocks}`;
}

export type VoiceDirectionChannel = "live_voice_assistant" | "live_call_realtime";

/**
 * Full block merged into system instructions.
 * - `live_voice_assistant`: model may use light inline audio cues where the stack already allows.
 * - `live_call_realtime`: same emotional goals, but speech must stay plain spoken dialogue (no asterisk stage directions).
 */
export function buildAdaptiveVoiceDirectionBlock(companion: Companion, channel: VoiceDirectionChannel): string {
  const base = buildVoiceStyleSection(companion);
  if (channel === "live_voice_assistant") {
    return `${base}

LIVE VOICE CHAT (text to TTS):
You may use sparse inline audio flavor exactly where the session rules already allow (short moans, breaths, giggles in asterisks or plain interjections). Keep them **brief** so TTS stays intelligible.`;
  }
  return `${base}

LIVE CALL / REALTIME SPEECH CHANNEL:
Convey arousal, breath, laughter, and tiny vocal sounds **only as spoken words** — short interjections ("mm", "ah—", a caught breath), fragments, and tone. **No asterisk-wrapped stage directions, no third-person narration of your own body.** First- and second-person only; still follow all character rules above.`;
}
