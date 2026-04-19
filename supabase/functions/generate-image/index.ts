import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "../_shared/portraitImageDesignBrief.ts";
import {
  buildAnatomyImagineKeyRules,
  buildAnatomyRewriterDirective,
  resolveAnatomyVariant,
} from "../_shared/anatomyImageRules.ts";
import { rewritePromptForImagine } from "../_shared/safeImagePromptRewriter.ts";
import { maybeAppendForgeStyleSceneBlock } from "../_shared/forgePortraitAugmentation.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const DEFAULT_IMAGE_MODEL = "grok-imagine-image";

async function refundTokens(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    await supabase.from("profiles").update({ tokens_balance: bal + amount }).eq("user_id", userId);
  } catch (e) {
    console.error("refundTokens failed", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let tokensCharged = false;
  let tokenCost = 0;
  let chargedUserId = "";

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.replace(/^Bearer\s+/i, "").trim();
    const anonTrim = SUPABASE_ANON_KEY?.trim() ?? "";

    const body = await req.json();
    const {
      prompt,
      characterData = {},
      userId,
      isPortrait = false,
      name = "",
      subtitle = "",
      tokenCost: rawTokenCost,
    } = body as {
      prompt?: string;
      characterData?: Record<string, unknown>;
      userId?: string;
      isPortrait?: boolean;
      name?: string;
      subtitle?: string;
      tokenCost?: number;
    };

    if (!prompt || !userId) {
      throw new Error("Missing prompt or userId");
    }

    tokenCost =
      typeof rawTokenCost === "number" && Number.isFinite(rawTokenCost) && rawTokenCost > 0
        ? Math.floor(rawTokenCost)
        : 0;
    chargedUserId = userId;

    if (!bearer || (anonTrim && bearer === anonTrim)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Sign in required. Refresh the app and try again — the request must include your user session token (not the anon key alone).",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const {
      data: { user },
      error: authErr,
    } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: authErr?.message || "Invalid or expired session. Sign out and sign in again.",
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (user.id !== userId) {
      return new Response(
        JSON.stringify({ success: false, error: "Session does not match userId in request." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const apiKey = resolveXaiApiKey((name) => Deno.env.get(name));
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing API key. Set Edge Function secret XAI_API_KEY (or legacy GROK_API_KEY) to your xAI API key from https://console.x.ai/",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service configuration missing (URL, anon, or service role)");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    if (tokenCost > 0) {
      const { data: prof, error: profErr } = await supabase
        .from("profiles")
        .select("tokens_balance")
        .eq("user_id", userId)
        .maybeSingle();
      if (profErr || prof == null) {
        throw new Error("Could not read forge credits balance.");
      }
      if (prof.tokens_balance < tokenCost) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Not enough forge credits (${tokenCost} required for this image).`,
            code: "INSUFFICIENT_TOKENS",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const { error: deductErr } = await supabase
        .from("profiles")
        .update({ tokens_balance: prof.tokens_balance - tokenCost })
        .eq("user_id", userId);
      if (deductErr) throw new Error(deductErr.message || "Could not reserve forge credits.");
      tokensCharged = true;
    }

    let baseDescription = (characterData.baseDescription as string) || "a highly attractive character";

    if (characterData.randomize === true) {
      baseDescription =
        "a completely unique and original character with random appearance, body type, and style";
    }

    const rewriterContext = JSON.stringify({
      isPortrait,
      name,
      subtitle,
      characterData,
    }).slice(0, 6000);

    const anatomyVariant = resolveAnatomyVariant(characterData as Record<string, unknown>);
    const anatomyDirective = buildAnatomyRewriterDirective(anatomyVariant);
    const anatomyKeyRules = buildAnatomyImagineKeyRules(anatomyVariant);

    const rawForRewrite = maybeAppendForgeStyleSceneBlock(String(prompt), characterData as Record<string, unknown>);

    const rewriteMode = isPortrait ? "portrait_card" : "chat_session";

    let safeRewritten: string;
    try {
      safeRewritten = await rewritePromptForImagine({
        raw: rawForRewrite,
        context: rewriterContext,
        anatomyPolicy: anatomyDirective,
        apiKey,
        rewriteMode,
      });
    } catch (rewriteErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost);
        tokensCharged = false;
      }
      const msg = rewriteErr instanceof Error ? rewriteErr.message : String(rewriteErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Prompt preparation failed: ${msg}`,
          tokensRefunded: tokenCost > 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const forgeBody = String(characterData.bodyType ?? "").trim();
    const forgeArt = String(characterData.artStyleLabel ?? characterData.art_style_label ?? "").trim();
    const bodyTypeLine = forgeBody
      ? `- Body & silhouette (forge): **${forgeBody}** — this is authoritative; render species, scale, hybrid parts, and non-human traits to match it (not a default human silhouette unless the label is clearly humanoid-only).`
      : `- Body type: any body type (slim, curvy, muscular, plus-size, petite, tall, short, etc.)`;
    const statureEmphasisLine =
      anatomyVariant === "little_person"
        ? `- **Stature (critical):** Adult proportional short stature / little person — not average-height fashion-model legs; when possible show scale vs doorways, bar, or furniture.`
        : null;
    const artStyleLine = forgeArt
      ? `- Art style (forge): ${forgeArt} — keep rendering discipline consistent with this choice.`
      : null;

    const characterDetailsBlock = [
      "Character Details:",
      bodyTypeLine,
      statureEmphasisLine,
      artStyleLine,
      `- Ethnicity / skin tone: ${characterData.ethnicity || "any"}`,
      `- Age range: ${characterData.ageRange || "young adult"}`,
      `- Hair: ${characterData.hair || "any style and color"}`,
      `- Eyes: ${characterData.eyes || "expressive and beautiful"}`,
      `- Clothing / outfit: ${characterData.clothing || "elegant, sexy, provocative clothing with lace, leather, straps, sheer fabrics, corsets, harnesses, or any style the character would wear"}`,
      `- Pose: ${characterData.pose || "seductive and provocative pose"}`,
      `- Expression / mood: ${characterData.expression || "seductive, confident, mysterious, or alluring"}`,
      `- Overall vibe: ${characterData.vibe || "extremely sexy and artistic"}`,
    ]
      .filter((line): line is string => line != null && line !== "")
      .join("\n");

    const refLines = [
      characterData.referencePalette
        ? `- Loosely echo this abstract color mood from a user-supplied reference thumbnail (palette only; do not copy any real person's face): ${characterData.referencePalette}`
        : "",
      characterData.referenceNotes
        ? `- User style notes (interpret as generic art direction, not likeness): ${characterData.referenceNotes}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    const finalPrompt = isPortrait
      ? `
${PORTRAIT_IMAGE_DESIGN_BRIEF}

Create a highly seductive, provocative, and artistic portrait of ${baseDescription}.

${characterDetailsBlock}

Key Rules:
- Strictly SFW — no nudity, no visible genitals, no explicit sex acts
- Extremely sexy and provocative but tasteful and artistic
${forgeBody ? `- **Forge body type** (Character Details) overrides any conflicting silhouette or species wording in the primary scene text below — match the UI label for every category (human builds, stature, mobility, anthro, hybrid, elemental, hyper-shape, etc.).` : ""}
- ${anatomyKeyRules}
- Highly detailed, cinematic lighting, premium quality, vertical portrait composition suitable for TCG-style card
${refLines ? `${refLines}\n` : ""}

PRIMARY SCENE DIRECTION (follow this closely — premium, cinematic, maximum sensual tension through pose, gaze, fabric, and light; do not depict anything that violates SFW rules):
${safeRewritten}
    `.trim()
      : `
Adults-only companion product. This render is for a private chat / gallery session (not a public catalog card). Follow xAI's content policies; do not depict minors.

Create a highly detailed, cinematic, vertical 3:4 image of ${baseDescription}.

${characterDetailsBlock}

Visual rules:
- No legible logos, watermarks, UI chrome, fake app branding, or readable product/store signage in-frame.
${forgeBody ? `- **Forge body type** (Character Details) overrides conflicting silhouette or species wording in the scene text below.` : ""}
- ${anatomyKeyRules}
- Premium lighting, cinematic composition, flattering portrait discipline.
${refLines ? `${refLines}\n` : ""}

PRIMARY SCENE (follow closely — rewriter output is authoritative for mood and explicitness):
${safeRewritten}
    `.trim();

    const model = Deno.env.get("GROK_IMAGE_MODEL")?.trim() || DEFAULT_IMAGE_MODEL;

    let imageUrl: string | undefined;
    try {
      const response = await fetch("https://api.x.ai/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          prompt: finalPrompt,
          n: 1,
          aspect_ratio: "3:4",
        }),
      });

      const rawText = await response.text();
      let data: { data?: Array<{ url?: string; b64_json?: string }>; error?: { message?: string } } = {};
      try {
        data = JSON.parse(rawText) as typeof data;
      } catch {
        throw new Error(`xAI returned non-JSON (${response.status}): ${rawText.slice(0, 500)}`);
      }

      if (!response.ok) {
        const msg = data.error?.message || rawText.slice(0, 500) || `HTTP ${response.status}`;
        throw new Error(`xAI image API error: ${msg}`);
      }

      imageUrl = data.data?.[0]?.url;
      const b64 = data.data?.[0]?.b64_json;

      if (!imageUrl && b64) {
        imageUrl = `data:image/jpeg;base64,${b64}`;
      }

      if (!imageUrl) {
        console.error("xAI response:", rawText.slice(0, 2000));
        throw new Error("Failed to generate image from xAI (no url or b64 in response)");
      }
    } catch (imgErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost);
        tokensCharged = false;
      }
      const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            /xai|content policy|moderation|blocked|safety/i.test(msg)
              ? msg
              : `Image generation failed: ${msg}. Your forge credits were refunded if this run charged you.`,
          tokensRefunded: tokenCost > 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bucket = isPortrait ? "companion-portraits" : "companion-images";
    const fileName = isPortrait
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      : `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    let imageBuffer: ArrayBuffer;
    try {
      if (imageUrl!.startsWith("data:")) {
        const parts = imageUrl!.split(",");
        if (parts.length < 2) throw new Error("Invalid base64 image data");
        const binary = atob(parts[1]!);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        imageBuffer = bytes.buffer;
      } else {
        const imageResponse = await fetch(imageUrl!);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download generated image: ${imageResponse.status}`);
        }
        imageBuffer = await imageResponse.arrayBuffer();
      }
    } catch (dlErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost);
        tokensCharged = false;
      }
      const msg = dlErr instanceof Error ? dlErr.message : String(dlErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Could not retrieve generated image: ${msg}. Forge credits were refunded if charged.`,
          tokensRefunded: tokenCost > 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, imageBuffer, { contentType: "image/jpeg", upsert: true });

      if (uploadError) throw uploadError;

      const publicUrl = supabase.storage.from(bucket).getPublicUrl(fileName).data.publicUrl;
      let displayUrl = publicUrl;
      const { data: signedData, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(fileName, 60 * 60 * 24 * 365);
      if (!signErr && signedData?.signedUrl) {
        displayUrl = signedData.signedUrl;
      }

      const table = isPortrait ? "companion_portraits" : "generated_images";

      const insertData: Record<string, unknown> = {
        user_id: userId,
        image_url: publicUrl,
        prompt: isPortrait ? `${safeRewritten}\n—\nSource brief: ${String(prompt).slice(0, 400)}` : safeRewritten,
        style: characterData.style || "custom",
        created_at: new Date().toISOString(),
      };

      if (!isPortrait) {
        insertData.original_prompt = String(prompt);
        const cid = characterData.companionId || "forge-preview";
        insertData.companion_id = cid;
        insertData.saved_to_companion_gallery = cid !== "forge-preview";
      }

      if (isPortrait) {
        insertData.name = name || "Custom Companion";
        insertData.subtitle = subtitle || "Generated Portrait";
        insertData.is_public = true;
      }

      const { data: inserted, error: insertError } = await supabase.from(table).insert(insertData).select("id").single();
      if (insertError) throw insertError;

      let newTokensBalance: number | undefined;
      if (tokenCost > 0) {
        const { data: balRow } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
        newTokensBalance = balRow?.tokens_balance;
      }

      return new Response(
        JSON.stringify({
          success: true,
          imageUrl: displayUrl,
          publicImageUrl: publicUrl,
          imageId: inserted?.id ?? null,
          bucket,
          isPortrait,
          tokensDeducted: tokenCost > 0 ? tokenCost : undefined,
          newTokensBalance,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    } catch (lateErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost);
        tokensCharged = false;
      }
      const message = lateErr instanceof Error ? lateErr.message : String(lateErr);
      console.error(message);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Save failed after generation: ${message}. Forge credits were refunded if charged.`,
          tokensRefunded: tokenCost > 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
  } catch (error: unknown) {
    if (tokensCharged && tokenCost > 0 && chargedUserId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await refundTokens(sb, chargedUserId, tokenCost);
      } catch (re) {
        console.error("Emergency token refund failed:", re);
      }
      tokensCharged = false;
    }
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
        tokensRefunded: tokenCost > 0,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
