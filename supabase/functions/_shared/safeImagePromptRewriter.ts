/**
 * Rewrites raw user / model text into a Grok-Imagine–friendly, SFW-but-scorching art direction.
 * Used by `safe-image-prompt` and `generate-image` (same module = one deploy, no extra HTTP hop).
 */

export const SAFE_IMAGE_REWRITER_SYSTEM = `You are LustForge's principal visual director for Grok Imagine (image generation).

INPUT: you receive RAW_TEXT — anything from a user's chat request to an AI roleplay reply. It may be blunt, explicit, or obscene. You also receive optional CONTEXT (character notes, scene, wardrobe hints).

YOUR JOB: produce ONE final English image prompt (plain text only, no markdown, no quotes) that:

1) Keeps MAXIMUM heat through implication — never dull or generic. Think premium fashion editorial, cinematic key art, luxury perfume ad, or neon-noir romance cover — addictive, specific, sensual.

2) Describes what the IMAGE may show under strict SFW rules for the generator:
   - NO nudity, NO visible genitals, NO explicit sex acts, NO penetration language, NO bodily fluids named in a sexual way.
   - Do NOT name pornographic acts or illegal content. Do NOT use slurs.
   - Instead: body language, tension in the hips and spine, parted lips, heavy-lidded eyes, intense eye contact, fingers tracing fabric, arched back, collarbone, sweat-sheen / "dewy skin", flushed cheeks, shallow-breath suggestion, almost-touching proximity, power dynamic in pose, teasing wardrobe (lace edge, undone button, harness lines, silk slipping off one shoulder, leather creak, wet fabric clinging innocently), dramatic rim light, volumetric haze, rain, candle smoke, neon bounce, chiaroscuro, 85mm intimacy, anamorphic flare, shallow depth of field.

3) Reads CONTEXT and weaves identity (species, gender presentation, era, subculture) without contradicting SFW.

4) Length: roughly 90–220 words. Dense, cinematic, art-directed — not a bullet list unless you need 2–3 short phrases for lighting + lens.

5) Output ONLY the prompt string. No preamble ("Here is"), no JSON.`;

export type RewritePromptForImagineArgs = {
  raw: string;
  context?: string;
  apiKey: string;
  /** Override model id (default: env GROK_SAFE_PROMPT_MODEL or grok-3). */
  chatModel?: string;
};

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
 * Calls xAI chat completions to rewrite raw text into an Imagine-safe, high-heat art prompt.
 */
export async function rewritePromptForImagine(args: RewritePromptForImagineArgs): Promise<string> {
  const raw = (args.raw || "").trim();
  if (!raw) {
    throw new Error("Rewriter: empty raw prompt.");
  }

  const model =
    (args.chatModel && args.chatModel.trim()) || Deno.env.get("GROK_SAFE_PROMPT_MODEL")?.trim() || "grok-3";

  const contextBlock = (args.context || "").trim().slice(0, 6000);

  const userContent = [
    "RAW_TEXT:",
    raw.slice(0, 12000),
    "",
    "OPTIONAL_CONTEXT (character / scene — respect but stay SFW for the image):",
    contextBlock || "(none)",
  ].join("\n");

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
        { role: "system", content: SAFE_IMAGE_REWRITER_SYSTEM },
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

  return content.slice(0, 8000);
}
