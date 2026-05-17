/**
 * Pure helpers mirrored from `generate-profile-loop-video` still resolution (for Vitest).
 * Keep in sync with `rowStillCandidateUrls` / `firstHttpsStillFromCandidates` in that edge function.
 */
import { isLoopVideoStorageUrl, stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { resolveLikenessReferenceImageUrlForImagine } from "@/lib/companionMedia";

export function rowStillCandidateUrls(row: {
  static_image_url?: string | null;
  image_url?: string | null;
  avatar_url?: string | null;
}): string[] {
  const out: string[] = [];
  for (const key of ["static_image_url", "image_url", "avatar_url"] as const) {
    const raw = (row[key] ?? "").trim();
    if (!raw || isLoopVideoStorageUrl(raw)) continue;
    out.push(raw);
  }
  return out;
}

export function firstHttpsStillFromCandidates(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const raw = (c ?? "").trim();
    if (!raw || isLoopVideoStorageUrl(raw)) continue;
    const stable = stablePortraitDisplayUrl(raw) ?? raw;
    const ready = resolveLikenessReferenceImageUrlForImagine(stable);
    if (ready) return ready;
  }
  return null;
}

/** Client-side ordering check: override portrait before row image_url. */
export function resolveStillOrderForTests(input: {
  overridePortrait: string | null;
  row: { static_image_url?: string | null; image_url?: string | null };
}): string | null {
  const rowUrls = rowStillCandidateUrls(input.row);
  return firstHttpsStillFromCandidates(input.overridePortrait, ...rowUrls);
}
