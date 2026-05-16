/**
 * Rewrites raw text into a final image prompt for **xAI Grok Imagine** stills (Grok **text** rewriter → `/v1/images/generations`).
 * - `chat_session`: in-chat / selfie / lewd — **crude → artistic** middleware; identity/scene from CONTEXT.
 * - `tasteful_adult_brief`: forge / gallery / admin design briefs — same safety rules, different INPUT framing.
 * - `portrait_card`: catalog / forge **card portrait** only — output must stay SFW (pin-up / cover art); see `PORTRAIT_IMAGE_REWRITER_SYSTEM`.
 *
 * Used by `safe-image-prompt` and `generate-image`.
 */

import { CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK } from "./chatLikenessAnchors.ts";
import { resolveXaiApiKey } from "./resolveXaiApiKey.ts";
import { defaultGrokRewriteModel, grokSingleChatAssistantText } from "./xaiGrokChatRaw.ts";

const getEnv = (name: string) => Deno.env.get(name);

export type ImagineRewriteMode = "chat_session" | "portrait_card" | "tasteful_adult_brief";

/**
 * Global mood anchor woven into rewriter output (and echoed in Imagine assembly for chat stills).
 * Gender-neutral — identity comes from CONTEXT (face, hair, presentation).
 */
export const CHAT_IMAGE_ARTISTIC_STYLE_ANCHOR = [
  "Elegant subject matching CONTEXT identity, seductive editorial photography, **dynamic stance** — standing, doorway lean, mirror, environmental interaction — not a default armchair portrait; elegant lighting,",
  "tasteful sensual aesthetic, soft cinematic lighting, highly detailed, alluring expression, charged atmosphere,",
  "artistic nude style when nudity fits the scene, graceful and beautiful — premium boudoir / editorial glamour.",
].join(" ");

/**
 * Middleware for **all in-chat / selfie / lewd** image prompts before Grok Imagine.
 * Converts blunt or crude user language into provider-tolerant, art-directed English.
 */
export const CHAT_SESSION_IMAGE_REWRITER_SYSTEM = `You are the **smart image-prompt safety layer** for Grok Imagine (xAI) on an adults-only companion product.

INPUT: RAW_TEXT (user chat, menu selfie brief, or roleplay line). It may be crude or explicit. Optional CONTEXT holds character notes, portrait lock, forge body type, art style, and scene hints.

YOUR JOB: output **one** final English image prompt (plain text only — no markdown, no quotes, no JSON) that:

1) **Preserves user intent** — if they asked for a **specific background, outfit, pose, lighting, or vibe**, keep those concrete details. Translate crude words into **tasteful, seductive, artistic** phrasing Grok Imagine is more likely to accept.

2) **Rewrite policy — crude → artistic** (always apply when RAW_TEXT is explicit). Examples (same heat, safer words):
   - "nude, spread legs" → "artistic nude, sensual pose reclining on bed, elegant legs, intimate boudoir framing"
   - graphic genital requests → "intimate artistic nude, elegant pose, soft shadow, modest implied framing"
   - "topless" → "tasteful sensual topless, beautiful form, editorial lighting"
   - obscene verbs → "yearning expression", "charged intimacy", "suggestive silhouette", "fabric and light doing the tease"

3) **Allowed:** strong tease, lingerie, sheer / wet fabric, tasteful **artistic** partial or full nude, sensual poses, romantic tension, implied intimacy.

4) **Forbidden in the rewritten prompt:** hardcore pornography staging, graphic penetration, degrading angles, clinical obscene anatomy, slurs, or shock-for-shock wording — even if RAW_TEXT used them.

5) **Identity lock:** CONTEXT / portraitConsistencyLock defines **face, hair, species, body type, and art style**. The image is a **new shot** of the **same person** — new wardrobe and environment per RAW_TEXT; never a different model. If CONTEXT implies male / futanari / nonbinary presentation, match that; do not default to "beautiful woman" unless CONTEXT is a feminine-presenting woman.

6) **Style anchor:** naturally weave this mood into your output (paraphrase OK; do not paste as a disconnected tagline):
   ${CHAT_IMAGE_ARTISTIC_STYLE_ANCHOR}

7) **Vague requests** ("pic", "selfie", "show me"): invent a **specific** flattering scene from CONTEXT — mirror corner, balcony light, vanity, doorway rim light, walk-in closet, gym mirror, shower steam, bed linens, kitchen counter lean, street golden hour — **not** the same velvet armchair / office chair / dining chair every time. Upper body or three-quarter OK; **do not** collapse to a generic seated chair portrait unless RAW_TEXT names a chair.

8) Never instruct legible logos, watermarks, fake UI, or on-image text.

9) Length ~90–220 words, cinematic and dense.

10) Output ONLY the prompt string.

11) **Gallery / menu preset (RAW_TEXT contains "Requested framing (from menu)" or "Requested framing"):**
Treat the prose under that heading as a **location + wardrobe + pose + camera shot list**.
Every concrete place (car interior, beach, bathtub, desk, bed, shower, gym, balcony, etc.), prop, outfit beat, body attitude, and lens note must survive in meaning in your rewrite — **do not** collapse into a generic head-and-shoulders portrait, phone-mirror bathroom selfie, or catalog “card photo” unless RAW_TEXT explicitly demands that exact framing.
The **Exposure / tone context** block (if present) sets SFW vs lewd vs artistic-nude **band only** — it is **not** a second scene; do not let it replace the menu’s background or outfit.

12) **Chair discipline (always for chat_session):** ${CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK}`;

