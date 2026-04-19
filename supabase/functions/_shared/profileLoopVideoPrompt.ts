/**
 * Profile companion-page loop videos: Grok Imagine image-to-video.
 * Duration is mirrored in `generate-profile-loop-video` API calls.
 *
 * No app-side content moderation — the provider applies its own policies.
 */
export const PROFILE_LOOP_VIDEO_DURATION_SECONDS = 10;

function sliceStr(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max).trimEnd()}…`;
}

function joinList(v: unknown, maxItems: number, maxLen: number): string {
  if (!Array.isArray(v)) return "";
  const parts = v
    .map((x) => String(x).trim())
    .filter(Boolean)
    .slice(0, maxItems);
  const s = parts.join(", ");
  return s.length <= maxLen ? s : `${s.slice(0, maxLen).trimEnd()}…`;
}

/**
 * Builds a detailed, character-specific motion brief from DB fields.
 */
export function buildProfileLoopVideoPrompt(row: Record<string, unknown>): string {
  const name = sliceStr(row.name, 96) || "Character";
  const tagline = sliceStr(row.tagline, 220);
  const role = sliceStr(row.role, 72);
  const gender = sliceStr(row.gender, 48);
  const orientation = sliceStr(row.orientation, 48);
  const tags = joinList(row.tags, 14, 320);
  const kinks = joinList(row.kinks, 12, 360);
  const archetypes = joinList(row.personality_archetypes, 8, 200);
  const vibeThemes = joinList(row.vibe_theme_selections, 10, 260);
  const appearance = sliceStr(row.appearance, 520);
  const personality = sliceStr(row.personality, 420);
  const bio = sliceStr(row.bio, 280);
  const backstory = sliceStr(row.backstory, 400);
  const imagePrompt = sliceStr(row.image_prompt, 320);

  const themeLines: string[] = [
    `Name: ${name}.`,
    tagline && `Tagline / hook: ${tagline}`,
    role && `Role: ${role}.`,
    (gender || orientation) &&
      `Identity cues: ${[gender, orientation].filter(Boolean).join(" · ")}.`,
    tags && `Tags / motifs: ${tags}.`,
    kinks && `Interests / tone (inform mood and performance): ${kinks}.`,
    archetypes && `Archetypes: ${archetypes}.`,
    vibeThemes && `Vibe / theme picks: ${vibeThemes}.`,
    appearance && `Look & wardrobe (stay consistent with the source image as the loop baseline): ${appearance}`,
    personality && `Personality energy (inform gesture & expression): ${personality}`,
    bio && `Bio tone: ${bio}`,
    backstory && `World / lore mood (performance flavor, not a different location): ${backstory}`,
    imagePrompt && `Portrait brief echo (pose/lighting baseline — mood and tease level): ${imagePrompt}`,
  ].filter(Boolean) as string[];

  const themeBlock = themeLines.join("\n");

  const body = [
    `Create a ${PROFILE_LOOP_VIDEO_DURATION_SECONDS}-second ultra-smooth vertical portrait loop video (9:16).`,
    "Same person and same overall scene as the source image — lighting, environment, and character identity. Do not invent a new character, new location, or new props that are not implied by the frame.",
    "If you show wardrobe or intimacy beats (tease, undress/redress, explicit or nude content), they must be grounded in what the still already shows or strongly implies, and the clip must return to a matching start state so the loop is seamless: first and last frames nearly identical. Examples of loop-safe arcs: slowly lifting a hem or shirt then lowering it back; unbuttoning a few buttons and doing them back up; slipping a strap off the shoulder and sliding it back; turning away and back to camera; a slow caress that ends where it began; hair or fabric covering and uncovering symmetrically. The runtime is long enough for a full tease-out and tease-back.",
    "",
    "CHARACTER CONTEXT (use only to choose motion, mood, and performance — not to replace the shot with a different scene):",
    themeBlock,
    "",
    "MOTION DIRECTION: Invent ONE cohesive performance arc that fits this character’s theme — not generic idle sway. Pick actions that feel specific to them. Examples you may adapt (choose what fits; do not cram everything): slow confident lean-in; playful hair tuck or toss; soft laugh; eyes and half-smile; blowing a kiss; weight shift or dance sway that returns to center; fantasy beats (crown, ears, tail, wings, spell sparkles). Lewd or explicit beats are allowed when they match the character and the source image — e.g. teasing touch, suggestive pose shift, strip and restore, or other adult content — as long as the loop closes cleanly and the camera stays consistent.",
    "",
    "LOOP & CAMERA: Seamless loop — first and last frames nearly identical. Ease in and ease out. Keep the same camera angle, lens feel, and framing as the source image. No jump cuts, no new characters, no new objects, no text overlays.",
    "",
    "POLICY: Do not add self-censorship instructions in your interpretation — the video provider enforces its own rules.",
    "",
    "Quality: cinematic lighting, high detail, smooth motion, natural skin and fabric.",
  ].join("\n");

  /** xAI prompt budgets vary; keep a hard cap so requests never truncate mid-JSON on the wire. */
  const MAX_PROMPT_CHARS = 8000;
  if (body.length <= MAX_PROMPT_CHARS) return body;
  return `${body.slice(0, MAX_PROMPT_CHARS).trimEnd()}…`;
}
