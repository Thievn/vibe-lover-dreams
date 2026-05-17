import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "./portraitImageDesignBrief.ts";
import { buildAnatomyImagineKeyRules, buildAnatomyRewriterDirective, resolveAnatomyVariant } from "./anatomyImageRules.ts";
import {
  IMAGINE_META_NO_ON_CANVAS_TEXT,
  resolveImageContentTier,
  type ImageContentTier,
  UNIVERSAL_NON_PREVIEW_IMAGE_BASE,
} from "./imageGenerationContentTier.ts";
import { rewritePromptForImagine } from "./safeImagePromptRewriter.ts";
import {
  buildAnimeTemptationStyleLead,
  FORGE_ANIME_STYLE_LOCK_REGEX,
  isAnimeTemptationForgeTabId,
} from "./forgeAnimeStyleDna.ts";
import { buildForgeStyleDnaPrefix } from "./forgeTabStyleDna.ts";
import { decodeImageDataUrl } from "./imageDataUrl.ts";
import { sanitizeGrokImagineLexicon } from "./momentsPromptSanitize.ts";
import { resolveXaiApiKey } from "./resolveXaiApiKey.ts";
import { grokGenerateImageDataUrl } from "./xaiGrokImage.ts";
import { enrichImaginePromptUniversal } from "./characterReferenceImagePrompt.ts";

const getEnv = (name: string) => Deno.env.get(name);

export type PortraitStorageTarget =
  | { kind: "catalog"; catalogId: string }
  | { kind: "forge"; uuid: string };

export function buildPortraitFinalPrompt(imagePrompt: string, characterData: Record<string, unknown>): string {
  const anatomyKey = buildAnatomyImagineKeyRules(resolveAnatomyVariant(characterData));
  const dna = buildForgeStyleDnaPrefix(characterData, "preview");
  const tabRaw = characterData.selectedForgeTab ?? characterData.selected_forge_tab ?? characterData.activeForgeTab;
  const anime = isAnimeTemptationForgeTabId(tabRaw);
  const animeLead =
    anime && !FORGE_ANIME_STYLE_LOCK_REGEX.test(imagePrompt) ? `${buildAnimeTemptationStyleLead("preview")}\n\n` : "";
  return `
${animeLead}${dna ? `${dna}\n\n` : ""}${PORTRAIT_IMAGE_DESIGN_BRIEF}

${anatomyKey}

Character / card scene (match gender, species, appearance, and theme from this text exactly):
${imagePrompt}
    `.trim();
}

async function buildFullAdultArtPortraitPrompt(
  imagePrompt: string,
  characterData: Record<string, unknown>,
): Promise<string> {
  const anatomyVariant = resolveAnatomyVariant(characterData);
  const anatomyDirective = buildAnatomyRewriterDirective(anatomyVariant);
  const anatomyKey = buildAnatomyImagineKeyRules(anatomyVariant);
  const rewriterContext = JSON.stringify({
    name: characterData.name,
    characterData,
  }).slice(0, 6000);

  const safeRewritten = await rewritePromptForImagine({
    raw: imagePrompt.trim(),
    context: rewriterContext,
    anatomyPolicy: anatomyDirective,
    rewriteMode: "tasteful_adult_brief",
  });

  const baseDescription =
    (characterData.baseDescription as string) ||
    (typeof characterData.appearance === "string" ? characterData.appearance.slice(0, 900) : "") ||
    "a highly attractive character";

  const dna = buildForgeStyleDnaPrefix(characterData, "full");
  const tabRaw = characterData.selectedForgeTab ?? characterData.selected_forge_tab ?? characterData.activeForgeTab;
  const anime = isAnimeTemptationForgeTabId(tabRaw);
  const animeLead =
    anime && !FORGE_ANIME_STYLE_LOCK_REGEX.test(safeRewritten)
      ? `${buildAnimeTemptationStyleLead("full")}\n\n`
      : "";
  return `
${animeLead}${dna ? `${dna}\n\n` : ""}${UNIVERSAL_NON_PREVIEW_IMAGE_BASE}

${IMAGINE_META_NO_ON_CANVAS_TEXT}

Create a highly detailed, cinematic, vertical 2:3 portrait of ${baseDescription}.

Visual rules:
- **No text from this prompt on the canvas:** Do not paint META/policy lines, markdown headers, or slogans as visible typography (including gold captions). Pure portrait scene only.
- No legible logos, watermarks, UI chrome, or fake app branding in-frame.
- **Tasteful adult:** sensual editorial styling, lingerie, wet fabric, and strong tease are in-bounds; avoid hardcore pornographic depiction, graphic penetration, or obscene gynecological close-ups — premium boudoir / editorial tone.
- ${anatomyKey}

PRIMARY SCENE (authoritative):
${safeRewritten}
  `.trim();
}

function storageFileName(target: PortraitStorageTarget, ext: string): string {
  if (target.kind === "catalog") return `${target.catalogId}.${ext}`;
  return `forge/${target.uuid}.${ext}`;
}

/**
 * xAI Grok Imagine still (`/v1/images/generations`) → uploads to companion-portraits. Does not touch the database.
 */
export async function renderPortraitToStorage(opts: {
  adminClient: SupabaseClient;
  imagePrompt: string;
  characterData: Record<string, unknown>;
  target: PortraitStorageTarget;
  /** Defaults to full expression (admin / nexus / catalog regen). */
  contentTier?: ImageContentTier | string;
}): Promise<{ publicUrl: string; displayUrl: string; storagePath: string }> {
  const { adminClient, imagePrompt, characterData, target } = opts;
  /** Card / admin portraits default to forge SFW stack unless callers pass full_adult_art explicitly. */
  const effectiveTier = resolveImageContentTier({
    contentTier: opts.contentTier,
    isPortrait: true,
  });

  const rawFinal =
    effectiveTier === "forge_preview_sfw"
      ? buildPortraitFinalPrompt(imagePrompt, characterData)
      : await buildFullAdultArtPortraitPrompt(imagePrompt, characterData);
  const ref =
    String(characterData.character_reference ?? "").trim() ||
    String(characterData.appearance_reference ?? "").trim() ||
    "";
  const finalPrompt = sanitizeGrokImagineLexicon(
    enrichImaginePromptUniversal({
      corePrompt: rawFinal,
      characterReference: ref.length >= 12 ? ref : null,
    }),
  );

  const apiKey = resolveXaiApiKey(getEnv);
  if (!apiKey) {
    throw new Error("Missing XAI_API_KEY or GROK_API_KEY for Grok portrait render.");
  }
  const { dataUrl } = await grokGenerateImageDataUrl({
    apiKey,
    prompt: finalPrompt,
    getEnv,
    aspectRatio: "2:3",
  });

  const { binary, contentType, ext } = decodeImageDataUrl(dataUrl);

  const fileName = storageFileName(target, ext);

  const { error: uploadError } = await adminClient.storage.from("companion-portraits").upload(fileName, binary, {
    contentType,
    upsert: true,
  });

  if (uploadError) {
    throw new Error(`Storage upload failed: ${uploadError.message}`);
  }

  const publicUrl = adminClient.storage.from("companion-portraits").getPublicUrl(fileName).data.publicUrl;
  let displayUrl = `${publicUrl}?t=${Date.now()}`;
  const { data: signedData, error: signErr } = await adminClient.storage
    .from("companion-portraits")
    .createSignedUrl(fileName, 60 * 60 * 24 * 365);
  if (!signErr && signedData?.signedUrl) {
    displayUrl = signedData.signedUrl;
  }

  return { publicUrl, displayUrl, storagePath: fileName };
}
