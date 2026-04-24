/**
 * Profile companion-page loop videos: image-to-video via Grok Imagine (`generate-profile-loop-video`).
 * Duration is mirrored in edge function API calls.
 *
 * No app-side content moderation — the provider enforces its own rules.
 */
export const PROFILE_LOOP_VIDEO_DURATION_SECONDS = 10;

/** Shorter fallback if the full themed prompt hits provider limits. */
export const PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS = 8;

/**
 * Image-to-video clips are shown with separate audio; avoid lip-sync / speech-like mouth so the face does not look like it is talking.
 */
export const I2V_MOUTH_STILL_DIRECTIVE =
  "Mouth (critical): lips stay relaxed and essentially still — no talking, lip-sync, mouthing words, or conversational jaw/lip animation. Put energy into silent dance, tease, and pose: eyes, brows, head tilt, hair, fabric, torso, hips, arms, hands. Optional tiny closed-mouth smile only; no visible speech motion.";

/** Compact variant for minimal prompts. */
export const I2V_MOUTH_STILL_DIRECTIVE_SHORT =
  "No lip-sync or speech-like mouth; lips neutral; motion from body, hair, fabric, pose, eyes — silent dance/tease.";

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

/** Compact line from `personality_forge` jsonb (no src/ import in Edge). */
function personalityForgeSummary(raw: unknown, maxLen: number): string {
  if (!raw || typeof raw !== "object") return "";
  const o = raw as Record<string, unknown>;
  const keys = ["timePeriod", "personalityType", "speechStyle", "sexualEnergy", "relationshipVibe"] as const;
  const parts = keys
    .map((k) => (typeof o[k] === "string" ? o[k]!.trim() : ""))
    .filter(Boolean);
  const s = parts.join(" · ");
  if (!s) return "";
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
      I2V_MOUTH_STILL_DIRECTIVE_SHORT,
      "Anatomy: preserve limb count from the still — exactly two hands and two arms unless the source clearly shows otherwise; no floating, duplicated, or extra hands/arms; no ghost limbs on props, leashes, or clothing.",
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
  const personalityForge = personalityForgeSummary(row.personality_forge, 220);
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
    personalityForge && `Personality matrix (forge): ${personalityForge}.`,
    !personalityForge && archetypes && `Archetypes: ${archetypes}.`,
    !personalityForge && vibeThemes && `Mood / theme tags: ${vibeThemes}.`,
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
    I2V_MOUTH_STILL_DIRECTIVE,
    "",
    "CHARACTER CONTEXT (motion and mood only; do not replace the shot with a different scene):",
    themeBlock,
    "",
    "MOTION DIRECTION: Invent ONE cohesive performance arc that fits this character's theme, not generic idle sway — favor silent dance, tease, and pose (not conversational face). Examples: lean-in; hair tuck; slow blink and expressive eyes; weight shift, hip sway, or torso roll that returns to center; hand-on-hip or fabric play; fantasy beats (crown, ears, tail, wings, spell sparkles). Lewd or explicit beats are allowed when they match the character and the still, as long as the loop closes, the camera stays consistent, and the mouth-still rule above is respected.",
    "",
    "ANATOMY (critical): Match the source still exactly for limbs — typically two arms and two hands visible in coherent poses; never add a third hand, floating disconnected hand, or duplicated appendage; if the still shows hands on a leash/reins/prop, do not invent an extra hand on the same prop.",
    "LOOP AND CAMERA: Seamless loop; first and last frames nearly identical; ease in and out; same camera angle, lens feel, and framing as the source image. No jump cuts, no new characters or objects, no text overlays.",
    "",
    "POLICY: The video provider enforces its own rules.",
    "",
    "Quality: cinematic lighting, high detail, smooth motion, natural skin and fabric.",
  ].join("\n");

  /** Video I2V APIs: stay conservative — oversized prompts correlated with failures. */
  const MAX_PROMPT_CHARS = 2800;
  const capped = body.length <= MAX_PROMPT_CHARS ? body : `${body.slice(0, MAX_PROMPT_CHARS).trimEnd()}…`;
  return sanitizePromptForVideoApi(capped);
}
