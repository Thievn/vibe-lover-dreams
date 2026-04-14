declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const GA_DEFAULT = "531474793";
const GA_DISABLED_VALUES = new Set(["0", "false", "off", "disabled"]);

let initialized = false;

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

  if (!document.querySelector('script[data-lf-ga="gtag"]')) {
    const gtagScript = document.createElement("script");
    gtagScript.async = true;
    gtagScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    gtagScript.setAttribute("data-lf-ga", "gtag");
    document.head.appendChild(gtagScript);
  }

  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    send_page_view: false,
    anonymize_ip: true,
  });

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

