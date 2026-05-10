/** Deno copy — keep in sync with `src/lib/characterReferenceImagePrompt.ts`. */

export const IMAGINE_QUALITY_POSITIVE_LINE =
  "masterpiece, best quality, ultra detailed, sharp focus, beautiful cinematic lighting, highly detailed skin texture, 8k";

export const IMAGINE_QUALITY_NEGATIVE_LINE =
  "deformed, extra limbs, extra fingers, fused fingers, mutated hands, poorly drawn hands, bad anatomy, bad proportions, extra arms, extra legs, mutated limbs, blurry, low quality, deformed face, bad face, duplicate limbs, missing limbs, watermark, text, logo";

export const CHARACTER_REFERENCE_INTRO_LINES = [
  "CHARACTER REFERENCE (read first — identity lock):",
  "Use this exact character's physical appearance as strong reference (the paragraph below).",
  "Do not swap models, do not invent a new face, do not change ethnicity or species away from this lock.",
].join("\n");

export function enrichImaginePromptUniversal(o: {
  corePrompt: string;
  characterReference?: string | null;
}): string {
  const ref = o.characterReference?.replace(/\s+/g, " ").trim() ?? "";
  const body = o.corePrompt.replace(/\s+\n/g, "\n").trim();
  const skipDuplicateRefLock =
    ref.length > 0 &&
    (/\bCHARACTER REFERENCE \(READ FIRST/i.test(body) ||
      /\bUse this exact character's physical appearance as strong reference\b/i.test(body));
  const hasQualityStem =
    /\b8k\b/i.test(body) && /\bmasterpiece\b/i.test(body) && /\bultra\s+detailed\b/i.test(body);
  const head = hasQualityStem ? "" : `${IMAGINE_QUALITY_POSITIVE_LINE}.\n\n`;
  const lock =
    ref && !skipDuplicateRefLock
      ? `${CHARACTER_REFERENCE_INTRO_LINES}

${ref}

Keep the exact same face, hair, eyes, body type, skin tone, and distinctive features.

Now generate this new scene:

`
      : "";
  const hasNeg =
    /\bnegative\s+prompt\b/i.test(body) ||
    (/\bmissing\s+limbs\b/i.test(body) && /\bwatermark\b/i.test(body));
  const tail = hasNeg ? "" : `\n\nNegative prompt (avoid): ${IMAGINE_QUALITY_NEGATIVE_LINE}`;
  return `${head}${lock}${body}${tail}`.trim();
}
