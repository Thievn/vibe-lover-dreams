import { invokeWebPushSend } from "@/lib/invokeWebPushSend";

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

/** Ask once (e.g. when user taps “Start call”) so ringing can surface a real notification. */
export async function ensureCompanionCallNotifications(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const r = await Notification.requestPermission();
  return r === "granted";
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
