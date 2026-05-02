/**
 * Forge Coins (FC) — in-app economy.
 * 1 FC = $0.01 USD (display / pricing reference; charging is in FC only).
 * `profiles.tokens_balance` stores the user’s FC balance.
 */

import type { CompanionRarity } from "@/lib/companionRarity";

export const FC_USD = 0.01;

/** Classic (non-live) text chat — 0 FC per message; Lovense patterns from compatible replies stay on. */
export const CHAT_MESSAGE_FC = 0;

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

/** HQ / nude still (Tensor path). */
export const CHAT_IMAGE_NUDE_FC = 30;

/** One companion finalized from Companion Forge. */
export const FORGE_CREATE_COMPANION_FC = 150;

/** Forge portrait preview (Grok packshot). */
export const FORGE_PREVIEW_FC = 15;

/** The Nexus: standard merge. Optional infusion add-on. */
export const NEXUS_MERGE_FC = 350;
export const NEXUS_INFUSE_ADDON_FC = 50;

/** Short video clip in chat (when enabled). User-paid profile-card looping MP4 from Discover — FC TBD. */
export const CHAT_SHORT_VIDEO_FC = 100;

/** User-initiated looping profile portrait video (Grok I2V) from companion profile. */
export const PROFILE_LOOP_VIDEO_FC = 75;

// --- Discover: unlock card to My Collection (must match discover_purchase_price_fc in SQL) ---
const DISCOVER_FC: Record<CompanionRarity, number> = {
  common: 12,
  rare: 20,
  epic: 32,
  legendary: 45,
  mythic: 68,
  abyssal: 95,
};

export function discoverCardPriceFc(rarity: CompanionRarity): number {
  return DISCOVER_FC[rarity] ?? 20;
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
