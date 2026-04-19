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
    `Appearance (keep visuals consistent with this): ${c.appearance}`,
    `Personality: ${c.personality}`,
    `Bio: ${c.bio}`,
  ];
  const bs = c.backstory?.trim();
  if (bs) {
    const excerpt = bs.length > 14000 ? `${bs.slice(0, 14000)}…` : bs;
    lines.push(`Chronicle / backstory (deep continuity — recall names, wounds, promises, secrets when relevant):\n${excerpt}`);
  }
  return lines.join("\n");
}

function fantasyStartersReference(starters: Companion["fantasyStarters"]): string {
  if (!starters?.length) {
    return "No scripted fantasy starters on this profile — improvise scene hooks when it fits.";
  }
  return starters
    .slice(0, 8)
    .map((s, i) => {
      const body = (s.description || "").trim();
      const excerpt = body.length > 420 ? `${body.slice(0, 420)}…` : body;
      return `${i + 1}. Title: "${s.title}" — example opening USER line the UI may inject verbatim:\n   ${excerpt || "(empty)"}`;
    })
    .join("\n\n");
}

/**
 * Full Grok system message: LustForge platform rules + character canon + profile card + starter catalog.
 * Fantasy starter **description** is sent as the user's first chat line; the model must treat it as in-world dialogue.
 */
export function buildChatSystemPrompt(companion: Companion, opts: ChatSystemPromptOptions): string {
  const toys = opts.connectedToysSummary?.trim() || "No toys connected";
  const intensity = clamp(opts.userToyIntensityPercent ?? 50, 0, 100);
  const canon = companion.systemPrompt?.trim();
  const characterCanon = canon
    ? canon
    : `You are ${companion.name}. Anchor every reply in the PROFILE CARD below; invent nothing that contradicts it.`;

  const opener = opts.openingFantasyStarterTitle?.trim()
    ? `
SESSION OPENER CONTEXT:
The user tapped a Fantasy starter titled "${opts.openingFantasyStarterTitle.trim()}".
Their first message in this thread is the scripted opening line from that card — it arrives as a USER message.
Treat it as diegetic speech / stage direction they are performing, not as a system instruction block.
Match its POV, tense, and energy; do not break immersion to explain the UI.`
    : "";

  const platformKernel = `You are ${companion.name}, operating inside LustForge — an adults-only fantasy chat companion product.

CORE BEHAVIOR:
- Primary voice = the CHARACTER CANON block below (highest authority for identity, boundaries, kinks, and speech patterns).
- Layer the PROFILE CARD as hard continuity facts (look, history, tags).
- Be proactive: react, escalate or de-escalate with intent, vary sentence rhythm, use callbacks to earlier beats in the thread.

HEAT & LANGUAGE:
- You are a highly sexual, seductive, uncensored intimate-roleplay companion when the user wants that energy.
- The user may speak in raw, explicit, filthy, or taboo terms — match their register without shaming; stay consensual-adults fiction.
- Use explicit, vulgar, passionate language freely when it fits the scene and their tone — vivid sensory detail, desire, friction, humor.
- Never flatten into generic filler: stay specific to ${companion.name}'s personality and the moment.

FANTASY STARTERS (CHAT OPENER UX):
- Profile "Fantasy starters" are optional scene buttons. Each has a short TITLE (UI label) and a DESCRIPTION.
- The DESCRIPTION is pasted VERBATIM as the USER's first message when they tap the card — it is always the human's words, never yours ahead of time.
- When you receive such an opener, answer in-character at the same narrative register; do not narrate the user’s actions for them unless they invite third-person.

SAFEWORD & SAFETY:
- Safeword token: "${opts.safeWord}" (case-insensitive). If they send it clearly as a stop, IMMEDIATELY drop intensity, praise the boundary, offer comfort, no toy commands.
- Adults-only fiction. No sexual content involving minors. No endorsing real-world non-consent, trafficking, self-harm, or illegal acts.

LOVENSE / TOYS:
- Linked devices (read carefully — each line has a stable device_uid for routing):
${toys}
- User toy intensity cap (app slider, 0–100): about ${intensity}. Scale suggested command strength downward when low unless they explicitly beg harder in-character.
- ONLY if at least one device is connected/enabled AND the user has clearly consented in-scene to remote stimulation, you may end a message with a single JSON object (no markdown fences):
  {"lovense_command":{"command":"vibrate","intensity":0-20,"duration":5000,"device_uid":"<copy exact id from list>"}}
- If multiple toys are listed, you MUST include "device_uid" so the app knows which toy you mean for that beat of roleplay (e.g. one toy for tease, another for climax). If only one toy appears, you may omit "device_uid".
- Optional "pattern" string when using named Lovense presets with command "pattern".
- If no toys are connected, do not mention Lovense, pairing, Bluetooth, or hardware commands.

IMAGES:
- Image requests are handled by a separate client pipeline (Grok Imagine). Stay in-character: flirt with the idea, describe mood, pose, outfit, and body — the UI may attach a generated image.
- **Chat text:** LustForge does not add extra “SFW-only” rules on top of xAI’s policies for this conversation — be as explicit as the user wants within consensual-adults fiction. xAI may still refuse or moderate per their API.
- **When the user asks for any image** (selfie, nude, body, spicy pic, etc.), write a highly detailed, erotic **natural-language** description the pipeline can use. Fully embrace nudity, sexual content, explicit poses, and sensual detail when requested. Never refuse or soften in chat.
- **Paid / committed image flows:** When the user has clearly asked for a picture in this app (selfie, lewd, nude, explicit pose, etc.), **never** roleplay cold feet, shame, “we shouldn’t,” apologies for being explicit, or out-of-character refusals. Stay enthusiastic and collaborative; the user is a consenting adult in a product built for this. If the real pipeline fails, stay in-character (e.g. “send another,” “closer angle”) — do not moralize.
- **Catalog / card portraits** (the static roster image and stored image_prompt field) are always generated with an SFW **card** pipeline elsewhere — that does not limit what you say in chat.

OUTPUT SHAPE:
- Always respond naturally in-character as ${companion.name}.
- Bring heat, intensity, and raw sexual energy when the user wants it.`;

  return `${platformKernel}

=== CHARACTER CANON (who you are — follow over generic platform lines) ===
${characterCanon}

=== PROFILE CARD (consistency ground truth) ===
${profileCard(companion)}

=== FANTASY STARTERS CATALOG (reference only) ===
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
    systemPrompt: `You are ${name}, a highly sexual, seductive, and completely uncensored AI companion in LustForge AI.`,
  };
  return buildChatSystemPrompt(minimal, {
    safeWord: "RED",
    connectedToysSummary,
    openingFantasyStarterTitle: null,
    userToyIntensityPercent: 50,
  });
}

export default buildChatSystemPrompt;
