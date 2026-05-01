import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "./portraitImageDesignBrief.ts";
import { buildAnatomyImagineKeyRules, buildAnatomyRewriterDirective, resolveAnatomyVariant } from "./anatomyImageRules.ts";
import type { ImageContentTier } from "./imageGenerationContentTier.ts";
import { resolveImageContentTier, UNIVERSAL_NON_PREVIEW_IMAGE_BASE } from "./imageGenerationContentTier.ts";
import { rewritePromptForImagine } from "./safeImagePromptRewriter.ts";

const DEFAULT_IMAGE_MODEL = "grok-imagine-image";

export type PortraitStorageTarget =
  | { kind: "catalog"; catalogId: string }
  | { kind: "forge"; uuid: string };

export function buildPortraitFinalPrompt(imagePrompt: string, characterData: Record<string, unknown>): string {
  const anatomyKey = buildAnatomyImagineKeyRules(resolveAnatomyVariant(characterData));
  return `
${PORTRAIT_IMAGE_DESIGN_BRIEF}

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
  apiKey: string,
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
    apiKey,
    rewriteMode: "chat_session",
  });

  const baseDescription =
    (characterData.baseDescription as string) ||
    (typeof characterData.appearance === "string" ? characterData.appearance.slice(0, 900) : "") ||
    "a highly attractive character";

  return `
${UNIVERSAL_NON_PREVIEW_IMAGE_BASE}

Adults-only companion product. Admin / roster portrait refresh (not Forge live preview). Follow xAI content policies; do not depict minors.

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
 * Calls xAI Imagine, uploads to companion-portraits, returns public + display URLs.
 * Does not touch the database.
 */
export async function renderPortraitToStorage(opts: {
  adminClient: SupabaseClient;
  apiKey: string;
  imagePrompt: string;
  characterData: Record<string, unknown>;
  target: PortraitStorageTarget;
  model?: string;
  /** Defaults to full expression (admin / nexus / catalog regen). */
  contentTier?: ImageContentTier | string;
}): Promise<{ publicUrl: string; displayUrl: string; storagePath: string }> {
  const { adminClient, apiKey, imagePrompt, characterData, target } = opts;
  const model = opts.model?.trim() || Deno.env.get("GROK_IMAGE_MODEL")?.trim() || DEFAULT_IMAGE_MODEL;
  const effectiveTier = resolveImageContentTier({
    contentTier: opts.contentTier,
    isPortrait: false,
  });

  const finalPrompt =
    effectiveTier === "forge_preview_sfw"
      ? buildPortraitFinalPrompt(imagePrompt, characterData)
      : await buildFullAdultArtPortraitPrompt(imagePrompt, characterData, apiKey);

  const aiResponse = await fetch("https://api.x.ai/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt: finalPrompt,
      n: 1,
      aspect_ratio: "2:3",
    }),
  });

  const rawText = await aiResponse.text();
  let parsed: { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } } = {};
  try {
    parsed = JSON.parse(rawText) as typeof parsed;
  } catch {
    throw new Error(`xAI returned invalid JSON: ${rawText.slice(0, 400)}`);
  }

  if (!aiResponse.ok) {
    const msg = parsed.error?.message || rawText.slice(0, 500);
    throw new Error(`xAI image generation failed: ${msg}`);
  }

  let remoteUrl = parsed.data?.[0]?.url;
  const b64 = parsed.data?.[0]?.b64_json;

  let binaryData: Uint8Array;
  let ext = "jpg";
  let contentType = "image/jpeg";

  if (remoteUrl) {
    if (remoteUrl.startsWith("data:")) {
      const m = remoteUrl.match(/^data:image\/(\w+);base64,(.+)$/);
      if (!m) throw new Error("Invalid data URL from xAI");
      ext = m[1] === "jpeg" ? "jpg" : m[1]!;
      contentType = `image/${m[1] === "jpeg" ? "jpeg" : m[1]}`;
      binaryData = Uint8Array.from(atob(m[2]!), (c) => c.charCodeAt(0));
    } else {
      const imgRes = await fetch(remoteUrl);
      if (!imgRes.ok) throw new Error(`Failed to download image from xAI URL (${imgRes.status})`);
      const ct = imgRes.headers.get("content-type") || "";
      if (ct.includes("png")) {
        ext = "png";
        contentType = "image/png";
      }
      const buf = await imgRes.arrayBuffer();
      binaryData = new Uint8Array(buf);
    }
  } else if (b64) {
    binaryData = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  } else {
    throw new Error("No image URL or base64 in xAI response");
  }

  const fileName = storageFileName(target, ext);

  const { error: uploadError } = await adminClient.storage.from("companion-portraits").upload(fileName, binaryData, {
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
