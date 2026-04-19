/**
 * Profile companion-page loop videos: Grok Imagine image-to-video.
 * Duration is mirrored in `generate-profile-loop-video` API calls.
 *
 * No app-side content moderation — the provider enforces its own rules.
 */
export const PROFILE_LOOP_VIDEO_DURATION_SECONDS = 10;

/** Shorter fallback if the full themed prompt hits provider limits. */
export const PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS = 8;

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

/** Strip control chars that can break JSON or confuse upstream parsers. */
export function sanitizePromptForVideoApi(s: string): string {
  return s
    .replace(/\u0000/g, "")
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
}

/**
 * Ultra-compact prompt when the full brief fails (oversized body, gateway HTML, etc.).
 */
export function buildMinimalProfileLoopVideoPrompt(row: Record<string, unknown>): string {
  const name = sliceStr(row.name, 80) || "Character";
  const tags = joinList(row.tags, 10, 240);
  const oneLine = sliceStr(row.appearance, 220) || sliceStr(row.tagline, 160);
  return sanitizePromptForVideoApi(
    [
      `${PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS}s vertical 9:16 seamless loop from the source still. Character: ${name}.`,
      tags ? `Themes: ${tags}.` : "",
      oneLine ? `Visual vibe: ${oneLine}` : "",
      "One cohesive motion arc; first and last frames match for looping; same camera and framing as the still; no new characters or props.",
      "Match the reference image; adult themes only if consistent with the still; provider policy applies.",
    ]
      .filter(Boolean)
      .join(" "),
  );
}

/**
 * Builds a detailed, character-specific motion brief from DB fields.
 * Kept under xAI video prompt budgets (long rows caused non-JSON / gateway errors at 8k).
 */
export function buildProfileLoopVideoPrompt(row: Record<string, unknown>): string {
  const name = sliceStr(row.name, 80) || "Character";
  const tagline = sliceStr(row.tagline, 160);
  const role = sliceStr(row.role, 56);
  const gender = sliceStr(row.gender, 40);
  const orientation = sliceStr(row.orientation, 40);
  const tags = joinList(row.tags, 12, 240);
  const kinks = joinList(row.kinks, 8, 200);
  const archetypes = joinList(row.personality_archetypes, 6, 140);
  const vibeThemes = joinList(row.vibe_theme_selections, 8, 180);
  const appearance = sliceStr(row.appearance, 320);
  const personality = sliceStr(row.personality, 260);
  const bio = sliceStr(row.bio, 180);
  const backstory = sliceStr(row.backstory, 220);
  const imagePrompt = sliceStr(row.image_prompt, 200);

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
    personality && `Personality energy (inform gesture and expression): ${personality}`,
    bio && `Bio tone: ${bio}`,
    backstory && `World / lore mood (performance flavor, not a different location): ${backstory}`,
    imagePrompt && `Portrait brief echo (mood and tease level): ${imagePrompt}`,
  ].filter(Boolean) as string[];

  const themeBlock = themeLines.join("\n");

  const body = [
    `Create a ${PROFILE_LOOP_VIDEO_DURATION_SECONDS}-second ultra-smooth vertical portrait loop video (9:16).`,
    "Same person and same overall scene as the source image: lighting, environment, and character identity. Do not invent a new character, new location, or new props that are not implied by the frame.",
    "If you show wardrobe or intimacy beats (tease, undress/redress, explicit or nude content), they must be grounded in what the still already shows or strongly implies, and the clip must return to a matching start state so the loop is seamless: first and last frames nearly identical. Examples: slowly lifting a hem or shirt then lowering it back; unbuttoning and re-buttoning; slipping a strap off and back; turning away and back to camera; a slow caress that ends where it began. The runtime allows a full tease-out and tease-back.",
    "",
    "CHARACTER CONTEXT (motion and mood only; do not replace the shot with a different scene):",
    themeBlock,
    "",
    "MOTION DIRECTION: Invent ONE cohesive performance arc that fits this character's theme, not generic idle sway. Examples: lean-in; hair tuck; soft laugh; half-smile; blowing a kiss; weight shift or sway that returns to center; fantasy beats (crown, ears, tail, wings, spell sparkles). Lewd or explicit beats are allowed when they match the character and the still, as long as the loop closes and the camera stays consistent.",
    "",
    "LOOP AND CAMERA: Seamless loop; first and last frames nearly identical; ease in and out; same camera angle, lens feel, and framing as the source image. No jump cuts, no new characters or objects, no text overlays.",
    "",
    "POLICY: The video provider enforces its own rules.",
    "",
    "Quality: cinematic lighting, high detail, smooth motion, natural skin and fabric.",
  ].join("\n");

  /** xAI video generations: stay conservative — oversized prompts correlated with empty/HTML error bodies. */
  const MAX_PROMPT_CHARS = 2800;
  const capped = body.length <= MAX_PROMPT_CHARS ? body : `${body.slice(0, MAX_PROMPT_CHARS).trimEnd()}…`;
  return sanitizePromptForVideoApi(capped);
}
