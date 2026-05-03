import { SITE_URL } from "@/config/auth";

/** Production / marketing origin (`VITE_SITE_URL`, default https://lustforge.app) — not the Vercel preview host. */
export function getPublicSiteOrigin(): string {
  return SITE_URL.replace(/\/+$/, "");
}

/** Canonical share URL for a companion profile (opens preview mode for non-owners). */
export function getPublicCompanionProfileShareUrl(companionId: string): string {
  return `${getPublicSiteOrigin()}/companions/${companionId}?shared=1`;
}

/** Resolve a portrait or asset URL to absolute using the public site origin when needed. */
export function absoluteUrlWithPublicSite(url: string | null | undefined): string | null {
  const u = url?.trim();
  if (!u) return null;
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("//")) return `https:${u}`;
  const base = getPublicSiteOrigin();
  return `${base}${u.startsWith("/") ? u : `/${u}`}`;
}
