import { supabase } from "@/integrations/supabase/client";
import { invokeWebPushSend } from "@/lib/invokeWebPushSend";
import { isWithinCallNotifyWindow, type CallNotifyWindowRow } from "@/lib/callNotifyWindow";

const MSG_TYPE = "LUSTFORGE_NAVIGATE" as const;

export type CompanionCallNavigateMessage = { type: typeof MSG_TYPE; url: string };

export function isCompanionCallNavigateMessage(data: unknown): data is CompanionCallNavigateMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === MSG_TYPE &&
    typeof (data as { url?: unknown }).url === "string"
  );
}

export const INCOMING_CALL_PUSH_EVENT = "lustforge-incoming-call-push" as const;

export const INCOMING_CALL_PUSH_MSG_TYPE = "LUSTFORGE_INCOMING_CALL_PUSH" as const;

export type IncomingCallPushSwMessage = {
  type: typeof INCOMING_CALL_PUSH_MSG_TYPE;
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export type IncomingCallPushDetail = {
  title: string;
  body: string;
  url: string;
  tag?: string;
};

export function isIncomingCallPushSwMessage(data: unknown): data is IncomingCallPushSwMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as { type?: unknown }).type === INCOMING_CALL_PUSH_MSG_TYPE &&
    typeof (data as { url?: unknown }).url === "string" &&
    typeof (data as { title?: unknown }).title === "string"
  );
}

/** Ask once (e.g. when user taps “Start call”) so ringing can surface a real notification. */
export async function ensureCompanionCallNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
}

async function fetchCallNotifyWindowRow(): Promise<CallNotifyWindowRow | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("call_notify_window_enabled, call_notify_tz, call_notify_start_min, call_notify_end_min")
    .eq("user_id", session.user.id)
    .maybeSingle();
  return (data ?? null) as CallNotifyWindowRow | null;
}

function absoluteUrl(path: string): string {
  if (typeof window === "undefined") return path;
  try {
    return new URL(path, window.location.origin).href;
  } catch {
    return `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
  }
}

/**
 * “Incoming call” style notification while the line is ringing.
 * Uses the service worker when available so taps open / focus the PWA with routing.
 */
export async function showCompanionIncomingCallNotification(p: {
  companionName: string;
  companionId: string;
  callSlug: string;
}): Promise<void> {
  const row = await fetchCallNotifyWindowRow();
  if (!isWithinCallNotifyWindow(new Date(), row)) return;

  const title = `${p.companionName} is calling you right now 💕`;
  const body = "Tap to answer";
  const icon = absoluteUrl("/og-image.png");
  const url = absoluteUrl(`/live-call/${encodeURIComponent(p.companionId)}?call=${encodeURIComponent(p.callSlug)}`);

  try {
    const reg = await navigator.serviceWorker?.ready;
    if (reg && typeof reg.showNotification === "function") {
      await reg.showNotification(title, {
        body,
        icon,
        badge: icon,
        tag: `lf-incoming-${p.companionId}`,
        renotify: true,
        data: { url },
        silent: false,
      });
      return;
    }
  } catch {
    /* fall through */
  }

  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon, tag: `lf-incoming-${p.companionId}`, data: { url } });
    } catch {
      /* ignore */
    }
  }
}

/**
 * Prefer server Web Push (works when the tab is closed after subscribe); fall back to
 * same-tab `showNotification` / `Notification` if nothing was delivered.
 */
export async function notifyIncomingCallWithFallback(p: {
  companionName: string;
  companionId: string;
  callSlug: string;
}): Promise<void> {
  const row = await fetchCallNotifyWindowRow();
  if (!isWithinCallNotifyWindow(new Date(), row)) return;

  const title = `${p.companionName} is calling you right now 💕`;
  const body = "Tap to answer";
  const url = absoluteUrl(`/live-call/${encodeURIComponent(p.companionId)}?call=${encodeURIComponent(p.callSlug)}`);
  const icon = absoluteUrl("/og-image.png");

  const push = await invokeWebPushSend({
    title,
    body,
    url,
    tag: `lf-incoming-${p.companionId}`,
    icon,
  });

  if (push.ok && push.sent > 0) {
    return;
  }

  await showCompanionIncomingCallNotification(p);
}
