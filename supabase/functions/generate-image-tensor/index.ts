import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireSessionUser } from "../_shared/requireSessionUser.ts";
import { hasTamsRsaCredentials } from "../_shared/tamsRsaAuth.ts";
import { generateConsistentCharacterImage } from "../_shared/generate-consistent-character-image.ts";
import { FORGE_BODY_IMAGINE_LEADS } from "../_shared/forgeBodyImagineLeads.ts";
import { I2V_MOUTH_STILL_DIRECTIVE } from "../_shared/profileLoopVideoPrompt.ts";
import {
  DEFAULT_TENSOR_IMAGE_MODEL,
  DEFAULT_TENSOR_VIDEO_MODEL,
  LUSTFORGE_IMAGE_HEIGHT,
  LUSTFORGE_IMAGE_WIDTH,
  sourceImageUrlForTamsUpload,
  submitTensorImageJob,
  submitTensorImageToVideoJob,
  waitForTensorJobResult,
} from "../_shared/tensorClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_DENOISE = 0.45;

function jsonResponse(obj: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refundTokens(supabase: ReturnType<typeof createClient>, userId: string, amount: number): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const balance = row?.tokens_balance ?? 0;
    await supabase.from("profiles").update({ tokens_balance: balance + amount }).eq("user_id", userId);
  } catch (e) {
    console.error("generate-image-tensor: refundTokens failed", e);
  }
}

function toPromptString(prompt: unknown): string {
  if (typeof prompt !== "string") return "";
  return prompt.trim();
}

function toOptionalUrl(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t;
}

/** Tensor models often paint UI slug strings if we echo "Locked body type: Orc / …" — use prose leads only. */
function tensorPhysiqueHint(bodyType: string): string {
  const t = bodyType.trim();
  if (!t) return "";
  const lead = (FORGE_BODY_IMAGINE_LEADS as Record<string, string>)[t];
  if (lead) {
    return `Physique (embed visually only — never render as typography, captions, or footer labels): ${lead}`;
  }
  return "Physique: follow the main prompt's silhouette — never paint category names, slashes, or UI picker text on the image.";
}

/** Heuristic: explicit / NSFW chat asks — do not prepend conflicting SFW “outfit” or bury the user line under long defaults. */
function isLikelyExplicitUserPrompt(p: string): boolean {
  const t = p.toLowerCase();
  return (
    /\b(nude|naked|nsfw|xxx|uncensored|unfiltered|no\s*censor|explicit|hardcore|porn|erotic\s*selfie|genital|pussy|dick|cock|penis|tits?|boobs?|lingerie|topless|bottomless|bare|no\s*clothes|undressed|fetish|lewd\s*selfie|nude\s*selfie)\b/.test(
      t,
    ) || /\b(send nudes?|show\s*me\s*everything)\b/.test(t)
  );
}

function buildTensorPrompt(prompt: string, characterData: Record<string, unknown>, isPortrait: boolean): string {
  const style = String(characterData.style ?? "").trim();
  const isChatSession = style === "chat-session";
  const baseDescription = String(characterData.baseDescription ?? "").trim();
  const bodyType = String(characterData.bodyType ?? "").trim();
  const artStyle = String(characterData.artStyleLabel ?? characterData.style ?? "").trim();
  const vibe = String(characterData.vibe ?? "").trim();
  const clothing = String(characterData.clothing ?? "").trim();
  const pose = String(characterData.pose ?? "").trim();
  const scene = String(characterData.sceneAtmosphere ?? "").trim();
  const explicit = isLikelyExplicitUserPrompt(prompt);
  const skipOutfit = isChatSession && explicit;

  if (isChatSession && !isPortrait) {
    const head =
      "Chat still: 3:4 vertical phone-style portrait. No watermarks, logos, or overlay text. " +
      "The first block below states the user request and character — follow it; it overrides generic defaults that follow.";
    const lockLines = [
      baseDescription ? `Character baseline: ${baseDescription}` : "",
      bodyType ? tensorPhysiqueHint(bodyType) : "",
      artStyle ? `Art style: ${artStyle}` : "",
      vibe && !explicit ? `Mood: ${vibe}` : "",
      !skipOutfit && clothing ? `Outfit / styling: ${clothing}` : "",
      pose ? `Pose direction: ${pose}` : "",
      scene ? `Scene direction: ${scene}` : "",
      "Keep identity coherent with any supplied reference image; change wardrobe/pose to match the user request when it conflicts with the reference.",
    ];
    return [head, prompt, ...lockLines.filter(Boolean)].join("\n");
  }

  const lines = [
    isPortrait
      ? "Catalog-style portrait render. Maintain 3:4 vertical composition and premium framing. No logos, watermarks, typographic footers, or legible text in the frame."
      : "Chat or gallery portrait render. Maintain 3:4 vertical composition and premium portrait quality. No logos, watermarks, or unrelated typographic overlays.",
    baseDescription ? `Character baseline: ${baseDescription}` : "",
    bodyType ? tensorPhysiqueHint(bodyType) : "",
    artStyle ? `Art style: ${artStyle}` : "",
    vibe ? `Mood: ${vibe}` : "",
    clothing ? `Outfit direction: ${clothing}` : "",
    pose ? `Pose direction: ${pose}` : "",
    scene ? `Scene direction: ${scene}` : "",
    "Keep identity coherent with any supplied reference image.",
    prompt,
  ];

  return lines.filter(Boolean).join("\n");
}