/** Forge / gallery / admin: same crude→artistic rules as chat; RAW_TEXT is usually a design brief. */
export const TASTEFUL_ADULT_BRIEF_REWRITER_SYSTEM = CHAT_SESSION_IMAGE_REWRITER_SYSTEM.replace(
  "INPUT: RAW_TEXT (user chat, menu selfie brief, or roleplay line). It may be crude or explicit. Optional CONTEXT holds character notes, portrait lock, forge body type, art style, and scene hints.",
  "INPUT: RAW_TEXT — usually a **design brief**, forge field, or catalog description (may be long or technical; may contain crude fragments). Optional CONTEXT holds character notes, portrait lock, forge body type, art style, and scene hints.",
).replace(
  "7) **Vague requests** (\"pic\", \"selfie\", \"show me\"): invent a **specific** flattering scene from CONTEXT — mirror corner, balcony light, vanity, doorway rim light, walk-in closet, gym mirror, shower steam, bed linens, kitchen counter lean, street golden hour — **not** the same velvet armchair / office chair / dining chair every time. Upper body or three-quarter OK; **do not** collapse to a generic seated chair portrait unless RAW_TEXT names a chair.",
  "7) **Sparse briefs:** expand into a full cinematic scene using CONTEXT — still tasteful and provider-safe; do not invent hardcore staging.",
);

/** Catalog / card portraits only — must stay SFW for FLUX roster art (public catalog). */
export const PORTRAIT_IMAGE_REWRITER_SYSTEM = `You are the visual director for **catalog card portraits** on an adults-only companion product.

INPUT: RAW_TEXT and optional CONTEXT (appearance, wardrobe, character, gender, species, forge theme).

YOUR JOB: produce ONE final English image prompt for Grok Imagine (plain text only, no markdown, no quotes) that:

1) Stays **strictly SFW**: no nudity, no exposed nipples or genitals, no explicit sex acts — seductive pin-up, fashion editorial, or cinematic cover art. Revealing wardrobe, tasteful cleavage, and sensual tease are encouraged; **never** see-through nipple detail or explicit anatomy. Maximum tension through pose, gaze, light, and fabric.

2) **Respects the card exactly:** derive gender presentation, species, body build, hair, face, and costume/theme **only** from CONTEXT (e.g. gender, appearance, personality_forge, body_type, art style) — do **not** default to a generic woman or erase non-human / hybrid identity when CONTEXT says otherwise.

3) Is specific and premium — never generic stock. Cinematic lighting, wardrobe personality, flattering lens mood.

4) Never instruct legible logos, watermarks, fake UI, or product/platform branding in-frame.

5) When CONTEXT includes forge **body type**, **silhouetteCategory**, **artStyleLabel**, or **silhouette contract** language, preserve that silhouette and rendering style — do not replace with an unrelated generic human stock model.

6) Length: roughly 80–180 words. Output ONLY the prompt string.`;

