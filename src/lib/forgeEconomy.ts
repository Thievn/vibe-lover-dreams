/**
 * Forge Coins (FC) — in-app economy.
 * 1 FC = $0.01 USD (display / pricing reference; charging is in FC only).
 * `profiles.tokens_balance` stores the user’s FC balance.
 */

import type { CompanionRarity } from "@/lib/companionRarity";

export const FC_USD = 0.01;

/** Text chat is free. */
export const CHAT_MESSAGE_FC = 0;

/** xAI Realtime live voice: billed per **started** minute in client (see LiveCallPage on hangup). */
export const LIVE_VOICE_FC_PER_MINUTE = 22;

/** Lewd / selfie (non-nude) image generation. */
export const CHAT_IMAGE_LEWD_FC = 12;

/** Nude / Tensor path still. */
export const CHAT_IMAGE_NUDE_FC = 22;

/** One companion created in Forge (finalize). */
export const FORGE_CREATE_COMPANION_FC = 45;

/** Design-lab / packshot preview (Grok) — cheap iteration. */
export const FORGE_PREVIEW_FC = 20;

/** The Nexus: standard merge. Optional infusion add-on. */
export const NEXUS_MERGE_FC = 140;
export const NEXUS_INFUSE_ADDON_FC = 50;

/** Short video clip in chat. */
export const CHAT_SHORT_VIDEO_FC = 100;

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
  CHAT_IMAGE_LEWD_FC,
  CHAT_IMAGE_NUDE_FC,
  FORGE_CREATE_COMPANION_FC,
  FORGE_PREVIEW_FC,
  NEXUS_MERGE_FC,
  NEXUS_INFUSE_ADDON_FC,
  CHAT_SHORT_VIDEO_FC,
} as const;
