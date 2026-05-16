/** Per-companion: skip "Generate image" confirmation and spend immediately. */
import {
  CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK,
  CHAT_LIKENESS_FREEFORM_IDENTITY_LEAD,
  CHAT_LIKENESS_MENU_PRESET_IDENTITY_LEAD,
  CHAT_LIKENESS_SCENE_PRIMACY_FOOTER,
  CHAT_LIKENESS_STILL_MENU_IDENTITY_TAIL,
  CHAT_LIKENESS_SUBJECT_ANCHOR,
  CHAT_LIKENESS_SUBJECT_FEATURES_INLINE,
  CHAT_LIKENESS_WRAP_KEEP_LINE,
} from "@/lib/chatLikenessAnchors";
import {
  CHARACTER_REFERENCE_INTRO_LINES,
  IMAGINE_QUALITY_NEGATIVE_LINE,
  IMAGINE_QUALITY_POSITIVE_LINE,
} from "@/lib/characterReferenceImagePrompt";

const AUTO_IMAGE_KEY = "lustforge-chat-auto-image";

export function getChatAutoSpendImages(companionId: string): boolean {
  try {
    return localStorage.getItem(`${AUTO_IMAGE_KEY}:${companionId}`) === "1";
  } catch {
    return false;
  }
}

export function setChatAutoSpendImages(companionId: string, enabled: boolean): void {
  try {
    localStorage.setItem(`${AUTO_IMAGE_KEY}:${companionId}`, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/** First 5 explicit (NSFW) image gens per user+companion are free (no forge credits). */
export const FREE_NSFW_CHAT_IMAGES = 5;
const FREE_NSFW_KEY = "lustforge-free-nsfw-chat-img";

export function getFreeNsfwImagesUsed(userId: string, companionId: string): number {
  try {
    const v = parseInt(localStorage.getItem(`${FREE_NSFW_KEY}:${userId}:${companionId}`) || "0", 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  } catch {
    return 0;
  }
}

export function incrementFreeNsfwImagesUsed(userId: string, companionId: string): void {
  try {
    const n = getFreeNsfwImagesUsed(userId, companionId);
    if (n < FREE_NSFW_CHAT_IMAGES) {
      localStorage.setItem(`${FREE_NSFW_KEY}:${userId}:${companionId}`, String(n + 1));
    }
  } catch {
    /* ignore */
  }
}

/** Paid chat clip (Grok Imagine video ~5–15s). Same as `CHAT_SHORT_VIDEO_FC` in forgeEconomy. */
export { CHAT_SHORT_VIDEO_FC as CHAT_VIDEO_TOKEN_COST } from "@/lib/forgeEconomy";

/** Binding for every FAB / gallery still that reads as a “selfie” — keeps Grok from painting a phone in hand. */
export const CHAT_IMAGINE_SELFIE_NO_PHONE_BLOCK = `**No phone in frame:** arm-extended POV, mirror, tripod, or partner-held camera only — zero smartphone / screen / case visible.`;

/** Sensual tier — short; avoids burying likeness lines elsewhere. */
export const CHAT_IMAGINE_LEWD_TASTEFUL_BLOCK = `**Sensual tier:** lingerie, sheer with coverage, silk, editorial tease — perfume-ad only; **not** explicit acts. **Hard no:** bare genitals, porn staging, phone in hand, deformed anatomy, extra fingers or duplicated limbs.`;

/**
 * Single opening block for Moments / menu + FAB paths: likeness beats everything else.
 * Placed at the top of the fused “Requested framing” section (before smart-tile scene text).
 */
export const CHAT_MOMENTS_LIKENESS_FIRST_BLOCK = `**#1 PRIORITY — SAME PERSON AS MAIN PORTRAIT:** Face, hair, eyes, brows, skin tone, body type, tattoos, species marks, and **art style** must match the roster portrait + CHARACTER APPEARANCE — **not** a generic model, stock face, or “similar” influencer. **Forbidden:** remastering the profile card (same sofa room, catalog chair glam, head-and-shoulders packshot) unless the menu text names that exact place.

${CHAT_LIKENESS_MENU_PRESET_IDENTITY_LEAD}

${CHAT_LIKENESS_SUBJECT_ANCHOR}`;

/** Default human anatomy; fantasy / non-human only when CHARACTER APPEARANCE explicitly says so. */
export const CHAT_MOMENTS_ANATOMY_DEFAULT_BLOCK = `**#2 ANATOMY (default = human):** Exactly **two arms, two legs**, **five fingers per hand**, one face, natural joint count; **at most one tail** unless appearance text specifies multiple. **Unless CHARACTER APPEARANCE explicitly describes otherwise** (e.g. wings, extra limbs, tentacles, naga lower body, digit count, amputation) — do **not** add extra arms, legs, fingers, mirrored phantom limbs, fused or melted hands, stacked heads, or duplicate faces.`;

/** Appended for Grok Imagine when a chat still tile supplies `styledSceneExtension` (Moments gallery). Likeness + anatomy first so they are not buried under quality fluff. */
export const CHAT_STILL_MENU_QUALITY_AND_ANATOMY = `${CHAT_MOMENTS_ANATOMY_DEFAULT_BLOCK}

**#3 RENDER QUALITY:** ${IMAGINE_QUALITY_POSITIVE_LINE}

**Avoid:** ${IMAGINE_QUALITY_NEGATIVE_LINE}

**Scene vs card:** Outfit, pose, background, props, light = **this menu + chat** only — do not copy roster packshot wardrobe, room, or crop.

${CHAT_LIKENESS_STILL_MENU_IDENTITY_TAIL}

${CHAT_IMAGINE_SELFIE_NO_PHONE_BLOCK}

${CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK}`;

/** Moments FAB tiers: Selfie (SFW) + Sensual (internal key \`lewd\`). */
export const FAB_SELFIE = {
  sfw: {
    display: [
      "I'd love a cute selfie from you 📸",
      "Can I see your pretty face right now?",
      "Send me something sweet and flirty~",
      "Show me how you look today 💕",
      "A cute selfie would make my day...",
    ],
    imagePrompt:
      "**Selfie tier (SFW):** Same person as main portrait — face, hair, eyes, body, art style **unchanged**. New outfit + location from **Requested framing** only; fully clothed; no lingerie focus. POV/mirror/tripod — no phone visible. **Reject:** generic model, catalog room remaster, random chair portrait.",
  },
  lewd: {
    display: [
      "Send me something hot — surprise me 🔥",
      "I want to see you being a little naughty...",
      "Tease me with something wild~",
      "Show me a sensual selfie, I'm ready...",
      "Don't be shy... let me see more of you 💋",
    ],
    imagePrompt:
      "**Sensual tier:** Same person as main portrait — identity locked; not a different body or face. Lingerie / sheer / editorial tease only; no explicit acts; no phone. New pose + set from **Requested framing** only. **Reject:** generic glam model, sofa packshot, extra limbs or bad hands.",
  },
} as const;

export type FabSelfieTier = keyof typeof FAB_SELFIE;

/**
 * Resolves chat line for + menu selfies: random line from `display` when it is an array
 * (so `sendMessage` always receives a string — arrays have no `.trim()` and would noop).
 */
export function resolveFabDisplay(display: string | readonly string[]): string {
  if (typeof display === "string") return display.trim();
  const arr = display.length ? [...display] : [];
  if (arr.length === 0) return "";
  const line = arr[Math.floor(Math.random() * arr.length)] ?? arr[0];
  return String(line).trim();
}

/**
 * When the user clearly wants a picture (typed or voice-to-text).
 * Relaxed length for short explicit image asks.
 */
/** True when typed or voice text should run the chat image pipeline (Grok Imagine), not text-only chat. */
export function wantsChatImageFromText(text: string): boolean {
  return isImageRequestText(text);
}

export function isImageRequestText(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC").trim();
  if (t.length < 6) return false;

  if (inferChatImageGenerationPrompt(text)) return true;

  // Flexible phrasing: "send me a sexy picture", "a new image", "pic of yourself", etc.
  if (
    /\b(another|a new|one more|new)\s+(image|picture|pic|photo|selfie)\b/i.test(t) ||
    /\b(pic|picture|photo|image|selfie)\s+of\s+(you|yourself|u)\b/i.test(t) ||
    /\b(send|show|give)\s+me\b[\s\S]{0,48}\b(pic|picture|photo|image|selfie)\b/i.test(t) ||
    /\b(can|could)\s+i\s+(get|have|see)\b[\s\S]{0,40}\b(pic|picture|photo|image|selfie)\b/i.test(t) ||
    /\b(gen|generate|creating|create)\b[\s\S]{0,20}\b(image|picture|pic|photo)\b/i.test(t) ||
    /\bask(ing|ed)?\b[\s\S]{0,32}\b(for\s+)?(a\s+)?(pic|picture|photo|image|selfie)\b/i.test(t)
  ) {
    return true;
  }

  if (t.length < 10) {
    if (
      /\b(send nudes|send nude|nude pic|nude selfie|naked selfie|a selfie|selfie please|pic please|photo please)\b/i.test(
        t,
      )
    ) {
      return true;
    }
    return false;
  }

  const phrases = [
    "send me a picture",
    "send me a photo",
    "send me an image",
    "send me a pic",
    "send a picture",
    "send a photo",
    "send an image",
    "send a pic",
    "send nudes",
    "take a picture",
    "take a photo",
    "take a selfie",
    "take a pic",
    "take another pic",
    "take another picture",
    "generate a picture",
    "generate an image",
    "generate image",
    "generate a photo",
    "create an image",
    "create a picture",
    "create image",
    "draw yourself",
    "draw you a",
    "draw me a",
    "paint me a",
    "paint yourself",
    "photo of you",
    "picture of you",
    "image of you",
    "portrait of you",
    "what do you look like",
    "show yourself",
    "show me what you look like",
    "show me a picture",
    "show me a photo",
    "show me an image",
    "let me see you",
    "can i see you",
    "can i see what you look like",
    "see what you look like",
    "snap a pic",
    "snap a photo",
    "another selfie",
    "take a selfie for",
    "selfie for me",
    "send me a selfie",
    "a selfie from you",
    "selfie from you",
    "send me something lewd",
    "something lewd",
    "lewd selfie",
    "lewd pic",
    "lewd picture",
    "nude selfie",
    "nude picture",
    "nude photo",
    "nsfw selfie",
    "nsfw pic",
    "spicy pic",
    "spicy selfie",
    "strip for me",
    "lose the clothes",
    "without your clothes",
    "take it off",
    "flash me",
    "show me your body",
    "want to see you",
    "need a selfie",
    "need a pic",
    "need an image",
    "want a pic",
    "want a picture",
    "want a photo",
    "want a selfie",
    "want to see a pic",
    "hit me with a pic",
    "drop a pic",
    "selfie of yourself",
    "photo of yourself",
    "picture of yourself",
  ];

  if (phrases.some((p) => t.includes(p))) return true;

  return false;
}

/**
 * Map casual / voice phrasing to the same generation briefs as the + menu when intent is clear.
 * Otherwise callers fall back to the user’s exact words.
 */
export function inferChatImageGenerationPrompt(text: string): string | undefined {
  const t = text.toLowerCase().normalize("NFKC");

  const crudePicIntent =
    /\b(send|show|give)\b[\s\S]{0,40}\b(selfie|pic|picture|photo|image)\b/i.test(t) &&
    /\b(no clothes|nothing on|undress|take it off|lose the clothes|strip)\b/i.test(t);

  if (
    /\b(full\s*nudity|spread\s*(eagle|open)|on\s*your\s*knees|all\s*fours)\b/i.test(t) ||
    crudePicIntent ||
    ((/\bnsfw\b|\buncensored\b|\bx-?rated\b|\bhardcore\b/i.test(t) ||
      /\bsend\s+nu?des?\b/i.test(t) ||
      /\bnu?de\s+(selfie|pic|picture|photo)\b/i.test(t) ||
      /\b(completely|fully)\s+na?ked\b/i.test(t)) &&
      /\b(selfie|pic|picture|photo|image|send|show|take|draw|generate)\b/i.test(t))
  ) {
    return FAB_SELFIE.lewd.imagePrompt;
  }

  const lewdIntent =
    /\b(lewd selfie|lewd pic|lewd picture|lingerie|sheer|topless|teasing|spicy selfie|spicy pic|something\s+hot|something\s+naughty|something\s+dirty|turn\s+me\s+on|thirst\s*trap)\b/i.test(t) ||
    (/\b(sexy|seductive|erotic|risqu[eé]|sensual)\b/i.test(t) &&
      /\b(selfie|pic|picture|photo|image|send|show|give)\b/i.test(t)) ||
    (/\blewd\b/i.test(t) && /\b(selfie|pic|picture|photo|send|show)\b/i.test(t)) ||
    (/\bhot\b/i.test(t) && /\b(selfie|pic|picture|photo|image|send)\b/i.test(t));

  if (lewdIntent) return FAB_SELFIE.lewd.imagePrompt;

  const sfwIntent =
    /\b(cute selfie|casual selfie|sfw selfie|sweet selfie|pretty selfie|outfit pic|clothed selfie)\b/i.test(t) ||
    (/\b(cute|casual|sweet|pretty)\b/i.test(t) &&
      /\b(selfie|pic|picture|photo)\b/i.test(t) &&
      !/\b(lewd|nsfw|explicit|sexy|hot|erotic)\b/i.test(t));

  if (sfwIntent) return FAB_SELFIE.sfw.imagePrompt;

  const beachSwim =
    /\b(beach|shore|coast|ocean|seaside|sand|boardwalk|tropical|caribbean|mediterranean)\b/i.test(t) &&
    /\b(bikini|swimsuit|swimwear|two-piece|one-piece|bathing\s*suit|swim\s*top)\b/i.test(t);
  if (beachSwim) {
    return [
      "SFW swim editorial inferred from the user's words: honor **their** beach/coast geography and **their** swim silhouette (colors, cover-ups, rash guard, sarong, hat) — do **not** substitute the roster card bikini as the default wardrobe.",
      "**Same roster companion identity** as CHARACTER APPEARANCE + portrait likeness (face, hair, ears, skin, body, tattoos) — not a different model; believable adult proportions; flattering sun + fill; candid vacation energy.",
      FAB_SELFIE.sfw.imagePrompt,
      CHAT_IMAGINE_SELFIE_NO_PHONE_BLOCK,
    ].join(" ");
  }

  return undefined;
}

/** Rough NSFW / explicit image request — qualifies for free-tier counter when under cap. */
export function isExplicitImageRequest(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC");
  const needles = [
    "nude",
    "nudes",
    "nudity",
    "naked",
    "nsfw",
    "explicit",
    "lewd",
    "cock",
    "dick",
    "pussy",
    "tits",
    "boobs",
    "nipple",
    "genitals",
    "send nudes",
    "no clothes",
    "without clothes",
    "fully naked",
    "bare ",
    "fuck me",
    "blowjob",
    "cum ",
    "orgasm",
    "masturbat",
    "spicy pic",
    "xxx",
    "filthy",
    "raunchy",
    "uncensored",
    "x-rated",
    "hardcore",
    "sexy pic",
    "sexy photo",
    "sexy selfie",
    "sexy picture",
    "erotic",
    "seductive",
    "lingerie",
    "topless",
    "bottomless",
    "undressed",
    "unclothed",
    "something hot",
    "something naughty",
  ];
  return needles.some((n) => t.includes(n));
}

function menuMatchesFabTier(menu: string, tier: FabSelfieTier): boolean {
  const base = FAB_SELFIE[tier].imagePrompt;
  return menu === base || menu.startsWith(`${base}\n`);
}

function fabTierImagineRails(menu: string): string {
  const rails: string[] = [];
  if (menuMatchesFabTier(menu, "sfw") || menuMatchesFabTier(menu, "lewd")) {
    rails.push(CHAT_IMAGINE_SELFIE_NO_PHONE_BLOCK);
  }
  if (menuMatchesFabTier(menu, "lewd")) {
    rails.push(CHAT_IMAGINE_LEWD_TASTEFUL_BLOCK);
  }
  return rails.length ? `\n\n${rails.join("\n\n")}` : "";
}

function wrapFabSceneWithAppearanceLock(inner: string, identityReference: string): string {
  const ref = identityReference.trim();
  if (!ref) return inner;
  const lock = `**Likeness lock:** Reproduce **only** ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} from the reference below — same person as main portrait. **Do not** copy this block's background, furniture, chair, crop, or outfit into the new scene.`;
  return [
    "══════════════════════════════════════",
    "**#0 CHARACTER REFERENCE — READ FIRST (identity only)**",
    "══════════════════════════════════════",
    "",
    CHARACTER_REFERENCE_INTRO_LINES,
    "",
    ref,
    "",
    lock,
    "",
    "══════════════════════════════════════",
    "**SCENE TO RENDER (menu + instructions below)**",
    "══════════════════════════════════════",
    "",
    inner.trim(),
    "",
    "**Final check:** Subject = reference above; environment = **Requested framing** only.",
    CHAT_LIKENESS_WRAP_KEEP_LINE,
  ].join("\n");
}

/**
 * Resolves the image brief for `generate-image` (Grok Imagine + rewriter).
 * Menu / FAB flows pass `menuImagePrompt`; free-typed chat uses inference, but never replaces
 * clearly explicit user wording with a SFW preset.
 */
export function resolveChatImageGenerationPrompt(args: {
  messageText: string;
  menuImagePrompt?: string | null;
  /** Merged after tier base when user picks a smart menu style (still uses exact FAB tier string for mood). */
  styledSceneExtension?: string | null;
  /** From DB — primary likeness anchor for FAB / media-bar selfie & lewd tiers. */
  appearanceReference?: string | null;
  /** DB `character_reference` — wins over appearanceReference when set. */
  characterReference?: string | null;
}): string {
  const menu = args.menuImagePrompt?.trim();
  const styled = args.styledSceneExtension?.trim();
  const appearanceRef =
    (args.characterReference?.trim() || args.appearanceReference?.trim() || "").trim();
  if (menu) {
    const subjectAnchor = `${CHAT_MOMENTS_LIKENESS_FIRST_BLOCK}\n\n`;
    const lewdLighting =
      menuMatchesFabTier(menu, "lewd")
        ? "\n\n**Sensual lighting:** Key the face clearly — no mushy bloom on eyes or mouth."
        : "";
    const tierRails = fabTierImagineRails(menu);
    const coherence =
      `\n\n**Forge look DNA (not the photograph):** hair, eyes, skin, species, body type, art style — from CHARACTER APPEARANCE + portrait; **not** sofa, wall, or outfit from the card unless the menu says so.\n\n${CHAT_LIKENESS_SCENE_PRIMACY_FOOTER}\n\n**Shot:** Match **Requested framing** literally (place, pose, wardrobe). **No** substitute “pretty person standing in plain room.”\n\n${CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK}`;
    if (styled) {
      const fused = (
        `— Requested framing (from menu) —\n${subjectAnchor}${styled}\n\n${CHAT_STILL_MENU_QUALITY_AND_ANATOMY}${lewdLighting}${tierRails}\n\n**Exposure / tone context (not the shot layout):**\n${menu}${coherence}`
      ).trim();
      return appearanceRef ? wrapFabSceneWithAppearanceLock(fused, appearanceRef) : fused;
    }
    // Tier-only (FAB / media bar): same anatomy + likeness rails as gallery tiles; tier string carries exposure + pose hints.
    const tierOnly = (
      `— Requested framing (from menu) —\n${subjectAnchor}${menu}\n\n${CHAT_STILL_MENU_QUALITY_AND_ANATOMY}${lewdLighting}${tierRails}${coherence}`
    ).trim();
    return appearanceRef ? wrapFabSceneWithAppearanceLock(tierOnly, appearanceRef) : tierOnly;
  }

  const raw = args.messageText.trim();
  if (!raw) return raw;

  const wrapFreeform = (body: string) => {
    const inner = `${CHAT_LIKENESS_FREEFORM_IDENTITY_LEAD}\n\n${body.trim()}`.trim();
    return appearanceRef ? wrapFabSceneWithAppearanceLock(inner, appearanceRef) : inner;
  };

  const inferred = inferChatImageGenerationPrompt(raw);
  if (!inferred) return wrapFreeform(raw);

  const userExplicit = isExplicitImageRequest(raw);
  const inferredExplicit = isExplicitImageRequest(inferred);
  if (userExplicit && !inferredExplicit) return wrapFreeform(raw);

  return wrapFreeform(`${inferred}${fabTierImagineRails(inferred)}`.trim());
}

export {
  PORTRAIT_CARD_ASPECT,
  PORTRAIT_ASPECT_TOLERANCE,
  PORTRAIT_CARD_ASPECT_CLASS,
  isPortraitCardRatio,
  isAcceptableChatPortraitUpload,
} from "./portraitAspect";

/** @deprecated use PORTRAIT_CARD_ASPECT */
export { PORTRAIT_CARD_ASPECT as PORTRAIT_ASPECT_TARGET } from "./portraitAspect";

/** @deprecated use isAcceptableChatPortraitUpload */
export { isAcceptableChatPortraitUpload as isPortraitNineSixteen } from "./portraitAspect";

export function loadImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions."));
    img.src = src;
  });
}
