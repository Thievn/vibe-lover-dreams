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

/** Paid chat clip — significantly more than `IMAGE_TOKEN_COST` (75). */
export const CHAT_VIDEO_TOKEN_COST = 320;

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
      "Beautiful SFW casual selfie, fully clothed, flattering lighting, natural pose, " +
      "looking at camera with soft smile or playful expression, high detail portrait, cinematic soft lighting.",
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
      "Lewd selfie — wearing lingerie, sheer clothing, partially undressed or topless, seductive teasing pose, " +
      "bedroom eyes,random sensual poses, sensual body language, highly detailed, erotic lighting, seductive and playful.",
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
      "Fully nude NSFW selfie — completely naked, explicit and uncensored, highly detailed beautiful anatomy. " +
      "If female: perfect breasts, detailed pussy, tight anus, flushed skin, aroused expression. " +
      "If male: muscular chest, detailed cock, balls, tight anus, powerful physique, aroused expression. " +
      "Random sensual poses, cinematic erotic lighting, wetness or precum if appropriate, heavy breathing, extremely sensual and explicit.",
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
export function isImageRequestText(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC").trim();
  if (t.length < 6) return false;

  if (inferChatImageGenerationPrompt(text)) return true;

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
    /\b(full\s*nude|fully nude|nude selfie|nude pic|nude picture|send nudes|send nude|naked selfie|completely naked|fully naked|bare all|bare for me|no clothes|nothing on)\b/i.test(
      t,
    ) ||
    (/\bnude\b|\bnaked\b|\bnsfw\b/i.test(t) &&
      /\b(selfie|pic|picture|photo|image|send|show|take)\b/i.test(t));

  if (nudeIntent) return FAB_SELFIE.nude.imagePrompt;

  const lewdIntent =
    /\b(lewd selfie|lewd pic|lewd picture|lingerie|sheer|topless|teasing|spicy selfie|spicy pic)\b/i.test(t) ||
    (/\blewd\b/i.test(t) && /\b(selfie|pic|picture|photo|send|show)\b/i.test(t));

  if (lewdIntent) return FAB_SELFIE.lewd.imagePrompt;

  const sfwIntent =
    /\b(cute selfie|casual selfie|sfw selfie|sweet selfie|pretty selfie|outfit pic|clothed selfie)\b/i.test(t) ||
    (/\b(cute|casual|sweet|pretty)\b/i.test(t) && /\b(selfie|pic|picture|photo)\b/i.test(t) && !/\b(nude|naked|lewd|nsfw)\b/i.test(t));

  if (sfwIntent) return FAB_SELFIE.sfw.imagePrompt;

  return undefined;
}

/** Rough NSFW / explicit image request — qualifies for free-tier counter when under cap. */
export function isExplicitImageRequest(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC");
  const needles = [
    "nude",
    "nudes",
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
  ];
  return needles.some((n) => t.includes(n));
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
