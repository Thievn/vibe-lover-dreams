/**
 * PWA / Web Push environment helpers for voice-call alerts.
 * iOS Web Push for websites is only reliable once the app is on the Home Screen (standalone).
 */

export function isStandalonePwa(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

export function isIosLike(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

/** Safari on iPhone needs Add to Home Screen for Web Push to behave like an app. */
export function needsInstallForIosWebPush(): boolean {
  return isIosLike() && !isStandalonePwa();
}

export function supportsWebPushSubscribe(): boolean {
  if (typeof window === "undefined") return false;
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function dispatchRequestInstallHint(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("lustforge-request-install-hint"));
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function getVapidPublicKey(): string | null {
  const k = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : null;
}
