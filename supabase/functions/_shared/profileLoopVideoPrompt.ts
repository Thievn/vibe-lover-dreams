import {
  buildAnimeTemptationStyleLead,
  FORGE_ANIME_STYLE_LOCK_REGEX,
  isAnimeTemptationForgeTabId,
} from "./forgeAnimeStyleDna.ts";

/**
 * Shared helpers for Grok Imagine image-to-video.
 *
 * - **Companion profile page loops** (`generate-profile-loop-video`): use
 *   {@link buildProfilePageLoopVideoPrompt} + {@link profilePageLoopMotionNotesViolatePolicy}
 *   (tasteful style lock + blocked-word filter on user notes only).
 * - **Chat clip videos** (`generate-chat-companion-video`): use {@link buildProfileLoopVideoPrompt}
 *   (richer character context; different policy envelope).
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

/** Active forge tab + pose from persisted theme snapshot (V2 or legacy V1). */
function readActiveForgeTabFromPersonalityForge(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const r = raw as Record<string, unknown>;
  const inner = (r._forgeThemeV2 ?? r._forgeThemeV1) as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== "object") return "";
  const t = inner.activeForgeTab;
  return typeof t === "string" ? t.trim() : "";
}

function forgeThemeSnapshotSummary(raw: unknown, maxLen: number): string {
  if (!raw || typeof raw !== "object") return "";
  const root = raw as Record<string, unknown>;
  const snap = (root._forgeThemeV2 ?? root._forgeThemeV1) as Record<string, unknown> | undefined;
  if (!snap || typeof snap !== "object") return "";
  const tab = typeof snap.activeForgeTab === "string" ? snap.activeForgeTab.trim() : "";
  const pose = typeof snap.forgeCardPose === "string" ? snap.forgeCardPose.trim() : "";
  const art = typeof snap.artStyle === "string" ? snap.artStyle.trim() : "";
  const scene = typeof snap.sceneAtmosphere === "string" ? snap.sceneAtmosphere.trim() : "";
  const parts = [
    tab && `active forge tab "${tab}"`,
    pose && `card pose ${pose}`,
    art && `art ${art}`,
    scene && `scene ${scene}`,
  ].filter(Boolean);
  const s = parts.join("; ");
  if (!s) return "";
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

/** Admin / editor typed motion — server-capped; must dominate generic motion prose. */
const EDITOR_MOTION_MAX_FULL = 800;
const EDITOR_MOTION_MAX_MINIMAL = 600;

function editorMotionBlockFull(notes: string | undefined): string {
  const t = (notes ?? "").trim();
  if (!t) return "";
  const clipped = t.length > EDITOR_MOTION_MAX_FULL ? `${t.slice(0, EDITOR_MOTION_MAX_FULL).trimEnd()}…` : t;
  return [
    "**EDITOR_DIRECTIVES (MANDATORY — highest priority over every generic line below, including MOTION DIRECTION examples):**",
    clipped,
    "Realize these directives in gesture timing, body motion, pacing, and camera unless they require a different person, props not visible in the still, or breaking the mouth-still rule.",
    "If EDITOR_DIRECTIVES conflict with generic 'invent one arc' language, **obey EDITOR_DIRECTIVES.**",
  ].join("\n");
}

function editorMotionPrefixMinimal(notes: string | undefined): string {
  const t = (notes ?? "").trim();
  if (!t) return "";
  const clipped = t.length > EDITOR_MOTION_MAX_MINIMAL ? `${t.slice(0, EDITOR_MOTION_MAX_MINIMAL).trimEnd()}…` : t;
  return `MANDATORY editor motion (highest priority): ${clipped}. `;
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
export function buildMinimalProfileLoopVideoPrompt(
  row: Record<string, unknown>,
  editorMotionNotes?: string,
): string {
  const name = sliceStr(row.name, 80) || "Character";
  const tags = joinList(row.tags, 10, 240);
  const oneLine = sliceStr(row.appearance, 220) || sliceStr(row.tagline, 160);
  const activeTab = readActiveForgeTabFromPersonalityForge(row.personality_forge);
  const animePrefix =
    isAnimeTemptationForgeTabId(activeTab) && !FORGE_ANIME_STYLE_LOCK_REGEX.test(oneLine)
      ? `${buildAnimeTemptationStyleLead("preview")} `
      : "";
  const editorPfx = editorMotionPrefixMinimal(editorMotionNotes);
  return sanitizePromptForVideoApi(
    [
      animePrefix,
      editorPfx,
      `${PROFILE_LOOP_VIDEO_FALLBACK_DURATION_SECONDS}s vertical 2:3 seamless loop from the source still. Character: ${name}.`,
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
export function buildProfileLoopVideoPrompt(row: Record<string, unknown>, editorMotionNotes?: string): string {
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
  const forgeThemeDna = forgeThemeSnapshotSummary(row.personality_forge, 260);
  const appearance = sliceStr(row.appearance, 320);
  const personality = sliceStr(row.personality, 260);
  const bio = sliceStr(row.bio, 180);
  const backstory = sliceStr(row.backstory, 220);
  const imagePrompt = sliceStr(row.image_prompt, 200);
  const identityAnat = typeof row.identity_anatomy_detail === "string" ? row.identity_anatomy_detail.trim() : "";
  const identityAnatLine =
    identityAnat === "pre_op"
      ? "Anatomy presentation: pre-op (stay consistent with identity through the loop)."
      : identityAnat === "post_op"
        ? "Anatomy presentation: post-op (stay consistent with identity through the loop)."
        : identityAnat === "futa"
          ? "Anatomy presentation: futa fantasy (consistent tease, no explicit genital detail; mouth-still rules apply)."
          : "";

  const themeLines: string[] = [
    `Name: ${name}.`,
    tagline && `Tagline / hook: ${tagline}`,
    role && `Role: ${role}.`,
    (gender || orientation) &&
      `Identity cues: ${[gender, orientation].filter(Boolean).join(" · ")}.`,
    identityAnatLine,
    tags && `Tags / motifs: ${tags}.`,
    kinks && `Interests / tone (inform mood and performance): ${kinks}.`,
    personalityForge && `Personality matrix (forge): ${personalityForge}.`,
    forgeThemeDna && `Forge theme DNA (tabs / pose / render): ${forgeThemeDna}.`,
    !personalityForge && archetypes && `Archetypes: ${archetypes}.`,
    !personalityForge && vibeThemes && `Mood / theme tags: ${vibeThemes}.`,
    appearance && `Look & wardrobe (stay consistent with the source image as the loop baseline): ${appearance}`,
    personality && `Personality energy (inform gesture and expression): ${personality}`,
    bio && `Bio tone: ${bio}`,
    backstory && `World / lore mood (performance flavor, not a different location): ${backstory}`,
    imagePrompt && `Portrait brief echo (mood and tease level): ${imagePrompt}`,
  ].filter(Boolean) as string[];

  const themeBlock = themeLines.join("\n");

  const editorBlock = editorMotionBlockFull(editorMotionNotes);
  const hasEditor = Boolean((editorMotionNotes ?? "").trim());

  const body = [
    `Create a ${PROFILE_LOOP_VIDEO_DURATION_SECONDS}-second ultra-smooth vertical portrait loop video (2:3).`,
    "Same person and same overall scene as the source image: lighting, environment, and character identity. Do not invent a new character, new location, or new props that are not implied by the frame.",
    editorBlock ? `${editorBlock}\n` : "",
    "If you show wardrobe or intimacy beats (tease, undress/redress, explicit or nude content), they must be grounded in what the still already shows or strongly implies, and the clip must return to a matching start state so the loop is seamless: first and last frames nearly identical. Examples: slowly lifting a hem or shirt then lowering it back; unbuttoning and re-buttoning; slipping a strap off and back; turning away and back to camera; a slow caress that ends where it began. The runtime allows a full tease-out and tease-back.",
    "",
    I2V_MOUTH_STILL_DIRECTIVE,
    "",
    "CHARACTER CONTEXT (motion and mood only; do not replace the shot with a different scene):",
    themeBlock,
    "",
    hasEditor
      ? "MOTION DIRECTION: **Execute EDITOR_DIRECTIVES above as the primary performance arc** (gesture, pacing, camera). The bullets below are secondary safety rails only — loop closure, identity lock, mouth-still, no new props."
      : "MOTION DIRECTION: Invent ONE cohesive performance arc that fits this character's theme, not generic idle sway — favor silent dance, tease, and pose (not conversational face). Examples: lean-in; hair tuck; slow blink and expressive eyes; weight shift, hip sway, or torso roll that returns to center; hand-on-hip or fabric play; fantasy beats (crown, ears, tail, wings, spell sparkles). Lewd or explicit beats are allowed when they match the character and the still, as long as the loop closes, the camera stays consistent, and the mouth-still rule above is respected.",
    hasEditor
      ? "Secondary examples (use only if compatible with EDITOR_DIRECTIVES): lean-in; hair tuck; weight shift returning to center; fabric play; small fantasy flourishes already implied by the still."
      : "",
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
  const activeTab = readActiveForgeTabFromPersonalityForge(row.personality_forge);
  const animePrefix =
    isAnimeTemptationForgeTabId(activeTab) && !FORGE_ANIME_STYLE_LOCK_REGEX.test(body)
      ? `${buildAnimeTemptationStyleLead("preview")}\n\n`
      : "";
  const rawOut = animePrefix + body;
  const capped = rawOut.length <= MAX_PROMPT_CHARS ? rawOut : `${rawOut.slice(0, MAX_PROMPT_CHARS).trimEnd()}…`;
  return sanitizePromptForVideoApi(capped);
}

// ─── Profile **page** loop only (`generate-profile-loop-video`) ─────────────────

/** Style and safety envelope for profile looping video (I2V). Always SFW — suggestive and elegant only. */
export const PROFILE_PAGE_LOOP_STYLE_DIRECTIVE =
  "Generate a beautiful, artistic, SFW-but-seductive vertical loop from the reference portrait. **No nudity, no explicit sexual content, no visible genitals, no pornographic staging.** Stay fully clothed or modestly covered with tasteful sheer or silhouette only when the still already implies it — never escalate beyond elegant tease. The tone is sensual, cinematic, and high-class: graceful movement, smoldering eyes, slow fabric or hair motion, confident posture. Focus on artistic beauty and suggestion, not adult explicitness.";

/** Blocked in **user-supplied** motion / custom instructions for profile loops (substring match, case-insensitive). */
export const PROFILE_PAGE_LOOP_BLOCKED_SUBSTRINGS = [
  "pussy",
  "vagina",
  "cock",
  "dick",
  "penis",
  "asshole",
  "cum",
  "creampie",
  "ahegao",
  "hardcore",
  "explicit",
  "porn",
] as const;

/** Returns an error message for the client/API if notes violate the profile-loop word list. */
export function profilePageLoopMotionNotesViolatePolicy(notes: string): string | null {
  const t = notes.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const w of PROFILE_PAGE_LOOP_BLOCKED_SUBSTRINGS) {
    if (lower.includes(w)) {
      return `Instructions can't include disallowed wording (“${w}”). Keep requests tasteful and suggestive only.`;
    }
  }
  return null;
}

/**
 * Profile Discover / companion page looping MP4 — single controlled style directive + optional user notes.
 */
export function buildProfilePageLoopVideoPrompt(
  row: Record<string, unknown>,
  editorMotionNotes?: string,
): string {
  const name = sliceStr(row.name, 80) || "Character";
  const tagline = sliceStr(row.tagline, 140);
  const notes = (editorMotionNotes ?? "").trim();
  const notesBlock = notes
    ? `ADDITIONAL CREATIVE DIRECTION (user request — **SFW only**: tasteful, elegant, suggestive; no nudity, no explicit acts, no graphic anatomy):\n${
        notes.length > 800 ? `${notes.slice(0, 800).trimEnd()}…` : notes
      }`
    : "No additional user direction — derive subtle motion from the reference portrait only (SFW, tasteful, suggestive).";
  return sanitizePromptForVideoApi(
    [
      PROFILE_PAGE_LOOP_STYLE_DIRECTIVE,
      "",
      "MANDATORY — SFW only: suggestive and artistic tease is allowed; **no nudity**, **no explicit sexual content**, **no visible genitals**; stay elegant, clothed, or modest silhouette only as already implied by the still.",
      "",
      notesBlock,
      "",
      `IDENTITY LOCK: same person and scene as the reference still. Context: ${name}.` +
        (tagline ? ` Hook: ${tagline}` : ""),
      "",
      `Format: vertical 2:3, about ${PROFILE_LOOP_VIDEO_DURATION_SECONDS}s, seamless loop (start and end frames align), same camera and environment as the still, cinematic lighting.`,
      "",
      I2V_MOUTH_STILL_DIRECTIVE,
      "",
      "No text overlays or watermarks. Do not add unrelated characters or objects.",
    ].join("\n"),
  );
}

/** Shorter fallback if the full profile-page prompt exceeds upstream limits. */
export function buildMinimalProfilePageLoopVideoPrompt(
  row: Record<string, unknown>,
  editorMotionNotes?: string,
): string {
  const name = sliceStr(row.name, 60) || "Character";
  const notes = (editorMotionNotes ?? "").trim();
  const clipped = notes.length > 500 ? `${notes.slice(0, 500).trimEnd()}…` : notes;
  return sanitizePromptForVideoApi(
    [
      PROFILE_PAGE_LOOP_STYLE_DIRECTIVE,
      clipped ? `User notes: ${clipped}` : "",
      `${name}. ${PROFILE_LOOP_VIDEO_DURATION_SECONDS}s vertical 2:3 seamless loop from the still. ${I2V_MOUTH_STILL_DIRECTIVE_SHORT}`,
    ]
      .filter(Boolean)
      .join(" "),
  );
}
