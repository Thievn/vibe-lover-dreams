import { companionImages } from "@/data/companionImages";

export type PortraitDbFields = {
  static_image_url?: string | null;
  image_url?: string | null;
  animated_image_url?: string | null;
};

/**
 * Prefer stable public Storage URLs. Signed URLs expire and break the landing carousel / gallery.
 * Converts .../object/sign/{bucket}/path?token=... → .../object/public/{bucket}/path
 */
export function stablePortraitDisplayUrl(url: string | null | undefined): string | undefined {
  if (!url?.trim()) return undefined;
  const u = url.trim();
  if (u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("/")) return u;
  if (u.includes("/object/public/")) return u.split("?")[0];
  const signMatch = u.match(/^(https?:\/\/[^/]+)\/storage\/v1\/object\/sign\/([^/]+)\/([^?]+)/i);
  if (signMatch) {
    const [, origin, bucket, pathPart] = signMatch;
    return `${origin}/storage/v1/object/public/${bucket}/${pathPart}`;
  }
  return u.split("?")[0];
}

const DEFAULT_PUBLIC_SITE = "https://lustforge.app";

/**
 * Absolute **https** URL for xAI Imagine **edits** (remote fetch).
 * - Applies {@link stablePortraitDisplayUrl} (e.g. Supabase signed → public).
 * - Prefixes root-relative Vite assets (`/assets/...`) with `VITE_SITE_URL` so production is `https://lustforge.app/...`.
 */
export function resolveLikenessReferenceImageUrlForImagine(portraitUrl: string | null | undefined): string | undefined {
  const stable = stablePortraitDisplayUrl(portraitUrl ?? undefined) ?? portraitUrl?.trim() ?? "";
  let u = stable.trim();
  if (!u) return undefined;
  if (u.startsWith("/") && !u.startsWith("//")) {
    const origin = (
      typeof import.meta !== "undefined" && import.meta.env?.VITE_SITE_URL
        ? String(import.meta.env.VITE_SITE_URL).trim()
        : ""
    ).replace(/\/$/, "") || DEFAULT_PUBLIC_SITE.replace(/\/$/, "");
    u = `${origin}${u}`;
  }
  u = (u.split("?")[0] ?? u).trim();
  if (!u.startsWith("https://")) return undefined;
  return u;
}

/** Same stored object may appear as signed vs public URL — compare normalized storage paths. */
export function portraitUrlsEquivalent(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = stablePortraitDisplayUrl(a ?? undefined);
  const nb = stablePortraitDisplayUrl(b ?? undefined);
  if (!na || !nb) return false;
  if (na === nb) return true;
  try {
    const pa = new URL(na).pathname.replace(/\/+$/, "");
    const pb = new URL(nb).pathname.replace(/\/+$/, "");
    return pa === pb;
  } catch {
    return na.split("?")[0] === nb.split("?")[0];
  }
}

/** Gallery + chat avatar: still image only. */
export function galleryStaticPortraitUrl(db: PortraitDbFields | undefined, id: string | undefined): string | undefined {
  if (!db && id) {
    const staticAsset = companionImages[id];
    return staticAsset ? stablePortraitDisplayUrl(staticAsset) : undefined;
  }
  if (!db) return undefined;
  const raw = db.static_image_url || db.image_url || (id ? companionImages[id] : undefined) || undefined;
  return stablePortraitDisplayUrl(raw ?? undefined);
}

/** Profile hero: animated asset when configured. */
export function profileAnimatedPortraitUrl(db: PortraitDbFields | undefined): string | undefined {
  const u = db?.animated_image_url?.trim();
  return u || undefined;
}

/** Profile fallback when no animation. */
export function profileStillPortraitUrl(db: PortraitDbFields | undefined, id: string | undefined): string | undefined {
  return galleryStaticPortraitUrl(db, id);
}

export function isVideoPortraitUrl(url: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(url);
}

/**
 * Public https URL for a looping profile video suitable for X / Zernio attachment.
 * Storage URLs sometimes omit a file extension; when `profile_loop_video_enabled` is true we still treat https URLs as video.
 */
export function resolvePublicLoopPortraitVideoUrlForX(db: {
  animated_image_url?: string | null;
  profile_loop_video_enabled?: boolean;
}): string | null {
  const raw = db.animated_image_url?.trim();
  if (!raw) return null;
  const hasVideoExt = isVideoPortraitUrl(raw);
  const trustedLoop = Boolean(db.profile_loop_video_enabled && /^https?:\/\//i.test(raw));
  if (!hasVideoExt && !trustedLoop) return null;
  const loopUrl = stablePortraitDisplayUrl(raw)?.split("?")[0];
  if (loopUrl && /^https?:\/\//i.test(loopUrl)) return loopUrl;
  return null;
}

/** Interior URL is video by extension, or operator enabled loop + remote URL (extensionless storage). */
export function isEligibleLoopPortraitVideoUrl(url: string | null | undefined, profileLoopVideoEnabled: boolean): boolean {
  if (!url?.trim()) return false;
  const u = url.trim();
  if (isVideoPortraitUrl(u)) return true;
  return Boolean(profileLoopVideoEnabled && /^https?:\/\//i.test(u));
}

/** Companion profile / chat: show looping MP4 only when enabled and URL is video */
export function shouldShowProfileLoopVideo(
  db: PortraitDbFields | undefined,
  profileLoopVideoEnabled: boolean | undefined,
): boolean {
  if (!profileLoopVideoEnabled) return false;
  const u = profileAnimatedPortraitUrl(db);
  return Boolean(u && isVideoPortraitUrl(u));
}
