import { CHAT_MESSAGE_FC_AFTER_DAILY_FREE, DAILY_FREE_CHAT_MESSAGES } from "@/lib/forgeEconomy";

/** UTC calendar date `YYYY-MM-DD` (matches Postgres `timezone('utc', now())::date`). */
export function utcDateKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

export function effectiveQuotaUsed(storedDate: string | null, storedUsed: number | null): number {
  const today = utcDateKey();
  if (!storedDate || storedDate < today) return 0;
  return Math.max(0, Math.min(DAILY_FREE_CHAT_MESSAGES, storedUsed ?? 0));
}

export function remainingFreeMessages(storedDate: string | null, storedUsed: number | null): number {
  const u = effectiveQuotaUsed(storedDate, storedUsed);
  return Math.max(0, DAILY_FREE_CHAT_MESSAGES - u);
}

/** FC for the next user text line (0 while free pool remains for UTC day). */
export function nextTextMessageFc(storedDate: string | null, storedUsed: number | null): number {
  const u = effectiveQuotaUsed(storedDate, storedUsed);
  return u < DAILY_FREE_CHAT_MESSAGES ? 0 : CHAT_MESSAGE_FC_AFTER_DAILY_FREE;
}

/** Milliseconds until next UTC midnight (for reset timer UI). */
export function msUntilUtcMidnight(now = new Date()): number {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  const d = now.getUTCDate();
  const next = Date.UTC(y, m, d + 1, 0, 0, 0, 0);
  return Math.max(0, next - now.getTime());
}

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
