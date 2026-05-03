/**
 * Forge Coins (FC) — in-app economy.
 * 1 FC = $0.01 USD (display / pricing reference; charging is in FC only).
 * `profiles.tokens_balance` stores the user’s FC balance.
 */

import type { CompanionRarity } from "@/lib/companionRarity";

export const FC_USD = 0.01;

/**
 * Legacy constant — text chat uses a daily free pool + overage (see `DAILY_FREE_CHAT_MESSAGES`,
 * `CHAT_MESSAGE_FC_AFTER_DAILY_FREE`, `nextTextMessageFc`). Kept 0 so older checks “free text” stay false-positive safe.
 */
export const CHAT_MESSAGE_FC = 0;

/** User text lines (Classic + Live Voice) per UTC day before overage FC applies. */
export const DAILY_FREE_CHAT_MESSAGES = 20;

/** FC per text message after the daily free pool is exhausted (server: `chat_consume_message_quota`). */
export const CHAT_MESSAGE_FC_AFTER_DAILY_FREE = 2;

/**
 * Full-screen Live Call & in-chat “Live Voice” — billed per **started** minute (audio-primary).
 * Same meter as live-style sessions that include mic + voice playback today.
 */
export const LIVE_VOICE_FC_PER_MINUTE = 25;

/**
 * Live Chat (text + voice + sending images in a billed live-style session).
 * Currently matches Live Voice / Live Call meter; split here for copy & future tuning.
 */
export const LIVE_CHAT_FC_PER_MINUTE = 25;

/** Selfie / lewd (non-nude) still from chat. */
export const CHAT_IMAGE_LEWD_FC = 20;

/** Artistic nude / explicit-tier chat still (Grok Imagine; same rewriter stack as lewd). */
export const CHAT_IMAGE_NUDE_FC = 30;

/** One companion finalized from Companion Forge. */
export const FORGE_CREATE_COMPANION_FC = 150;

/** Forge portrait preview (Grok packshot). */
export const FORGE_PREVIEW_FC = 25;

/** The Nexus: standard merge. Optional infusion add-on. */
export const NEXUS_MERGE_FC = 350;
export const NEXUS_INFUSE_ADDON_FC = 50;

/** Short in-chat video clip (when enabled) — Grok Imagine video; billed when the feature ships. */
export const CHAT_SHORT_VIDEO_FC = 75;

/** User-initiated looping profile portrait video (Grok I2V) from companion profile. */
export const PROFILE_LOOP_VIDEO_FC = 75;

// --- Discover: unlock card to My Collection (must match discover_purchase_price_fc in SQL) ---
const DISCOVER_FC: Record<CompanionRarity, number> = {
  common: 180,
  rare: 350,
  epic: 520,
  legendary: 850,
  mythic: 720,
  abyssal: 950,
};

export function discoverCardPriceFc(rarity: CompanionRarity): number {
  return DISCOVER_FC[rarity] ?? DISCOVER_FC.rare;
}

export const FORGE_ECONOMY = {
  FC_USD,
  CHAT_MESSAGE_FC,
  LIVE_VOICE_FC_PER_MINUTE,
  LIVE_CHAT_FC_PER_MINUTE,
  CHAT_IMAGE_LEWD_FC,
  CHAT_IMAGE_NUDE_FC,
  FORGE_CREATE_COMPANION_FC,
  FORGE_PREVIEW_FC,
  NEXUS_MERGE_FC,
  NEXUS_INFUSE_ADDON_FC,
  CHAT_SHORT_VIDEO_FC,
} as const;
