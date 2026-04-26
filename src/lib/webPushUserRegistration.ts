import { supabase } from "@/integrations/supabase/client";
import { invokeWebPushSubscribe } from "@/lib/invokeWebPushSubscribe";
import { getVapidPublicKey, supportsWebPushSubscribe, urlBase64ToUint8Array } from "@/lib/pwaCallAlerts";

export async function subscribeCurrentDeviceToWebPush(): Promise<{ ok: true } | { ok: false; error: string }> {
  const key = getVapidPublicKey();
  if (!key) {
    return {
      ok: false,
      error: "This server has not configured Web Push yet (missing VITE_VAPID_PUBLIC_KEY).",
    };
  }
  if (!supportsWebPushSubscribe()) {
    return { ok: false, error: "This browser cannot use Web Push (try Chrome, Edge, or Firefox)." };
  }

  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    return { ok: false, error: "Notifications are blocked or dismissed. Enable them in browser or system settings." };
  }

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    });
    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { ok: false, error: "Browser returned an incomplete push subscription." };
    }
    return await invokeWebPushSubscribe(json);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not subscribe to push" };
  }
}

export async function unsubscribeCurrentDeviceWebPush(): Promise<void> {
  let endpoint: string | null = null;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    endpoint = sub?.endpoint ?? null;
    await sub?.unsubscribe();
  } catch {
    /* ignore */
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  if (endpoint) {
    await supabase.from("web_push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", endpoint);
  } else {
    await supabase.from("web_push_subscriptions").delete().eq("user_id", user.id);
  }
}

export async function countWebPushSubscriptionsForUser(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("web_push_subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (error) return 0;
  return count ?? 0;
}
