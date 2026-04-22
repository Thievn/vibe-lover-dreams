/** Per-companion: skip "Generate image" confirmation and spend immediately. */
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

/** Paid chat clip (Tensor I2V ~10s). Lower than legacy Grok clip pricing. */
export const CHAT_VIDEO_TOKEN_COST = 100;

/** Quick Action Buttons for image requests in chat */
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
      "SFW phone selfie, fully clothed, same person as the character, flattering light, looking at camera, " +
      "soft natural look — not a nude or lingerie shot.",
  },

  lewd: {
    display: [
      "Send me something hot — surprise me 🔥",
      "I want to see you being a little naughty...",
      "Tease me with something spicy~",
      "Show me a lewd selfie, I'm ready...",
      "Don't be shy... let me see more of you 💋",
    ],

    imagePrompt:
      "Lewd teasing phone selfie, same person as the character, lingerie / sheer / undressing / topless as fits the pose, " +
      "flirty eye contact, warm intimate lighting, photoreal — not a chaste SFW headshot unless that matches the look.",
  },

  nude: {
    display: [
      "I want to see all of you — don't hold back 💦",
      "Show me everything... I'm dying to see you nude",
      "Full nude selfie please, no hiding~",
      "Be completely bare for me...",
      "I need to see you fully naked right now 🔥",
    ],

    imagePrompt:
      "NSFW nude phone selfie, full nudity, same person and body type as the character, photoreal, explicit adult framing, " +
      "uncensored — match the subject’s real anatomy and sex. Natural pose and light; no modesty bar, no censorship, no SFW cutaway.",
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
 * Relaxed length for short explicit asks like “send nudes”.
 */
/** True when typed or voice text should run the chat image pipeline (Tensor), not text-only Grok. */
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

  const nudeIntent =
    /\b(full\s*nude|fully nude|full\s*nudity|nude selfie|nude pic|nude picture|send nudes|send nude|naked selfie|completely naked|fully naked|bare all|bare for me|no clothes|nothing on|all\s*fours|spread\s*(eagle|open)|on\s*your\s*knees)\b/i.test(
      t,
    ) ||
    (/\bnude\b|\bnaked\b|\bnsfw\b/i.test(t) &&
      /\b(selfie|pic|picture|photo|image|send|show|take)\b/i.test(t)) ||
    (/\b(uncensored|x-?rated|hardcore)\b/i.test(t) &&
      /\b(selfie|pic|picture|photo|image|send|show|draw|generate)\b/i.test(t));

  if (nudeIntent) return FAB_SELFIE.nude.imagePrompt;

  const lewdIntent =
    /\b(lewd selfie|lewd pic|lewd picture|lingerie|sheer|topless|teasing|spicy selfie|spicy pic|something\s+hot|something\s+naughty|something\s+dirty|turn\s+me\s+on|thirst\s*trap)\b/i.test(t) ||
    (/\b(sexy|seductive|erotic|risqu[eé])\b/i.test(t) &&
      /\b(selfie|pic|picture|photo|image|send|show|give)\b/i.test(t)) ||
    (/\blewd\b/i.test(t) && /\b(selfie|pic|picture|photo|send|show)\b/i.test(t)) ||
    (/\bhot\b/i.test(t) && /\b(selfie|pic|picture|photo|image|send)\b/i.test(t));

  if (lewdIntent) return FAB_SELFIE.lewd.imagePrompt;

  const sfwIntent =
    /\b(cute selfie|casual selfie|sfw selfie|sweet selfie|pretty selfie|outfit pic|clothed selfie)\b/i.test(t) ||
    (/\b(cute|casual|sweet|pretty)\b/i.test(t) && /\b(selfie|pic|picture|photo)\b/i.test(t) && !/\b(nude|naked|lewd|nsfw|explicit|sexy|hot|erotic)\b/i.test(t));

  if (sfwIntent) return FAB_SELFIE.sfw.imagePrompt;

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

/**
 * Resolves the diffusion brief for `generate-image-tensor`.
 * Menu / FAB flows pass `menuImagePrompt`; free-typed chat uses inference, but never replaces
 * clearly explicit user wording with a SFW preset.
 */
export function resolveChatImagePromptForTensor(args: {
  messageText: string;
  menuImagePrompt?: string | null;
}): string {
  const menu = args.menuImagePrompt?.trim();
  if (menu) return menu;

  const raw = args.messageText.trim();
  if (!raw) return raw;

  const inferred = inferChatImageGenerationPrompt(raw);
  if (!inferred) return raw;

  const userExplicit = isExplicitImageRequest(raw);
  const inferredExplicit = isExplicitImageRequest(inferred);
  if (userExplicit && !inferredExplicit) return raw;

  return inferred;
}

/** Profile replacement portraits: require ~9:16 vertical (tall). width/height ≈ 9/16. */
export const PORTRAIT_ASPECT_TARGET = 9 / 16;
export const PORTRAIT_ASPECT_TOLERANCE = 0.07;

export function isPortraitNineSixteen(width: number, height: number): boolean {
  if (width <= 0 || height <= 0) return false;
  if (width >= height) return false;
  const r = width / height;
  return Math.abs(r - PORTRAIT_ASPECT_TARGET) <= PORTRAIT_ASPECT_TOLERANCE;
}

export function loadImageNaturalSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Could not read image dimensions."));
    img.src = src;
  });
}
