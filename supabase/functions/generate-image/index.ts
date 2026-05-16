import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveXaiApiKey } from "../_shared/resolveXaiApiKey.ts";
import { decodeImageDataUrl } from "../_shared/togetherImage.ts";
import { grokGenerateImageDataUrl } from "../_shared/xaiGrokImage.ts";
import { PORTRAIT_IMAGE_DESIGN_BRIEF } from "../_shared/portraitImageDesignBrief.ts";
import {
  buildAnatomyImagineKeyRules,
  buildAnatomyRewriterDirective,
  resolveAnatomyVariant,
} from "../_shared/anatomyImageRules.ts";
import { sanitizeMomentsImaginePromptText } from "../_shared/momentsPromptSanitize.ts";
import { maybeAppendForgeStyleSceneBlock } from "../_shared/forgePortraitAugmentation.ts";
import {
  buildAnimeTemptationStyleLead,
  effectiveForgeArtStyleLabelForCharacterData,
  FORGE_ANIME_STYLE_LOCK_REGEX,
  isAnimeTemptationForgeTabId,
} from "../_shared/forgeAnimeStyleDna.ts";
import { buildForgeStyleDnaPrefix } from "../_shared/forgeTabStyleDna.ts";
import { forgePortraitBodyTypeContract } from "../_shared/forgeBodyTypeContract.ts";
import { recordFcTransaction } from "../_shared/recordFcTransaction.ts";
import {
  CHAT_SESSION_IMAGINE_CREATIVE_BASE,
  CHAT_SESSION_MENU_STILL_IMAGINE_BASE,
  FORGE_PREVIEW_IMAGINE_HARD_SFW,
  IMAGINE_META_NO_ON_CANVAS_TEXT,
  resolveImageContentTier,
  UNIVERSAL_NON_PREVIEW_IMAGE_BASE,
} from "../_shared/imageGenerationContentTier.ts";
import { CHAT_LIKENESS_EDGE_SAME_SUBJECT, CHAT_LIKENESS_SUBJECT_FEATURES_INLINE } from "../_shared/chatLikenessAnchors.ts";
import { publicApiTeaserGuardResponse } from "../_shared/publicApiTeaserGate.ts";
import { enrichImaginePromptUniversal } from "../_shared/characterReferenceImagePrompt.ts";
import { resolveCharacterReferenceForImagine } from "../_shared/resolveCharacterReferenceFromDb.ts";
import { assertUserUnlockedCompanionForSpend } from "../_shared/requireCompanionFcUnlock.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const TOGETHER_IMAGE_PROMPT_SOFT_LIMIT = 7600;

