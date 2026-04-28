import { FORGE_BODY_IMAGINE_LEADS } from "./forgeBodyImagineLeads.ts";
import {
  DEFAULT_TENSOR_IMAGE_MODEL,
  LUSTFORGE_IMAGE_HEIGHT,
  LUSTFORGE_IMAGE_WIDTH,
  submitTensorImageJob,
  waitForTensorJobResult,
} from "./tensorClient.ts";

const DEFAULT_DENOISE = 0.45;

function tensorIdentityPhysiqueLine(bodyType: string): string {
  const t = bodyType.trim();
  if (!t) return "";
  const lead = (FORGE_BODY_IMAGINE_LEADS as Record<string, string>)[t];
  if (lead) {
    return `- Preserve silhouette consistent with this physique (visual only — never render as text): ${lead}`;
  }
  return "- Preserve silhouette from the reference; never paint category names or UI labels as typography.";
}

function buildIdentityLockBlock(characterData: Record<string, unknown>): string {
  const bodyType = String(characterData.bodyType ?? "").trim();
  const artStyle = String(characterData.artStyleLabel ?? characterData.style ?? "").trim();
  const portraitConsistencyLock = String(
    characterData.portraitConsistencyLock ?? characterData.portrait_consistency_lock ?? "",
  ).trim();
  const appearance = String(characterData.appearance ?? characterData.baseDescription ?? "").trim();

  return [
    "Identity lock:",
    "- Keep the same person as the reference image: same face structure, same skin/fur tone, and same recognizable identity.",
    "- If the reference is chibi, caricature, or exaggerated proportions: output **photoreal adult human** anatomy that preserves facial likeness — **normalize** head-to-body ratio and limbs to believable human scale unless the prompt explicitly requests stylized art.",
    "- Do **not** preserve the reference photo's clothing, swimsuit, or bikini when the prompt asks for nudity, lingerie, wet fabric, or a different outfit — match identity only; wardrobe follows the requested variation.",
    bodyType ? tensorIdentityPhysiqueLine(bodyType) : "",
    artStyle ? `- Locked render style family: ${artStyle}.` : "",
    portraitConsistencyLock ? `- Continuity lock: ${portraitConsistencyLock}` : "",
    appearance ? `- Appearance continuity hints: ${appearance.slice(0, 1500)}` : "",
    "- Allow outfit, pose, and scene changes only if identity remains unmistakably the same character.",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateConsistentCharacterImage(args: {
  apiKey: string;
  prompt: string;
  referenceImageUrl: string;
  characterData?: Record<string, unknown>;
  denoisingStrength?: number;
  model?: string;
}): Promise<{ imageUrl: string; denoisingStrength: number; model: string }> {
  const {
    apiKey,
    prompt,
    referenceImageUrl,
    characterData = {},
    model = DEFAULT_TENSOR_IMAGE_MODEL,
    denoisingStrength = DEFAULT_DENOISE,
  } = args;

  const clampedDenoise = Math.max(0.1, Math.min(0.85, denoisingStrength));
  const nsfwOk = /\b(nude|naked|nsfw|explicit|uncensored|unfiltered|porn|xxx|genital|pussy|dick|cock|penis|topless|lingerie|lewd\s*selfie|nude\s*selfie|send nudes?)\b/i.test(
    prompt,
  );
  const adultGate = nsfwOk
    ? "Adult tasteful nude or intimate framing may apply. Remove clothing from the reference when asked; match the user’s brief with **photoreal editorial sensuality** — avoid hardcore pornographic staging or graphic close-ups.\n\n"
    : "";
  const finalPrompt = `${buildIdentityLockBlock(characterData)}\n\n${adultGate}Requested variation:\n${prompt}`.trim();

  const { jobId } = await submitTensorImageJob({
    apiKey,
    model,
    prompt: finalPrompt,
    width: LUSTFORGE_IMAGE_WIDTH,
    height: LUSTFORGE_IMAGE_HEIGHT,
    referenceImageUrl,
    denoisingStrength: clampedDenoise,
  });
  const result = await waitForTensorJobResult({ apiKey, jobId });
  if (!result.imageUrl) {
    throw new Error("Tensor img2img result did not include an image URL.");
  }

  return {
    imageUrl: result.imageUrl,
    denoisingStrength: clampedDenoise,
    model,
  };
}
