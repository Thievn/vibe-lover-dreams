/** Keep logic aligned with `src/lib/callNotifyWindow.ts`. */

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
