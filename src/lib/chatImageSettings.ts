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

/**
 * + menu selfie actions: short immersive line shown in chat; full brief goes to generate-image only.
 * Keeps roleplay natural — the model never sees the long technical string as a user message.
 */
export const FAB_SELFIE = {
  sfw: {
    display: "I'd love a cute selfie from you. 📸",
    imagePrompt:
      "SFW casual selfie — fully clothed, cute pose, flattering lighting, looking at camera. No nudity, no lingerie.",
  },
  lewd: {
    display: "Send me something hot — surprise me. 🔥",
    imagePrompt:
      "Lewd selfie — lingerie or partial nude, explicit teasing, seductive eye contact, camera-aware, adult.",
  },
  nude: {
    display: "I want to see all of you — don't hold back.",
    imagePrompt:
      "Fully nude NSFW selfie — explicit, uncensored, consensual adult; full body or intimate framing as fits.",
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
