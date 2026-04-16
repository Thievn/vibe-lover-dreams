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
