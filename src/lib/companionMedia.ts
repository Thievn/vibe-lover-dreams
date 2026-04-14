import { companionImages } from "@/data/companionImages";

export type PortraitDbFields = {
  static_image_url?: string | null;
  image_url?: string | null;
  animated_image_url?: string | null;
};

/** Gallery + chat avatar: still image only. */
export function galleryStaticPortraitUrl(db: PortraitDbFields | undefined, id: string | undefined): string | undefined {
  if (!db && id) return companionImages[id];
  if (!db) return undefined;
  return db.static_image_url || db.image_url || (id ? companionImages[id] : undefined) || undefined;
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
