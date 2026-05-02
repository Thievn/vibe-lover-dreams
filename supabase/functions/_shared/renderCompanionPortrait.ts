import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "./portraitImageDesignBrief.ts";
import { buildAnatomyImagineKeyRules, buildAnatomyRewriterDirective, resolveAnatomyVariant } from "./anatomyImageRules.ts";
import type { ImageContentTier } from "./imageGenerationContentTier.ts";
import { resolveImageContentTier, UNIVERSAL_NON_PREVIEW_IMAGE_BASE } from "./imageGenerationContentTier.ts";
import { rewritePromptForImagine } from "./safeImagePromptRewriter.ts";
import {
  buildAnimeTemptationStyleLead,
  FORGE_ANIME_STYLE_LOCK_REGEX,
  isAnimeTemptationForgeTabId,
} from "./forgeAnimeStyleDna.ts";
import { buildForgeStyleDnaPrefix } from "./forgeTabStyleDna.ts";
import { decodeImageDataUrl, togetherGenerateFluxImage } from "./togetherImage.ts";

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

Create a highly detailed, cinematic, seductive SFW portrait for a romance / AI companion catalog card.
Strictly SFW: no nudity, no visible genitals, no explicit sex acts. Artistic pin-up or cover quality.

${anatomyKey}

Character / scene request:
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
    rewriteMode: "chat_session",
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

Adults-only companion product. Admin / roster portrait refresh (not Forge live preview). Follow provider content policies; do not depict minors.

Create a highly detailed, cinematic, vertical 2:3 portrait of ${baseDescription}.

Visual rules:
- No legible logos, watermarks, UI chrome, or fake app branding in-frame.
- **Tasteful adult:** sensual nude, lingerie, wet fabric, and strong tease are in-bounds; avoid hardcore pornographic depiction, graphic penetration, or obscene gynecological close-ups — premium boudoir / editorial tone.
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
 * Together.ai FLUX.2 still (`/v1/images/generations`, default **FLUX.2-dev**) → uploads to companion-portraits. Does not touch the database.
 */
export async function renderPortraitToStorage(opts: {
  adminClient: SupabaseClient;
  imagePrompt: string;
  characterData: Record<string, unknown>;
  target: PortraitStorageTarget;
  /** Optional profile override (`profiles.together_image_model`); otherwise `TOGETHER_IMAGE_MODEL` / default. */
  profileTogetherImageModel?: string | null;
  /** Defaults to full expression (admin / nexus / catalog regen). */
  contentTier?: ImageContentTier | string;
}): Promise<{ publicUrl: string; displayUrl: string; storagePath: string }> {
  const { adminClient, imagePrompt, characterData, target } = opts;
  const effectiveTier = resolveImageContentTier({
    contentTier: opts.contentTier,
    isPortrait: false,
  });

  const finalPrompt =
    effectiveTier === "forge_preview_sfw"
      ? buildPortraitFinalPrompt(imagePrompt, characterData)
      : await buildFullAdultArtPortraitPrompt(imagePrompt, characterData);

  const { dataUrl } = await togetherGenerateFluxImage({
    prompt: finalPrompt,
    getEnv,
    aspectRatio: "2:3",
    profileTogetherImageModel: opts.profileTogetherImageModel ?? null,
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
