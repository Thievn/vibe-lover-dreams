import { grokVisionImageModelCandidates } from "./grokVisionModels.ts";
import {
  defaultGrokForgeParseModel,
  extractGrokAssistantText,
  grokChatCompletionRaw,
  grokSingleChatAssistantText,
} from "./xaiGrokChatRaw.ts";

export type GenerateAppearanceReferenceArgs = {
  publicImageUrl: string;
  gender?: string;
  identityAnatomyDetail?: string;
  /** Writer / forge appearance paragraph — used when vision fails or is skipped. */
  appearanceDraft?: string;
};

const MAX_OUT = 2000;

const SYSTEM =
  `You write a single dense prose paragraph for an image model's "character lock".
Rules:
- Describe ONLY permanent physical appearance: face shape, eyes, eyebrows, nose, lips, hair (style, length, color), skin tone and texture, body type and proportions, height read, species or fantasy traits (horns, tail, ears, fur, scales, wings), piercings, tattoos, scars, distinctive marks.
- Do NOT mention clothing, outfit, jewelry worn as fashion, pose, background, environment, lighting, camera, props, or story scene.
- Respect the subject's gender / anatomy presentation from the user's context; use inclusive wording; do not sexualize minors (all subjects are adults).
- Output plain prose only — no bullet lists, no markdown, no preamble.`;

function clamp(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= MAX_OUT) return t;
  return `${t.slice(0, MAX_OUT).trimEnd()}…`;
}

/**
 * Calls a Grok vision model (xAI only — same stack as Imagine / chat).
 */
async function grokVisionAppearanceParagraph(
  getEnv: (name: string) => string | undefined,
  args: { model: string; system: string; imageUrl: string; userText: string },
): Promise<string> {
  const r = await grokChatCompletionRaw({
    model: args.model,
    messages: [
      { role: "system", content: args.system },
      {
        role: "user",
        content: [
          { type: "text", text: args.userText },
          { type: "image_url", image_url: { url: args.imageUrl } },
        ],
      },
    ],
    temperature: 0.25,
    max_tokens: 700,
  });
  if (!r.ok || r.json === null) {
    throw new Error(`Grok vision HTTP ${r.status}: ${r.rawText.slice(0, 400)}`);
  }
  const t = extractGrokAssistantText(r.json).trim();
  if (!t) throw new Error("Grok vision: empty assistant content");
  return t;
}

/**
 * Builds `appearance_reference` from the portrait URL (Grok vision) or from the writer draft (Grok text-only).
 * Uses **xAI / Grok only** — no third-party model routers.
 */
export async function generateAppearanceReferenceText(
  getEnv: (name: string) => string | undefined,
  args: GenerateAppearanceReferenceArgs,
): Promise<string> {
  const url = args.publicImageUrl.trim();
  const gender = (args.gender ?? "").trim() || "adult character";
  const idAnat = (args.identityAnatomyDetail ?? "").trim().slice(0, 400);
  const draft = (args.appearanceDraft ?? "").trim().slice(0, 6000);

  const userTextParts = [
    `Gender / presentation context: ${gender}.`,
    idAnat ? `Identity / anatomy notes (keep if visible on the body): ${idAnat}` : "",
    "Study the attached image and write the paragraph per the system rules.",
  ].filter(Boolean);

  let visionText = "";
  if (url.startsWith("http")) {
    for (const model of grokVisionImageModelCandidates(getEnv)) {
      try {
        const t = await grokVisionAppearanceParagraph(getEnv, {
          model,
          system: SYSTEM,
          imageUrl: url,
          userText: userTextParts.join("\n"),
        });
        if (t.trim().length >= 40) {
          visionText = t;
          break;
        }
      } catch (e) {
        console.warn("generateAppearanceReferenceText: vision attempt failed, trying next model:", model, e);
      }
    }
  }
  if (visionText.trim().length >= 40) return clamp(visionText);

  if (!draft) {
    return clamp(
      visionText ||
        `${gender} adult-presenting companion — preserve face, hair, skin, and body-type continuity from the profile portrait when generating new outfits and scenes.`,
    );
  }

  const grokModel = defaultGrokForgeParseModel();
  try {
    const distilled = await grokSingleChatAssistantText({
      model: grokModel,
      system: SYSTEM,
      user: `Gender / presentation: ${gender}.
${idAnat ? `Identity / anatomy: ${idAnat}\n` : ""}
Writer appearance draft (strip scene, outfit, pose, and background — keep only permanent body/face/hair facts):
${draft}`,
      temperature: 0.35,
      max_tokens: 650,
    });
    const d = distilled.trim();
    if (d.length >= 40) return clamp(d);
  } catch (e) {
    console.error("generateAppearanceReferenceText: text-only distill failed:", e);
  }

  return clamp(
    visionText ||
      `${gender} adult-presenting companion — preserve face, hair, skin, and body-type continuity from the profile portrait when generating new outfits and scenes.`,
  );
}
