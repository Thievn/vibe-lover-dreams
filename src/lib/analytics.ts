declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/** Default property when `VITE_GA_MEASUREMENT_ID` is unset (override via env in Vercel). */
const GA_DEFAULT = "JF1831WS0G";
const GA_DISABLED_VALUES = new Set(["0", "false", "off", "disabled"]);

let initialized = false;

function gtagScriptAlreadyInHead(measurementId: string): boolean {
  if (typeof document === "undefined") return false;
  const nodes = document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]');
  for (const n of nodes) {
    const src = n.getAttribute("src") || "";
    if (src.includes(measurementId)) return true;
  }
  return false;
}

function normalizeMeasurementId(input: string | undefined): string | null {
  const raw = (input ?? "").trim();
  if (!raw) return `G-${GA_DEFAULT}`;
  if (GA_DISABLED_VALUES.has(raw.toLowerCase())) return null;
  if (raw.startsWith("G-")) return raw;
  if (/^\d+$/.test(raw)) return `G-${raw}`;
  return raw;
}

export function getGaMeasurementId(): string | null {
  return normalizeMeasurementId(import.meta.env.VITE_GA_MEASUREMENT_ID);
}

export function initAnalytics(): void {
  if (initialized || typeof window === "undefined" || typeof document === "undefined") return;
  const measurementId = getGaMeasurementId();
  if (!measurementId) return;

  if (!window.dataLayer) window.dataLayer = [];
  if (!window.gtag) {
    window.gtag = function gtag(...args: unknown[]) {
      window.dataLayer.push(args);
    };
  }

  const fromIndexHtml = gtagScriptAlreadyInHead(measurementId);

  if (!fromIndexHtml && !document.querySelector('script[data-lf-ga="gtag"]')) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    gtagScript.setAttribute("data-lf-ga", "gtag");
    document.head.appendChild(gtagScript);
  }

  if (!fromIndexHtml) {
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: false,
      anonymize_ip: true,
    });
  }

  initialized = true;
}

export function trackPageView(path: string): void {
  const measurementId = getGaMeasurementId();
  if (!measurementId || !window.gtag) return;
  window.gtag("event", "page_view", {
    page_path: path,
    page_location: window.location.href,
    page_title: document.title,
    send_to: measurementId,
  });
}

/** GA4 recommended + custom events (no PII in params). */
export function trackEvent(name: string, params?: Record<string, string | number | boolean | undefined>): void {
  const measurementId = getGaMeasurementId();
  if (!measurementId || !window.gtag) return;
  const clean: Record<string, string | number | boolean> = {};
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined) continue;
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") clean[k] = v;
    }
  }
  window.gtag("event", name, { ...clean, send_to: measurementId });
}