function clampPromptForImagine(prompt: string, maxChars: number): string {
  const compact = prompt.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars).trimEnd()}…`;
}

async function refundTokens(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  amount: number,
  reason: string,
): Promise<void> {
  if (amount <= 0) return;
  try {
    const { data: row } = await supabase.from("profiles").select("tokens_balance").eq("user_id", userId).maybeSingle();
    const bal = row?.tokens_balance ?? 0;
    const nxt = bal + amount;
    await supabase.from("profiles").update({ tokens_balance: nxt }).eq("user_id", userId);
    await recordFcTransaction(supabase, {
      userId,
      creditsChange: amount,
      balanceAfter: nxt,
      transactionType: "image_refund",
      description: `Refund: ${reason}`,
      metadata: { fc: amount },
    });
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
      contentTier: rawContentTier,
    } = body as {
      prompt?: string;
      characterData?: Record<string, unknown>;
      userId?: string;
      isPortrait?: boolean;
      name?: string;
      subtitle?: string;
      tokenCost?: number;
      contentTier?: string;
    };

    if (!prompt || !userId) {
      throw new Error("Missing prompt or userId");
    }

    const effectiveTier = resolveImageContentTier({ contentTier: rawContentTier, isPortrait });

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

    const teaserBlock = await publicApiTeaserGuardResponse(user);
    if (teaserBlock) return teaserBlock;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase service configuration missing (URL or service role)");
    }
    const supabaseGate = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const cdGate = characterData as Record<string, unknown>;
    const isChatSessionGate = String(characterData.style ?? "").trim() === "chat-session";
    const cidGate = String(cdGate.companionId ?? cdGate.companion_id ?? "").trim();
    if (isChatSessionGate && cidGate && cidGate !== "forge-preview") {
      const gate = await assertUserUnlockedCompanionForSpend(supabaseGate, user.id, cidGate);
      if (!gate.ok) {
        return new Response(
          JSON.stringify({ success: false, error: gate.message, code: "COMPANION_LOCKED" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const xaiKey = resolveXaiApiKey((n) => Deno.env.get(n));
    if (!xaiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Missing Grok / xAI key. Set Edge Function secret XAI_API_KEY or GROK_API_KEY (https://console.x.ai/) for image generation.",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = supabaseGate;

    const { data: profRow, error: profRowErr } = await supabase
      .from("profiles")
      .select("tokens_balance")
      .eq("user_id", userId)
      .maybeSingle();

    if (tokenCost > 0) {
      if (profRowErr || profRow == null) {
        throw new Error("Could not read forge credits balance.");
      }
      if (profRow.tokens_balance < tokenCost) {
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
        .update({ tokens_balance: profRow.tokens_balance - tokenCost })
        .eq("user_id", userId);
      if (deductErr) throw new Error(deductErr.message || "Could not reserve forge credits.");
      tokensCharged = true;
      const balAfterDeduct = profRow.tokens_balance - tokenCost;
      await recordFcTransaction(supabase, {
        userId,
        creditsChange: -tokenCost,
        balanceAfter: balAfterDeduct,
        transactionType: "image_generation",
        description:
          effectiveTier === "forge_preview_sfw"
            ? "Forge: live preview portrait (Imagine, SFW)"
            : isPortrait
              ? "Forge / roster: portrait (Imagine, full expression)"
              : "Chat / gallery: image (Grok Imagine)",
        metadata: { tokenCost, isPortrait, contentTier: effectiveTier },
      });
    }

    let baseDescription = (characterData.baseDescription as string) || "a highly attractive character";

    if (characterData.randomize === true) {
      baseDescription =
        "a completely unique and original character with random appearance, body type, and style";
    }

    const rewriterContext = JSON.stringify({
      isPortrait,
      contentTier: effectiveTier,
      name,
      subtitle,
      characterData,
    }).slice(0, 6000);

    const anatomyVariant = resolveAnatomyVariant(characterData as Record<string, unknown>);
    const anatomyDirective = buildAnatomyRewriterDirective(anatomyVariant);
    const anatomyKeyRules = buildAnatomyImagineKeyRules(anatomyVariant);

    const cd = characterData as Record<string, unknown>;
    const isChatSessionStill = String(characterData.style ?? "").trim() === "chat-session";
    const suppressForgeDna =
      cd.suppressForgeStyleDnaForChatMenuPreset === true ||
      cd.suppress_forge_style_dna_for_chat_menu_preset === true;
    const chatMenuSceneLock =
      cd.chatMenuSceneLock === true || cd.chat_menu_scene_lock === true;
    /** Menu tiles must follow PRIMARY SCENE; `/v1/images/edits` anchors on the portrait and often preserves bed/crop/pose. */
    const menuSceneLockEffective = chatMenuSceneLock && isChatSessionStill;
    /** Chat stills use **generations** only — `/v1/images/edits` with the roster portrait locked couch/room/crop and ignored user-requested cabins, beaches, etc. */
    const tabForAnime = cd.selectedForgeTab ?? cd.selected_forge_tab ?? cd.activeForgeTab;
    const isAnime = isAnimeTemptationForgeTabId(tabForAnime);
    const tierRewrite = effectiveTier === "forge_preview_sfw" ? "preview" : "full";
    const dnaPrefix = suppressForgeDna && isChatSessionStill ? "" : buildForgeStyleDnaPrefix(cd, tierRewrite);
    const cdScene = { ...cd };
    const artRaw = String(cdScene.artStyleLabel ?? cdScene.art_style_label ?? "").trim();
    cdScene.artStyleLabel = effectiveForgeArtStyleLabelForCharacterData(artRaw, cdScene);
    cdScene.art_style_label = cdScene.artStyleLabel;
    const sceneBlock = maybeAppendForgeStyleSceneBlock(String(prompt), cdScene);
    const promptHasAnimeLock = isAnime && FORGE_ANIME_STYLE_LOCK_REGEX.test(String(prompt));
    const animeRewriteLead = isAnime && !promptHasAnimeLock ? buildAnimeTemptationStyleLead(tierRewrite) : "";
    const nexusHybrid =
      cd.is_nexus_hybrid === true ||
      cd.isNexusHybrid === true ||
      cd.is_nexus_merge_child === true;
    const artLabelForLead = String(cdScene.artStyleLabel ?? "").trim();
    const chatPortraitConsistencyLead =
      isChatSessionStill && !isPortrait
        ? [
            "[MAIN PORTRAIT CONSISTENCY — READ BEFORE STYLE DNA OR SCENE]",
            "Use this exact character's face, hair style, eye color, body type, tattoos, piercings, species marks, and overall appearance exactly as reference.",
            "Maintain 100% consistency with the main profile / roster portrait (HTTPS roster still URL in Character Details when present) AND CHARACTER REFERENCE — same person, same art style / rendering discipline.",
            artLabelForLead
              ? `**Art style lock:** match **${artLabelForLead}** and the roster portrait — do not drift into an unrelated medium, different face, or generic stock glamour.`
              : "**Art style lock:** match the roster portrait and Character Details — do not drift into an unrelated medium or different face.",
            "Only change pose, outfit, wardrobe state, background, environment, props, lighting, and camera per PRIMARY SCENE / menu — never replace the character.",
            nexusHybrid
              ? "**Nexus-forged companion:** EXTRA strict DNA lock — face, silhouette, species anatomy, and palette must read as the **same individual** as the portrait; if anything conflicts, the portrait + reference text override catalog poses and generic beauty defaults."
              : "",
            "---",
            "",
          ]
            .filter(Boolean)
            .join("\n")
        : "";
    const rawForRewrite = [chatPortraitConsistencyLead, animeRewriteLead, dnaPrefix, sceneBlock]
      .filter((s) => String(s).trim())
      .join("\n\n");

    const rewriteMode =
      effectiveTier === "forge_preview_sfw"
        ? "portrait_card"
        : isChatSessionStill
          ? "chat_session"
          : "tasteful_adult_brief";

    /**
     * Gallery Selfie/Lewd presets: the Grok **text rewriter** often collapses diverse menu scenes into the same
     * “standing / three-quarter / facing camera” catalog portrait. Skip it and send the fused client brief + anatomy
     * policy straight to Imagine so **Requested framing (from menu)** survives verbatim intent.
     */
    const skipRewriterForMenuGallery = chatMenuSceneLock && isChatSessionStill;

    let safeRewritten: string;
    if (skipRewriterForMenuGallery) {
      /**
       * `clampPromptForImagine` keeps the **start** of the string. The old order put the long master brief first and
       * the execution block last — at 7600 chars the anti–“catalog portrait” directives were often **truncated away**,
       * so Imagine fell back to the same standing / card-style shot. Head must be: execution → anatomy → brief.
       */
      const executionHead = [
        "[EXECUTION — NOT A PORTRAIT REMASTER — READ FIRST]",
        CHAT_LIKENESS_EDGE_SAME_SUBJECT,
        "Render the **Requested framing (from menu)** block **literally**: named **location**, **body configuration / pose**, **wardrobe or undress state**, **props**, and **camera relationship** as written.",
        "**Forbidden default:** facing-camera standing glam bust, neutral catalog three-quarter, phone-mirror bathroom headshot, or “same silhouette as a roster card” unless the menu text explicitly demands that.",
        "**Likeness:** The subject must be the **same individual** as CHARACTER APPEARANCE and any roster portrait URL in Character Details — **not** a substitute model. Output is a **new** photograph in the menu scenario; do not copy the portrait’s backdrop, wardrobe, or crop.",
      ].join("\n\n");
      const anatomyHead = anatomyDirective
        ? `ANATOMY_POLICY (must obey — do not contradict in the image):\n${anatomyDirective}`
        : "";
      const headJoined = [executionHead, anatomyHead].filter((s) => String(s).trim()).join("\n\n");
      const reserved = headJoined.length + 32;
      const rawBudget = Math.max(2000, TOGETHER_IMAGE_PROMPT_SOFT_LIMIT - reserved);
      const rawClamped = clampPromptForImagine(rawForRewrite, rawBudget);
      const fused = [headJoined, rawClamped].filter((s) => String(s).trim()).join("\n\n\n");
      safeRewritten = clampPromptForImagine(fused, TOGETHER_IMAGE_PROMPT_SOFT_LIMIT);
    } else {
      try {
        safeRewritten = await rewritePromptForImagine({
          raw: rawForRewrite,
          context: rewriterContext,
          anatomyPolicy: anatomyDirective,
          rewriteMode,
        });
      } catch (rewriteErr) {
        if (tokensCharged) {
          await refundTokens(supabase, userId, tokenCost, "prompt rewrite failed");
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
    }

    const forgeBody = String(characterData.bodyType ?? "").trim();
    const forgeArt = effectiveForgeArtStyleLabelForCharacterData(
      String(characterData.artStyleLabel ?? characterData.art_style_label ?? ""),
      characterData as Record<string, unknown>,
    );
    const silCat = String(characterData.silhouetteCategory ?? characterData.silhouette_category ?? "").trim();
    const stylizedSilhouette = ["anthro", "fantasy", "hybrid", "otherworldly", "hyper", "creative"].includes(
      silCat,
    );
    const compactStatureForge =
      /\b(little\s*person|midget|short\s*stature|tiny\s*&\s*doll|pixie-sized|micro\s*\/\s*tiny\s*body)\b/i.test(
        forgeBody,
      );
    const bodyContract = forgeBody ? forgePortraitBodyTypeContract(forgeBody) : "";
    const bodyTypeLine = forgeBody
      ? `- Body & silhouette (forge): **${forgeBody}** — **absolute highest priority** for this image. Do NOT default to a normal human runway figure with token accessories. Species, fashion, scene, and mood must orbit this silhouette.`
      : `- Body type: any body type (slim, curvy, muscular, plus-size, petite, tall, short, etc.)`;
    const statureEmphasisLine =
      anatomyVariant === "little_person" || compactStatureForge
        ? `- **Stature (hero of the frame):** Adult proportional short stature / little-person / compact scale per forge label — this is the **main** body story; do **not** render average-height or runway-leg proportions. Show scale with environment (doorway, bar, furniture, handheld object, or another figure). Nothing in the image should read like an unnamed generic tall human with height mentioned once.`
        : null;
    const artStyleLine = forgeArt
      ? `- Art style (forge): ${forgeArt} — keep rendering discipline consistent with this choice; do not jump to an unrelated style unless RAW_TEXT demands it.`
      : null;
    const portraitLock = String(characterData.portraitConsistencyLock ?? characterData.portrait_consistency_lock ?? "").trim();
    const portraitLockLine = portraitLock
      ? isChatSessionStill
        ? chatMenuSceneLock
          ? `- **Character bible + roster portrait URL (likeness only):** Match ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} from Character Details and any **HTTPS still** in the prompt. **Wardrobe, pose, set, background, props, lighting** = PRIMARY SCENE / menu — **not** the portrait’s sofa room, crop, or costume. ${portraitLock}`
          : `- **Character bible + roster portrait URL (likeness only):** Match ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} from Character Details and any **HTTPS still** in the prompt. **Environment, pose, wardrobe, props** = **user message + PRIMARY SCENE** — **not** the portrait’s interior or couch unless the user asked for that same room. ${portraitLock}`
        : `- **Portrait / roster continuity:** ${portraitLock}`
      : null;

    const defaultClothing = stylizedSilhouette
      ? `Wardrobe and materials that fit this species/body and art style — not a generic unrelated human runway look unless the character is clearly humanoid glam.`
      : "elegant, sexy, provocative clothing with lace, leather, straps, sheer fabrics, corsets, harnesses, or any style the character would wear";
    const defaultPose = stylizedSilhouette
      ? `Pose that clearly sells the forge body type — correct limbs, tail, wings, hybrid junction, or non-human mass as implied; same character identity from the text profile.`
      : "seductive and provocative pose";

    const menuSceneClothingLine =
      "**PRIMARY SCENE + menu preset only:** every garment, fabric state, coverage, jewelry, and prop worn or held must match the user’s chosen gallery category — **not** the roster/profile card outfit, **not** a generic bikini/studio wrap unless the menu text explicitly calls for it.";
    const menuScenePoseLine =
      "**PRIMARY SCENE + menu preset only:** full-body stance, limb angles, weight shift, prop interaction, gaze direction, and camera geometry (selfie arm, mirror, tripod, environmental wide shot, etc.) must match the menu category — **forbidden:** repeating the catalog portrait pose, head-and-shoulders stock framing, or a neutral three-quarter “card photo” unless the menu asks for that exact framing.";

    const effectiveClothing =
      menuSceneLockEffective && !String(characterData.clothing ?? "").trim().startsWith("**PRIMARY SCENE")
        ? menuSceneClothingLine
        : String(characterData.clothing ?? "").trim() || defaultClothing;
    const effectivePose =
      menuSceneLockEffective && !String(characterData.pose ?? "").trim().startsWith("**PRIMARY SCENE")
        ? menuScenePoseLine
        : String(characterData.pose ?? "").trim() || defaultPose;

    const visualCapsuleRaw = String(
      cd.visual_identity_capsule ?? cd.visualIdentityCapsule ?? "",
    ).trim();
    const visualCapsuleLine =
      menuSceneLockEffective && visualCapsuleRaw
        ? `- FORGE_VISUAL_IDENTITY (binding — looks + art style; echo of client capsule): ${visualCapsuleRaw.slice(0, 2200)}${visualCapsuleRaw.length > 2200 ? "…" : ""}`
        : "";

    const genderLine = String(cd.gender ?? cd.subjectGender ?? cd.subject_gender ?? "").trim();
    const characterDetailsBlock = [
      "Character Details:",
      genderLine ? `- **Gender / presentation (from card — do not change):** ${genderLine}` : "",
      visualCapsuleLine,
      bodyTypeLine,
      bodyContract ? `- **Silhouette contract (verbatim priority):** ${bodyContract}` : "",
      statureEmphasisLine,
      artStyleLine,
      portraitLockLine,
      `- Ethnicity / skin tone: ${characterData.ethnicity || "any"}`,
      `- Age range: ${characterData.ageRange || "young adult"}`,
      `- Hair: ${characterData.hair || "any style and color"}`,
      `- Eyes: ${characterData.eyes || "expressive and beautiful"}`,
      `- Clothing / outfit: ${effectiveClothing}`,
      `- Pose: ${effectivePose}`,
      `- Expression / mood: ${characterData.expression || "seductive, confident, mysterious, or alluring"}`,
      `- Overall vibe: ${characterData.vibe || "extremely sexy and artistic"}`,
    ]
      .filter((line): line is string => line != null && line !== "")
      .join("\n");

    const refLinesRaw = [
      characterData.referencePalette
        ? `- Loosely echo this abstract color mood from a user-supplied reference thumbnail (palette only; do not copy any real person's face): ${characterData.referencePalette}`
        : "",
      characterData.referenceNotes
        ? `- User style notes (interpret as generic art direction, not likeness): ${characterData.referenceNotes}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
    /** Menu tiles: never pull “palette from reference thumbnail” — it steers models back toward the card look. */
    const refLines = menuSceneLockEffective ? "" : refLinesRaw;

    const needsFinalAnimeLead = isAnime && !FORGE_ANIME_STYLE_LOCK_REGEX.test(safeRewritten);
    const animeFinalLead = needsFinalAnimeLead ? `${buildAnimeTemptationStyleLead(tierRewrite)}\n\n` : "";

    const adultUniversalBase =
      effectiveTier === "full_adult_art" && isChatSessionStill
        ? menuSceneLockEffective
          ? CHAT_SESSION_MENU_STILL_IMAGINE_BASE
          : CHAT_SESSION_IMAGINE_CREATIVE_BASE
        : UNIVERSAL_NON_PREVIEW_IMAGE_BASE;

    /** Never repeat long `baseDescription` from client for menu lock — it often pastes roster card prose first. */
    const subName = String(name || cd.subjectName || cd.subject_name || "").trim();
    const subGender = String(cd.subjectGender || cd.subject_gender || "").trim();
    const subBody = String(characterData.bodyType ?? "").trim();
    const subjectTag = [subName || "the companion", subGender || "adult presenting"].join(" · ");
    const imagingSubjectDescription =
      menuSceneLockEffective && effectiveTier === "full_adult_art" && isChatSessionStill
        ? `Single subject — ${subjectTag}${subBody ? ` · body type: ${subBody}` : ""}. **Chat gallery menu still:** **Likeness** = same person as Character Details / any **HTTPS roster still** in the prompt (face, hair, eyes, skin, tattoos, species) plus written bible — **not** a remaster or resize of that card. CHARACTER DETAILS = **identity** (read the bible; **ignore** card outfit/room/pose embedded in prose when they conflict PRIMARY SCENE). **Do not** match swimsuit, beach, marketing-still palette, or catalog framing unless PRIMARY SCENE demands it. **PRIMARY SCENE** = sole wardrobe, set, pose, props, lens.`
        : baseDescription;

    const finalPromptRaw = effectiveTier === "forge_preview_sfw"
      ? `${animeFinalLead}
${PORTRAIT_IMAGE_DESIGN_BRIEF}

Character identity seed from the forged card (gender, species, silhouette, wardrobe tone — obey literally; this block is authoritative for who is in the frame):
${baseDescription}

${characterDetailsBlock}

Additional rules (must agree with the universal mandate above):
${FORGE_PREVIEW_IMAGINE_HARD_SFW}
${forgeBody ? `- **Forge body type** (Character Details) overrides any conflicting silhouette or species wording in the primary scene text below — match the physique spec (human builds, stature, mobility, anthro, hybrid, elemental, hyper-shape, etc.); never paint that spec as legible text on the image.` : ""}
${isAnime ? "- **2D anime discipline:** Authentic flat/soft-cel **2D anime illustration** — preserve stylized proportions, clean line art, and anime eyes; do not convert to photoreal or 3D.\n" : ""}
- ${anatomyKeyRules}
- Highly detailed, cinematic lighting, premium quality, vertical portrait composition — collectible quality without any printed titles, category names, or typography on the canvas
${refLines ? `${refLines}\n` : ""}

PRIMARY SCENE (rewritten direction — stay strictly SFW; match the card identity and theme):
${safeRewritten}
    `.trim()
      : (() => {
        const adultHead = `${animeFinalLead}${IMAGINE_META_NO_ON_CANVAS_TEXT}

${adultUniversalBase}
`;
        const adultVisualRules = `Visual rules:
- **No text from this prompt on the canvas:** Do not paint META lines, policy lines, markdown headers, slogans, product names, the words "private," "gallery," "session," "companion," "adults-only," or any instruction as visible typography — including elegant gold serif captions. Pure environmental photograph only.
- No legible logos, watermarks, UI chrome, fake app branding, or readable product/store signage in-frame.
- **Tasteful adult:** lingerie, sheer fabric with coverage, sheet-drape editorial, and strong tease are in-bounds; avoid hardcore pornographic depiction, graphic penetration, or obscene gynecological close-ups — premium boudoir / editorial tone.
- **Likeness vs outfit:** Keep **one consistent individual** per Character Details / character bible — face, hair, skin, and body type — when any **roster still URL** appears in the prompt, **match that person’s** features and marks while obeying PRIMARY SCENE for **wardrobe, pose, room, props, and lighting** — but **do not** invent wardrobe from an imaginary “card photo.” When PRIMARY SCENE describes lingerie, gym, rain, bed, steam, etc., **invent** scene-accurate clothing and coverage per PRIMARY SCENE (no default bikini paste).
${isChatSessionStill && !menuSceneLockEffective ? "- **Chat still (generate, not edit):** Identity from Character Details + any roster portrait URL **in text** — **no** reference image is sent to a photo-edit API, so **PRIMARY SCENE + the user’s words** define location (cabin, snow, beach, gym, etc.). Do **not** default to the portrait’s sofa, bedroom, or studio backdrop unless the user asked for that same room.\n" : ""}
${isChatSessionStill && menuSceneLockEffective ? "- **Gallery menu still (generate, not edit):** Identity from the character bible + roster URL in Character Details when present. **Wardrobe, pose, room, props, light, and crop** = PRIMARY SCENE / menu only — **not** a static marketing still, **not** forge packshot prose as a shot list.\n" : ""}
${chatMenuSceneLock && isChatSessionStill ? "- **Gallery menu lock:** PRIMARY SCENE must realize the **menu category’s** location and action — **not** a head-and-shoulders glam reskin. If PRIMARY SCENE names a bed, car, tub, desk, beach, shower, gym, etc., the **environment and body–world interaction** must clearly show that place.\n" : ""}
${
            isAnime
              ? "- **2D anime discipline:** Render as authentic flat/soft-cel **2D anime illustration** matching PRIMARY SCENE — preserve stylized proportions, line art, and anime eyes; do not convert to photoreal or 3D."
              : "- **Chibi / exaggerated card art:** If written lore implies super-deformed or stylized art, still render a **coherent photoreal adult human** who matches the **described** face, hair, and vibe — believable anatomy unless PRIMARY SCENE explicitly asks for stylized output."
          }
${portraitLock && !isChatSessionStill ? `- **Portrait / roster continuity** (Character Details) wins over casual drift in PRIMARY SCENE — same character, same body-type label, same art style family unless RAW_TEXT explicitly requests a deliberate alternate.` : ""}
${portraitLock && isChatSessionStill ? `- **Character bible** (written profile) anchors identity; PRIMARY SCENE wins on pose, wardrobe, location, and lighting unless the user explicitly overrides.` : ""}
${forgeBody ? `- **Forge body type + silhouette contract** (Character Details) override conflicting silhouette, species, or build wording in the scene text below.` : ""}
- ${anatomyKeyRules}
${
            menuSceneLockEffective
              ? "- Premium lighting and cinematic composition — **story / environment / pose** lead the frame (not a default glam bust-up or catalog three-quarter)."
              : "- Premium lighting, cinematic composition, flattering portrait discipline."
          }
${refLines ? `${refLines}\n` : ""}`;
        const menuFirst =
          menuSceneLockEffective && effectiveTier === "full_adult_art" && isChatSessionStill;
        if (menuFirst) {
          return `${adultHead}

PRIMARY SCENE (authoritative — execute literally; no roster-card remake):
${safeRewritten}

Create a highly detailed, cinematic, vertical 2:3 (trading-card) image of ${imagingSubjectDescription}.

${characterDetailsBlock}

${adultVisualRules}`.trim();
        }
        return `${adultHead}

Create a highly detailed, cinematic, vertical 2:3 (trading-card) image of ${imagingSubjectDescription}.

${characterDetailsBlock}

${adultVisualRules}

PRIMARY SCENE (follow closely — rewriter output is authoritative for mood and explicitness):
${safeRewritten}`.trim();
      })();
    const companionIdForRef = String(cd.companionId ?? cd.companion_id ?? "").trim();
    const charRefResolved = await resolveCharacterReferenceForImagine(supabase, companionIdForRef, cd);
    const finalPromptRawEnriched = enrichImaginePromptUniversal({
      corePrompt: finalPromptRaw,
      characterReference: charRefResolved,
    });
    const finalPromptClamped = clampPromptForImagine(finalPromptRawEnriched, TOGETHER_IMAGE_PROMPT_SOFT_LIMIT);
    const finalPrompt = isChatSessionStill ? sanitizeMomentsImaginePromptText(finalPromptClamped) : finalPromptClamped;

    let imageDataUrl: string;
    try {
      const { dataUrl } = await grokGenerateImageDataUrl({
        apiKey: xaiKey,
        prompt: finalPrompt,
        getEnv: (n) => Deno.env.get(n),
        aspectRatio: "2:3",
        likenessEditSourceUrl: undefined,
      });
      imageDataUrl = dataUrl;
    } catch (imgErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost, "Grok image error");
        tokensCharged = false;
      }
      const msg = imgErr instanceof Error ? imgErr.message : String(imgErr);
      return new Response(
        JSON.stringify({
          success: false,
          error:
            /xai|together|content policy|moderation|blocked|safety|422/i.test(msg)
              ? msg
              : `Image generation failed: ${msg}. Your forge credits were refunded if this run charged you.`,
          tokensRefunded: tokenCost > 0,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const bucket = isPortrait ? "companion-portraits" : "companion-images";
    let imageBytes: Uint8Array;
    let uploadContentType: string;
    let fileExt: string;
    try {
      const decoded = decodeImageDataUrl(imageDataUrl);
      imageBytes = decoded.binary;
      uploadContentType = decoded.contentType;
      fileExt = decoded.ext;
    } catch (dlErr) {
      if (tokensCharged) {
        await refundTokens(supabase, userId, tokenCost, "image download failed");
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

    const fileName = isPortrait
      ? `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
      : `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, imageBytes, { contentType: uploadContentType, upsert: true });

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
        await refundTokens(supabase, userId, tokenCost, "post-generation save failed");
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
        await refundTokens(sb, chargedUserId, tokenCost, "request error / emergency refund");
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
