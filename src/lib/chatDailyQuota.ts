import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { CHAT_MESSAGE_FC_AFTER_DAILY_FREE, DAILY_FREE_CHAT_MESSAGES } from "@/lib/forgeEconomy";

/** Must match `chat_consume_message_quota` in Supabase (America/New_York, new period at 03:00). */
export const CHAT_DAILY_QUOTA_TIMEZONE = "America/New_York";
const CHAT_DAILY_RESET_HOUR_ET = 3;

function easternWallParts(d: Date): {
  y: number;
  mon: number;
  day: number;
  h: number;
  min: number;
  sec: number;
} {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: CHAT_DAILY_QUOTA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = f.formatToParts(d);
  const n = (t: Intl.DateTimeFormatPartTypes) =>
    parseInt(parts.find((p) => p.type === t)?.value ?? "0", 10);
  return { y: n("year"), mon: n("month"), day: n("day"), h: n("hour"), min: n("minute"), sec: n("second") };
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Calendar key for the active free-text quota period (YYYY-MM-DD).
 * Matches Postgres: `((now() AT TIME ZONE 'America/New_York') - interval '3 hours')::date`.
 * A new period begins each day at 3:00 AM Eastern.
 */
export function chatQuotaPeriodDateKey(d = new Date()): string {
  const { y, mon, day, h } = easternWallParts(d);
  if (h >= CHAT_DAILY_RESET_HOUR_ET) {
    return `${y}-${pad2(mon)}-${pad2(day)}`;
  }
  const cur = `${y}-${pad2(mon)}-${pad2(day)}`;
  let t = d.getTime();
  for (let i = 0; i < 48; i++) {
    t -= 3600000;
    const p = easternWallParts(new Date(t));
    const s = `${p.y}-${pad2(p.mon)}-${pad2(p.day)}`;
    if (s !== cur) return s;
  }
  return cur;
}

/** @deprecated Use `chatQuotaPeriodDateKey` — kept for any external imports. */
export function utcDateKey(d = new Date()): string {
  return chatQuotaPeriodDateKey(d);
}

export function effectiveQuotaUsed(storedDate: string | null, storedUsed: number | null): number {
  const today = chatQuotaPeriodDateKey();
  if (!storedDate || storedDate < today) return 0;
  return Math.max(0, Math.min(DAILY_FREE_CHAT_MESSAGES, storedUsed ?? 0));
}

export function remainingFreeMessages(storedDate: string | null, storedUsed: number | null): number {
  const u = effectiveQuotaUsed(storedDate, storedUsed);
  return Math.max(0, DAILY_FREE_CHAT_MESSAGES - u);
}

/** FC for the next user text line (0 while free pool remains for the current Eastern quota day). */
export function nextTextMessageFc(storedDate: string | null, storedUsed: number | null): number {
  const u = effectiveQuotaUsed(storedDate, storedUsed);
  return u < DAILY_FREE_CHAT_MESSAGES ? 0 : CHAT_MESSAGE_FC_AFTER_DAILY_FREE;
}

/** Next 3:00 AM Eastern strictly after `now`, as UTC instant. */
function nextEasternResetInstantAfter(now: Date): Date {
  const p = easternWallParts(now);
  let wall = new Date(p.y, p.mon - 1, p.day, CHAT_DAILY_RESET_HOUR_ET, 0, 0, 0);
  let target = fromZonedTime(wall, CHAT_DAILY_QUOTA_TIMEZONE);
  if (target.getTime() <= now.getTime()) {
    wall = addDays(wall, 1);
    target = fromZonedTime(wall, CHAT_DAILY_QUOTA_TIMEZONE);
  }
  return target;
}

/** Milliseconds until the next 3:00 AM Eastern (free-line pool reset). */
export function msUntilNextEasternChatQuotaReset(now = new Date()): number {
  const next = nextEasternResetInstantAfter(now);
  return Math.max(0, next.getTime() - now.getTime());
}

/** @deprecated Renamed to `msUntilNextEasternChatQuotaReset`. */
export const msUntilUtcMidnight = msUntilNextEasternChatQuotaReset;

export function formatCountdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}
