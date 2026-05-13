/** Minutes from midnight [0, 1439] in the given IANA timezone for `date`. */
export function clockMinutesInTimeZone(date: Date, timeZone: string): number {
  const tz = timeZone.trim() || "UTC";
  try {
    const f = new Intl.DateTimeFormat("en-GB", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = f.formatToParts(date);
    const hourRaw = parts.find((p) => p.type === "hour")?.value ?? "0";
    const minuteRaw = parts.find((p) => p.type === "minute")?.value ?? "0";
    let hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    if (hour === 24) hour = 0;
    return Math.min(1439, Math.max(0, hour * 60 + minute));
  } catch {
    return clockMinutesInTimeZone(date, "UTC");
  }
}

export type CallNotifyWindowRow = {
  call_notify_window_enabled?: boolean | null;
  call_notify_tz?: string | null;
  call_notify_start_min?: number | null;
  call_notify_end_min?: number | null;
};

/**
 * Whether an incoming-call notification may fire `now`.
 * If window is disabled or row missing, always true.
 * Window is [start, end) same calendar day when start < end; if start > end, overnight (start .. 24h) U [0 .. end).
 */
export function isWithinCallNotifyWindow(now: Date, row: CallNotifyWindowRow | null | undefined): boolean {
  if (!row || !row.call_notify_window_enabled) return true;
  const tz = row.call_notify_tz?.trim() || "UTC";
  const start = Math.min(1439, Math.max(0, Math.floor(Number(row.call_notify_start_min ?? 0))));
  const end = Math.min(1439, Math.max(0, Math.floor(Number(row.call_notify_end_min ?? 0))));
  const m = clockMinutesInTimeZone(now, tz);
  if (start === end) return true;
  if (start < end) return m >= start && m < end;
  return m >= start || m < end;
}

export function minutesToTimeInputValue(min: number): string {
  const m = Math.min(1439, Math.max(0, Math.floor(min)));
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function timeInputValueToMinutes(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(mm) || h > 23 || mm > 59) return null;
  return h * 60 + mm;
}
