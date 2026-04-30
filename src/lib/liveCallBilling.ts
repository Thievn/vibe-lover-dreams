/**
 * Live Call UI: same rate as `LIVE_VOICE_FC_PER_MINUTE` in `forgeEconomy` (1 FC = $0.01).
 * Hang-up billing uses `spendForgeCoins` on the client.
 */
export {
  LIVE_VOICE_FC_PER_MINUTE as LIVE_CALL_CREDITS_PER_MINUTE,
  LIVE_CHAT_FC_PER_MINUTE,
} from "@/lib/forgeEconomy";