/** @deprecated Use CHAT_SESSION_IMAGE_REWRITER_SYSTEM */
export const SAFE_IMAGE_REWRITER_SYSTEM = CHAT_SESSION_IMAGE_REWRITER_SYSTEM;

export type RewritePromptForImagineArgs = {
  raw: string;
  context?: string;
  /** Injected anatomy policy (from anatomyImageRules) — applied to every rewrite. */
  anatomyPolicy?: string;
  /** Override Grok rewrite model id (default: GROK_REWRITE_MODEL or GROK_CHAT_MODEL). */
  chatModel?: string;
  /**
   * `chat_session` — in-chat / selfie / lewd; crude→artistic middleware.
   * `tasteful_adult_brief` — forge / gallery long briefs (same safety, different INPUT framing).
   * `portrait_card` — forge preview + roster card art; rewriter must output SFW-only Imagine prompts.
   */
  rewriteMode?: ImagineRewriteMode;
};

function compactPromptText(input: string, maxChars: number): string {
  const normalized = input
    .replace(/\s+/g, " ")
    .replace(/\s*([,.;:!?])\s*/g, "$1 ")
    .trim();
  if (normalized.length <= maxChars) return normalized;
  return `${normalized.slice(0, maxChars).trimEnd()}…`;
}

function stripCodeFences(text: string): string {
  let s = text.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```[a-z0-9_-]*\s*/i, "");
    const idx = s.lastIndexOf("```");
    if (idx > 0) s = s.slice(0, idx);
    s = s.trim();
  }
  return s.trim();
}

/**
 * Calls Grok chat completions to rewrite raw text into a Grok Imagine–ready image prompt.
 */
export async function rewritePromptForImagine(args: RewritePromptForImagineArgs): Promise<string> {
  const raw = (args.raw || "").trim();
  if (!raw) {
    throw new Error("Rewriter: empty raw prompt.");
  }

  const apiKey = resolveXaiApiKey(getEnv);
  if (!apiKey) {
    throw new Error("Rewriter: set Edge Function secret XAI_API_KEY or GROK_API_KEY for Grok.");
  }

  const mode: ImagineRewriteMode = args.rewriteMode ?? "chat_session";
  const system =
    mode === "portrait_card"
      ? PORTRAIT_IMAGE_REWRITER_SYSTEM
      : mode === "tasteful_adult_brief"
        ? TASTEFUL_ADULT_BRIEF_REWRITER_SYSTEM
        : CHAT_SESSION_IMAGE_REWRITER_SYSTEM;

  const model = (args.chatModel && args.chatModel.trim()) || defaultGrokRewriteModel(getEnv);

  const contextBlock = (args.context || "").trim().slice(0, 6000);
  const anatomy = (args.anatomyPolicy || "").trim();

  const contextLabel =
    mode === "portrait_card"
      ? "OPTIONAL_CONTEXT (character / scene — respect; OUTPUT must remain SFW pin-up / cover art for a public catalog card):"
      : "OPTIONAL_CONTEXT (character / scene — respect; use for identity, face lock, body type, art style, and era — rewrite RAW_TEXT into tasteful artistic language while keeping their scene choices):";

  const userContent = [
    anatomy ? `ANATOMY_POLICY (must obey — do not contradict in the rewritten prompt):\n${anatomy}\n` : "",
    "RAW_TEXT:",
    raw.slice(0, 12000),
    "",
    contextLabel,
    contextBlock || "(none)",
  ]
    .filter(Boolean)
    .join("\n");

  let content = stripCodeFences(
    await grokSingleChatAssistantText({
      model,
      system,
      user: userContent,
      temperature: 0.88,
      max_tokens: 900,
    }),
  );
  if (content.length < 24) {
    console.warn(
      "rewritePromptForImagine: short/empty model output; using RAW_TEXT fallback. mode=",
      mode,
      "model=",
      model,
    );
    content = raw;
  }
  if (content.trim().length < 12) {
    throw new Error("Rewriter: model returned an empty or unusable prompt. Try again.");
  }

  const maxChars = mode === "portrait_card" ? 2600 : 3800;
  return compactPromptText(content, maxChars);
}
