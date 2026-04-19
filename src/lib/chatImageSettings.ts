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

/** Quick Action Buttons for image requests in chat */
export const FAB_SELFIE = {
  sfw: {
    display: [
      "I'd love a cute selfie from you 📸",
      "Can I see your pretty face right now?",
      "Send me something sweet and flirty~",
      "Show me how you look today 💕",
      "A cute selfie would make my day...",
    ] ,

    imagePrompt: "Beautiful SFW casual selfie, fully clothed, flattering lighting, natural pose, looking at camera with soft smile or playful expression, high detail portrait, cinematic soft lighting.",
  },

  lewd: {
    display: [
      "Send me something hot — surprise me 🔥",
      "I want to see you being a little naughty...",
      "Tease me with something spicy~",
      "Show me a lewd selfie, I'm ready...",
      "Don't be shy... let me see more of you 💋",
    ] ,

    imagePrompt: "Lewd selfie — wearing lingerie, sheer clothing, partially undressed or topless, seductive teasing pose, bedroom eyes, sensual body language, highly detailed, erotic lighting, seductive and playful.",
  },

  nude: {
    display: [
      "I want to see all of you — don't hold back 💦",
      "Show me everything... I'm dying to see you nude",
      "Full nude selfie please, no hiding~",
      "Be completely bare for me...",
      "I need to see you fully naked right now 🔥",
    ] ,

    imagePrompt:
      "Fully nude NSFW selfie — completely naked, explicit and uncensored, highly detailed beautiful anatomy. " +
      "If female: perfect breasts, detailed pussy, tight anus, flushed skin, aroused expression. " +
      "If male: muscular chest, detailed cock, balls, tight anus, powerful physique, aroused expression. " +
      "Sensual pose, cinematic erotic lighting, wetness or precum if appropriate, heavy breathing, extremely sensual and explicit.",
  },
} as const;

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
