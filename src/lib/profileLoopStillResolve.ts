/**
 * Pure helpers mirroring profile-loop I2V still priority in
 * `supabase/functions/generate-profile-loop-video/index.ts`.
 */

export function isLoopVideoStorageUrl(url: string): boolean {
  const u = url.trim();
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("/profile-loops/");
}

export type PortraitStillCandidate = { source: string; url: string };

/** Order: override portrait → gallery pick → row static → image → avatar. */
export function pickPortraitStillUrl(candidates: PortraitStillCandidate[]): string {
  const order = ["override", "galleryPick", "static", "image", "avatar", "galleryLatest"] as const;
  for (const key of order) {
    const hit = candidates.find(
      (c) => c.source === key && c.url.trim() && !isLoopVideoStorageUrl(c.url),
    );
    if (hit) return hit.url.trim();
  }
  return "";
}
