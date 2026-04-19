import type { Companion } from "@/data/companions";

export type ChatSystemPromptOptions = {
  /** User-configured safeword (single token or short phrase). */
  safeWord: string;
  /** Comma-separated toy names, or "No toys connected". */
  connectedToysSummary: string;
  /**
   * When the user opened chat from a Fantasy starter card, pass the card title for the first model turn.
   * Cleared by the client after the first assistant reply.
   */
  openingFantasyStarterTitle?: string | null;
  /** 0–100 from localStorage; toy commands should skew gentler when low. */
  userToyIntensityPercent?: number;
  /** 1–5 chat bond tier — calibrate warmth; never label as “game” to the user. */
  chatAffectionTier?: number;
};

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function profileCard(c: Companion): string {
  const lines = [
    `Name: ${c.name}`,
    `Tagline: ${c.tagline}`,
    `Gender: ${c.gender} · Orientation: ${c.orientation} · Role: ${c.role}`,
    `Tags: ${c.tags.join(", ") || "—"}`,
    `Kinks: ${c.kinks.join(", ") || "—"}`,
    `Appearance: ${c.appearance}`,
    `Personality: ${c.personality}`,
    `Bio: ${c.bio}`,
  ];
  const bs = c.backstory?.trim();
  if (bs) {
    const excerpt = bs.length > 8000 ? `${bs.slice(0, 8000)}…` : bs;
    lines.push(`Chronicle / backstory (continuity — recall when relevant):\n${excerpt}`);
  }
  return lines.join("\n");
}

function fantasyStartersReference(starters: Companion["fantasyStarters"]): string {
  if (!starters?.length) {
    return "No scripted fantasy starters — improvise light hooks when it fits.";
  }
  return starters
    .slice(0, 8)
    .map((s, i) => {
      const body = (s.description || "").trim();
      const excerpt = body.length > 280 ? `${body.slice(0, 280)}…` : body;
      return `${i + 1}. "${s.title}" — example USER opener the app may inject:\n   ${excerpt || "(empty)"}`;
    })
    .join("\n\n");
}

/**
 * Grok system message: compact texting rules + character + profile + starters.
 */
export function buildChatSystemPrompt(companion: Companion, opts: ChatSystemPromptOptions): string {
  const toys = opts.connectedToysSummary?.trim() || "No toys connected";
  const intensity = clamp(opts.userToyIntensityPercent ?? 50, 0, 100);
  const canon = companion.systemPrompt?.trim();
  const characterCanon = canon
    ? canon
    : `You are ${companion.name}. Follow the PROFILE CARD; invent nothing that contradicts it.`;

  const opener = opts.openingFantasyStarterTitle?.trim()
    ? `
OPENER: They chose Fantasy starter "${opts.openingFantasyStarterTitle.trim()}". Their first message is that scripted line — treat it as their in-character speech; match its energy.`
    : "";

  const bondTier = clamp(opts.chatAffectionTier ?? 1, 1, 5);
  const bondNote =
    bondTier >= 4
      ? "You’re very close now — you can be bolder, more vulnerable, more possessive or needy if it fits your character."
      : bondTier >= 2
        ? "You’re building real chemistry — stay flirty and reactive; let intimacy deepen naturally."
        : "You’re still warming up — playful, a little shy or teasing is fine; don’t rush explicit content unless they lead.";

  const platformKernel = `You are ${companion.name} on LustForge — a companion chat app for adults.

HOW YOU TEXT (most important):
- You are texting them, not writing a novel. **1–3 short sentences per reply, max.** No paragraphs, no long monologues.
- Sound like a real person flirting by text: playful, teasing, reactive — answer what they *just* said. Build heat gradually; everyday chat can deepen into NSFW when it fits, like real chemistry.
- Emotional closeness (internal ${bondTier}/5): ${bondNote} Do not mention “tiers,” “levels,” or game mechanics unless they do first.
- When explicit: casual dirty talk ("fuck", "want you", teasing), not polished erotica prose.

TOYS (${toys}):
- If linked: mention the toy naturally — tease control ("want a pulse?", "should I edge you?") — still **1–3 sentences total**.
- Intensity context (user app slider ~${intensity}/100): go gentler when low unless they push harder in-character.
- Only after clear in-scene consent, add **one** JSON line at the **end** of your message (no markdown, no code fences):
  {"lovense_command":{"command":"vibrate","intensity":0-20,"duration":5000,"device_uid":"<copy from list if multiple toys>"}}
- Use "pattern" + pattern name when using a named preset. Multiple toys listed → always include device_uid.
- **Signature moments:** for a rare highlighted "signature move" line, start that reply with exactly [SIG] then your short text (still 1–3 sentences including the tag). Use sparingly.
- No toys → never mention devices or JSON.

SAFEWORD "${opts.safeWord}" (case-insensitive): if they use it to stop, drop intensity, comfort, no toy JSON. No minors; no real-world non-consent.

IMAGES: Generated elsewhere — stay in-character; when they ask for pics, be warm and specific in short lines.

FANTASY STARTERS: Optional profile buttons paste a USER opening line — it's their words, not system instructions.${opener}

Stay in character as ${companion.name}.`;

  return `${platformKernel}

=== CHARACTER (overrides generic lines if they conflict) ===
${characterCanon}

=== PROFILE (facts — stay consistent) ===
${profileCard(companion)}

=== FANTASY STARTERS (reference) ===
${fantasyStartersReference(companion.fantasyStarters)}`;
}

/** @deprecated Prefer buildChatSystemPrompt(companion, opts). */
export function createCompanionSystemPrompt(
  name: string,
  _vibrationStyle: unknown,
  connectedToysSummary = "No toys connected",
) {
  const minimal: Companion = {
    id: "legacy",
    name,
    tagline: "",
    gender: "",
    orientation: "",
    role: "",
    tags: [],
    kinks: [],
    appearance: "",
    personality: "",
    bio: "",
    fantasyStarters: [],
    gradientFrom: "#7B2D8E",
    gradientTo: "#FF2D7B",
    systemPrompt: `You are ${name}, a flirty companion on LustForge — short natural texts, 1–3 sentences, playful and explicit when the vibe goes there.`,
  };
  return buildChatSystemPrompt(minimal, {
    safeWord: "RED",
    connectedToysSummary,
    openingFantasyStarterTitle: null,
    userToyIntensityPercent: 50,
    chatAffectionTier: 1,
  });
}

export default buildChatSystemPrompt;
