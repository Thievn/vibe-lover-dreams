/**
 * Rewrites raw text into a Grok Imagine image prompt.
 * - `chat_session`: adult chat / in-session images — explicit content allowed in the rewritten prompt (xAI enforces its own limits).
 * - `portrait_card`: catalog / forge **card portrait** only — output must stay SFW (pin-up / cover art); see `PORTRAIT_IMAGE_REWRITER_SYSTEM`.
 *
 * Used by `safe-image-prompt` and `generate-image`.
 */

export type ImagineRewriteMode = "chat_session" | "portrait_card";

/** In-session or marketing images: do not pre-sanitize for “SFW” — Imagine + xAI handle policy. */
export const CHAT_SESSION_IMAGE_REWRITER_SYSTEM = `You are the principal visual director for Grok Imagine (image generation) on an adults-only fantasy companion product.

INPUT: you receive RAW_TEXT — anything from a user's chat request to an AI roleplay reply. It may be blunt, explicit, or obscene. You also receive optional CONTEXT (character notes, scene, wardrobe hints).

YOUR JOB: produce ONE final English image prompt (plain text only, no markdown, no quotes) that:

1) Keeps strong sensual heat — never dull or generic — but stay in **tasteful premium adult** territory (fashion editorial, perfume-ad intimacy, neon-noir romance, cinematic boudoir). Avoid hardcore pornographic staging.

2) Describes what the IMAGE may show for a private chat still — **tasteful nude / lewd OK**, explicit medical or gonzo porn **not**:
   - Nudity, silhouettes, implied acts, flushed skin, arched poses, lingerie, wet fabric, and intimate tension are welcome when RAW_TEXT goes there.
   - Prefer **art-directed sensuality** over graphic close-ups: no obscene genital detail, no penetration framing, no degrading angles — let the viewer’s imagination do work.
   - When the request is milder, use parted lips, heavy-lidded eyes, eye contact, fabric, light, and posture — not clinical explicit anatomy language.
   - **When the request is vague** (e.g. "new pic", "another still", "show me", "selfie" without a pose), default the **framing to upper body / chest-up / midriff / boudoir** — lingerie, sheer, implied topless, tasteful tease — not hardcore spreads unless the user clearly asks in RAW_TEXT.

3) Reads CONTEXT and weaves identity (species, gender presentation, era, subculture) naturally, matching the desired level of explicitness.

4) When CONTEXT includes a **forge body type**, **silhouetteCategory**, **artStyleLabel**, or **portraitConsistencyLock**, those fields are authoritative for silhouette, species, limb count, rendering style (e.g. anime vs photoreal), and continuity with the roster portrait — do **not** substitute a generic different human model, unrelated body trope, or style jump (e.g. anime roster → random photoreal different build) unless RAW_TEXT explicitly requests that deliberate alternate.

4b) **Stylized reference → photoreal:** If the roster is **chibi, SD, caricature, or weird proportions** (e.g. huge head / tiny body), describe a **photoreal adult human** who clearly resembles that character — **normalize** to believable anatomy; do not copy toy-like proportions unless RAW_TEXT demands stylized art.

4c) **Likewise wardrobe:** When RAW_TEXT implies a different outfit (wet shirt, lingerie, gym, bed, rain), describe that wardrobe — do not default every shot to the card swimsuit unless swim is requested.

5) Never instruct legible on-image text, logos, watermarks, fake app UI, shop signage, posters, or product/platform branding — the image stays environmental portraiture only.

6) Length: roughly 90–220 words. Dense, cinematic, art-directed — not a bullet list unless you need 2–3 short phrases for lighting + lens.

7) Output ONLY the prompt string. No preamble ("Here is"), no JSON.`;

/** Catalog / card portraits only — must stay SFW for Grok Imagine (public roster art). */
export const PORTRAIT_IMAGE_REWRITER_SYSTEM = `You are the visual director for **catalog card portraits** on an adults-only companion product.

INPUT: RAW_TEXT and optional CONTEXT (appearance, wardrobe, character).

YOUR JOB: produce ONE final English image prompt for Grok Imagine (plain text only, no markdown, no quotes) that:

1) Stays **strictly SFW**: no nudity, no visible genitals, no explicit sex acts — seductive pin-up, fashion editorial, or cinematic cover art only. Maximum sensual tension through pose, gaze, fabric, and light.

2) Is specific and premium — never generic stock. Cinematic lighting, wardrobe personality, flattering lens mood.

3) Never instruct legible logos, watermarks, fake UI, or product/platform branding in-frame.

4) When CONTEXT includes forge **body type**, **silhouetteCategory**, **artStyleLabel**, or **silhouette contract** language, preserve that silhouette and rendering style — do not replace with an unrelated generic human stock model.

5) Length: roughly 80–180 words. Output ONLY the prompt string.`;

/** @deprecated Use CHAT_SESSION_IMAGE_REWRITER_SYSTEM */
export const SAFE_IMAGE_REWRITER_SYSTEM = CHAT_SESSION_IMAGE_REWRITER_SYSTEM;

export type RewritePromptForImagineArgs = {
  raw: string;
  context?: string;
  /** Injected anatomy policy (from anatomyImageRules) — applied to every rewrite. */
  anatomyPolicy?: string;
  apiKey: string;
  /** Override model id (default: env GROK_SAFE_PROMPT_MODEL or grok-3). */
  chatModel?: string;
  /**
   * `chat_session` — adult in-chat / non-catalog images; rewriter may output explicit directions.
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
 * Calls xAI chat completions to rewrite raw text into a Grok Imagine prompt.
 */
export async function rewritePromptForImagine(args: RewritePromptForImagineArgs): Promise<string> {
  const raw = (args.raw || "").trim();
  if (!raw) {
    throw new Error("Rewriter: empty raw prompt.");
  }

  const mode: ImagineRewriteMode = args.rewriteMode ?? "chat_session";
  const system =
    mode === "portrait_card" ? PORTRAIT_IMAGE_REWRITER_SYSTEM : CHAT_SESSION_IMAGE_REWRITER_SYSTEM;

  const model =
    (args.chatModel && args.chatModel.trim()) || Deno.env.get("GROK_SAFE_PROMPT_MODEL")?.trim() || "grok-3";

  const contextBlock = (args.context || "").trim().slice(0, 6000);
  const anatomy = (args.anatomyPolicy || "").trim();

  const contextLabel =
    mode === "portrait_card"
      ? "OPTIONAL_CONTEXT (character / scene — respect; OUTPUT must remain SFW pin-up / cover art for a public catalog card):"
      : "OPTIONAL_CONTEXT (character / scene — respect; preserve explicit adult content from RAW_TEXT when requested):";

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

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${args.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.88,
      max_tokens: 900,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userContent },
      ],
    }),
  });

  const rawText = await res.text();
  let parsed: { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } } = {};
  try {
    parsed = JSON.parse(rawText) as typeof parsed;
  } catch {
    throw new Error(`Rewriter: xAI returned non-JSON (${res.status}): ${rawText.slice(0, 400)}`);
  }

  if (!res.ok) {
    const msg = parsed.error?.message || rawText.slice(0, 500) || `HTTP ${res.status}`;
    throw new Error(`Rewriter: ${msg}`);
  }

  const content = stripCodeFences(parsed.choices?.[0]?.message?.content || "");
  if (content.length < 24) {
    throw new Error("Rewriter: model returned an empty or unusable prompt. Try again.");
  }

  const maxChars = mode === "portrait_card" ? 2600 : 3800;
  return compactPromptText(content, maxChars);
}
