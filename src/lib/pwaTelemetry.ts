import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";

export type PwaTelemetryEventType =
  | "appinstalled"
  | "install_prompt_accept"
  | "install_prompt_dismiss"
  | "install_prompt_shown";

let globalInstallListenerRegistered = false;

/** One-time: Chromium fires when the PWA is added to the home screen / launcher. */
export function registerGlobalPwaInstallListener(): void {
  if (typeof window === "undefined" || globalInstallListenerRegistered) return;
  globalInstallListenerRegistered = true;
  window.addEventListener("appinstalled", () => {
    trackPwaGaAndDb("appinstalled");
  });
}

export async function recordPwaTelemetry(eventType: PwaTelemetryEventType): Promise<void> {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;
    const { error } = await supabase.from("pwa_install_events").insert([{ event_type: eventType, user_id: userId }]);
    if (error) console.warn("[pwa telemetry]", eventType, error.message);
  } catch (e) {
    console.warn("[pwa telemetry]", eventType, e);
  }
}

/** GA4 + Supabase row (best-effort). */
export function trackPwaGaAndDb(eventType: PwaTelemetryEventType): void {
  trackEvent("pwa_funnel", { step: eventType });
  void recordPwaTelemetry(eventType);
}
