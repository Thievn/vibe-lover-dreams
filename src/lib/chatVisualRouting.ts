/**
 * Routes natural-language chat toward Tensor stills (FLUX.2) vs short I2V loops (Wan on TAMS),
 * plus copy for immersive video loading (no technical "generating…" jargon in the thread).
 */

import { wantsChatImageFromText } from "./chatImageSettings";

/** Shown near video actions; set expectations for Tensor queue time. */
export const CHAT_VIDEO_TIMING_USER_NOTE =
  "Videos may take 20–60 seconds to generate depending on current load.";

const VIDEO_LOADING_LINES = [
  "Filming that for you…",
  "Getting into position…",
  "Recording this one…",
  "Making you a little movie…",
  "Hold on — this one's gonna be good…",
  "Setting up the shot…",
  "Almost there — keep the lights low…",
  "Rolling — stay right there…",
];

export function pickRandomVideoLoadingLine(): string {
  return VIDEO_LOADING_LINES[Math.floor(Math.random() * VIDEO_LOADING_LINES.length)] ?? VIDEO_LOADING_LINES[0];
}

/**
 * True when the user is clearly asking for motion / clip / loop (not just a still).
 * Kept separate from still-image detection so we can route to I2V.
 */
export function wantsChatVideoFromText(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC");
  if (t.length < 3) return false;

  const videoHints = [
    /\bvideo(s|ing)?\b/,
    /\bclip(s|ping)?\b/,
    /\bloop(s|ing|ed)?\b/,
    /\bmovie(s)?\b/,
    /\bfilm(s|ing|ed)?\b/,
    /\breel(s)?\b/,
    /\bgif\b/,
    /\bfootage\b/,
    /\bi2v\b/,
    /\bimage\s*to\s*video\b/,
    /\bmake\s+it\s+move\b/,
    /\banimate(d|s)?\b/,
    /\bmoving\s+(picture|pic|version|shot|selfie)\b/,
    /\b(a|the)\s+motion\s+(shot|clip|video)\b/,
  ];
  if (!videoHints.some((r) => r.test(t))) return false;

  // "profile picture" / "cover photo" — not video
  if (/\bprofile\s+(photo|pic|image)\b/.test(t) && !/\bvideo|clip|loop|movie\b/.test(t)) return false;

  return true;
}

export type ChatMediaRoute = "image" | "video" | "text";

/**
 * Decide Tensor pipeline: still (FLUX.2) vs I2V (Wan) vs plain Together chat.
 * `menuForcesImage` = FAB / dropdown sent an image brief (always still).
 */
export function inferChatMediaRoute(messageText: string, menuForcesImage: boolean): ChatMediaRoute {
  if (menuForcesImage) return "image";

  const t = messageText.trim();
  const v = wantsChatVideoFromText(t);
  const i = wantsChatImageFromText(t);

  if (v && i) {
    // e.g. "send a nude video clip" — video wins when motion words present with explicit still nouns
    if (/\b(clip|loop|movie|film|video|reel|motion|moving|animate)\b/i.test(t)) return "video";
  }
  if (v) return "video";
  if (i) return "image";
  return "text";
}

/** Maps free-text + menu video buckets to the clip mood sent to `generate-chat-companion-video`. */
export function inferClipMoodFromUserText(text: string): "sfw" | "lewd" | "nude" {
  const t = text.toLowerCase().normalize("NFKC");
  if (/\b(cute|sfw|sweet|clothed|outfit(\s+check)?|pretty|innocent)\b/i.test(t) && !/\b(nude|naked|explicit|nsfw)\b/i.test(t)) {
    return "sfw";
  }
  if (/\b(nude|naked|nsfw|explicit|full\s*nudity|bare|no\s*clothes)\b/i.test(t)) return "nude";
  return "lewd";
}