async function downloadBinary(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  if (url.startsWith("data:")) {
    const match = url.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid data URL from Tensor result.");
    const mime = match[1] || "application/octet-stream";
    const b64 = match[2] ?? "";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    return { bytes, contentType: mime };
  }
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to download generated media: HTTP ${res.status}`);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { bytes, contentType };
}

function inferImageExt(contentType: string): { ext: string; contentType: string } {
  if (/png/i.test(contentType)) return { ext: "png", contentType: "image/png" };
  if (/webp/i.test(contentType)) return { ext: "webp", contentType: "image/webp" };
  return { ext: "jpg", contentType: "image/jpeg" };
}

function clampVideoDuration(seconds: unknown): number {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) return 8;
  return Math.max(5, Math.min(10, Math.round(seconds)));
}

/** TAMS expects `sdModel` as digits-only Tensor.art checkpoint id. */
function assertTensorSdModelId(model: string, envName: string): string {
  const t = model.trim();
  if (!/^\d{10,24}$/.test(t)) {
    throw new Error(
      `Invalid ${envName} "${t}". TAMS requires the numeric model ID from the model page URL ` +
        `(e.g. https://tensor.art/models/757279507095956705), not a Hugging Face repo name.`,
    );
  }
  return t;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let tokensCharged = false;
  let chargedUserId = "";
  let tokenCost = 0;

  try {
    const sessionGate = await requireSessionUser(req);
    if ("response" in sessionGate) return sessionGate.response;
    const sessionUser = sessionGate.user;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse({ success: false, error: "Server misconfigured" }, 500);
    }

    const tensorApiKey = (Deno.env.get("TENSOR_API_KEY") ?? "").trim();
    if (!tensorApiKey && !hasTamsRsaCredentials()) {
      return jsonResponse(
        {
          success: false,
          error:
            "Tensor auth not configured: set Supabase secret TENSOR_API_KEY (Bearer from https://tams.tensor.art/app) " +
            "or set TAMS_APP_ID + TAMS_PRIVATE_KEY for RSA signing. Wrong API host also causes “app not found” — copy TENSOR_API_BASE_URL from your app info.",
        },
        503,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON payload." }, 400);
    }

    const prompt = toPromptString(body.prompt);
    const userId = typeof body.userId === "string" ? body.userId.trim() : "";
    const isPortrait = body.isPortrait === true;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const subtitle = typeof body.subtitle === "string" ? body.subtitle.trim() : "";
    const characterData =
      body.characterData && typeof body.characterData === "object"
        ? (body.characterData as Record<string, unknown>)
        : {};
    const referenceImageUrl = toOptionalUrl(body.referenceImageUrl);
    const denoisingStrength =
      typeof body.denoisingStrength === "number" && Number.isFinite(body.denoisingStrength)
        ? body.denoisingStrength
        : DEFAULT_DENOISE;
    const generateVideo = body.generateVideo === true;
    const requestedVideoSource = toOptionalUrl(body.videoSourceImageUrl);
    const videoDurationSeconds = clampVideoDuration(body.videoDurationSeconds);
    tokenCost =
      typeof body.tokenCost === "number" && Number.isFinite(body.tokenCost) && body.tokenCost > 0
        ? Math.floor(body.tokenCost)
        : 0;

    if (!prompt || !userId) {
      return jsonResponse({ success: false, error: "Missing prompt or userId." }, 400);
    }
    if (sessionUser.id !== userId) {
      return jsonResponse({ success: false, error: "Session does not match userId in request." }, 403);
    }
    chargedUserId = userId;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (tokenCost > 0) {
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (profileErr || profile == null) {
        return jsonResponse({ success: false, error: "Could not read forge credits balance." }, 400);
      }
      if (profile.tokens_balance < tokenCost) {
        return jsonResponse(
          {
            success: false,
            error: `Not enough forge credits (${tokenCost} required).`,
            code: "INSUFFICIENT_TOKENS",
          },
          402,
        );
      }
      const { error: deductErr } = await supabase
        .from("profiles")
        .update({ tokens_balance: profile.tokens_balance - tokenCost })
        .eq("user_id", userId);
      if (deductErr) throw new Error(deductErr.message || "Could not reserve forge credits.");
      tokensCharged = true;
    }

    // Chat stills: prefer `TENSOR_CHAT_IMAGE_MODEL` (FLUX.2 Dev) when set; else `TENSOR_IMAGE_MODEL` (also defaults to FLUX.2).
    const isChatSession = String(characterData.style ?? "") === "chat-session";
    const imageModelRaw = isChatSession
      ? (Deno.env.get("TENSOR_CHAT_IMAGE_MODEL") ?? Deno.env.get("TENSOR_IMAGE_MODEL") ?? DEFAULT_TENSOR_IMAGE_MODEL)
          .trim()
      : (Deno.env.get("TENSOR_IMAGE_MODEL") ?? DEFAULT_TENSOR_IMAGE_MODEL).trim();
    const model = assertTensorSdModelId(
      imageModelRaw,
      isChatSession ? "TENSOR_CHAT_IMAGE_MODEL|TENSOR_IMAGE_MODEL" : "TENSOR_IMAGE_MODEL",
    );
    const videoModel = assertTensorSdModelId(
      (Deno.env.get("TENSOR_VIDEO_MODEL") ?? DEFAULT_TENSOR_VIDEO_MODEL).trim(),
      "TENSOR_VIDEO_MODEL",
    );
    const tensorPrompt = buildTensorPrompt(prompt, characterData, isPortrait);

    console.log("generate-image-tensor: submitting image job", {
      userId,
      isPortrait,
      model,
      mode: referenceImageUrl ? "img2img" : "txt2img",
      width: LUSTFORGE_IMAGE_WIDTH,
      height: LUSTFORGE_IMAGE_HEIGHT,
    });

    let generatedImageUrl: string;
    if (referenceImageUrl) {
      const consistent = await generateConsistentCharacterImage({
        apiKey: tensorApiKey,
        prompt: tensorPrompt,
        referenceImageUrl,
        characterData,
        denoisingStrength,
        model,
      });
      generatedImageUrl = consistent.imageUrl;
    } else {
      const { jobId } = await submitTensorImageJob({
        apiKey: tensorApiKey,
        prompt: tensorPrompt,
        model,
        width: LUSTFORGE_IMAGE_WIDTH,
        height: LUSTFORGE_IMAGE_HEIGHT,
      });
      const result = await waitForTensorJobResult({ apiKey: tensorApiKey, jobId });
      if (!result.imageUrl) throw new Error("Tensor job did not return an image URL.");
      generatedImageUrl = result.imageUrl;
    }

    const downloadedImage = await downloadBinary(generatedImageUrl);
    const imageFmt = inferImageExt(downloadedImage.contentType);
    const imageBucket = isPortrait ? "companion-portraits" : "companion-images";
    const imageFileName = isPortrait
      ? `${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${imageFmt.ext}`
      : `${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${imageFmt.ext}`;

    const { error: imageUploadErr } = await supabase.storage
      .from(imageBucket)
      .upload(imageFileName, downloadedImage.bytes, { contentType: imageFmt.contentType, upsert: true });
    if (imageUploadErr) throw new Error(`Storage upload failed: ${imageUploadErr.message}`);

    const publicImageUrl = supabase.storage.from(imageBucket).getPublicUrl(imageFileName).data.publicUrl;
    let displayImageUrl = publicImageUrl;
    const { data: signedData, error: signErr } = await supabase.storage
      .from(imageBucket)
      .createSignedUrl(imageFileName, 60 * 60 * 24 * 365);
    if (!signErr && signedData?.signedUrl) displayImageUrl = signedData.signedUrl;

    const table = isPortrait ? "companion_portraits" : "generated_images";
    const insertRow: Record<string, unknown> = {
      user_id: userId,
      image_url: publicImageUrl,
      prompt: prompt,
      style: String(characterData.style ?? "tensor"),
      created_at: new Date().toISOString(),
    };
    if (!isPortrait) {
      insertRow.original_prompt = prompt;
      insertRow.companion_id = String(characterData.companionId ?? "forge-preview");
      insertRow.saved_to_companion_gallery = String(characterData.companionId ?? "forge-preview") !== "forge-preview";
      insertRow.is_video = false;
    } else {
      insertRow.name = name || "Custom Companion";
      insertRow.subtitle = subtitle || "Generated Portrait";
      insertRow.is_public = true;
    }

    const { data: inserted, error: insertErr } = await supabase.from(table).insert(insertRow).select("id").single();
    if (insertErr) throw new Error(`DB insert failed: ${insertErr.message}`);

    let publicVideoUrl: string | undefined;
    if (generateVideo) {
      const baseVideoSource =
        sourceImageUrlForTamsUpload(requestedVideoSource) ??
        sourceImageUrlForTamsUpload(publicImageUrl) ??
        sourceImageUrlForTamsUpload(referenceImageUrl);
      if (!baseVideoSource) {
        throw new Error("generateVideo requested but no valid source image URL is available.");
      }
      console.log("generate-image-tensor: submitting video job", { userId, duration: videoDurationSeconds });

      const videoPrompt = `${tensorPrompt}\n\nCreate a seamless ${videoDurationSeconds}s looping motion clip from this image. Silent body-forward performance (dance, tease, pose) — not a speaking shot.\n${I2V_MOUTH_STILL_DIRECTIVE}`;
      const { jobId } = await submitTensorImageToVideoJob({
        apiKey: tensorApiKey,
        prompt: videoPrompt,
        sourceImageUrl: baseVideoSource,
        durationSeconds: videoDurationSeconds,
        model: videoModel,
      });
      const videoResult = await waitForTensorJobResult({ apiKey: tensorApiKey, jobId, timeoutMs: 12 * 60_000 });
      if (!videoResult.videoUrl) throw new Error("Tensor video job did not return a video URL.");

      const downloadedVideo = await downloadBinary(videoResult.videoUrl);
      const videoFile = `tensor-videos/${userId}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.mp4`;
      const { error: upVideoErr } = await supabase.storage.from("companion-images").upload(videoFile, downloadedVideo.bytes, {
        contentType: "video/mp4",
        upsert: true,
      });
      if (upVideoErr) throw new Error(`Video upload failed: ${upVideoErr.message}`);
      publicVideoUrl = supabase.storage.from("companion-images").getPublicUrl(videoFile).data.publicUrl;

      if (!isPortrait) {
        await supabase.from("generated_images").insert({
          user_id: userId,
          companion_id: String(characterData.companionId ?? "forge-preview"),
          image_url: publicVideoUrl,
          prompt: `${prompt}\n[video loop]`,
          original_prompt: prompt,
          saved_to_companion_gallery: false,
          is_video: true,
          style: "tensor-video",
          created_at: new Date().toISOString(),
        });
      }
    }

    let newTokensBalance: number | undefined;
    if (tokenCost > 0) {
      const { data: balRow } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
      newTokensBalance = balRow?.tokens_balance;
    }

    return jsonResponse({
      success: true,
      imageUrl: displayImageUrl,
      publicImageUrl,
      imageId: inserted?.id ?? null,
      bucket: imageBucket,
      isPortrait,
      tensorModel: model,
      denoisingStrength: referenceImageUrl ? Math.max(0.1, Math.min(0.85, denoisingStrength)) : undefined,
      tokensDeducted: tokenCost > 0 ? tokenCost : undefined,
      newTokensBalance,
      videoUrl: publicVideoUrl,
    });
  } catch (err) {
    console.error("generate-image-tensor:", err);
    if (tokensCharged && chargedUserId && tokenCost > 0 && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const svc = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await refundTokens(svc, chargedUserId, tokenCost);
      } catch (refundErr) {
        console.error("generate-image-tensor: emergency token refund failed", refundErr);
      }
    }
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse(
      {
        success: false,
        error: message,
        tokensRefunded: tokensCharged && tokenCost > 0,
      },
      400,
    );
  }
});
