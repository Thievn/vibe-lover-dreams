import type { Companion } from "@/data/companions";
import { readLiveCallOptionsSessionCache } from "@/lib/invokeGenerateLiveCallOptions";
import { getLiveCallPresetsFallback } from "@/lib/liveCallPresetsFallback";
import type { LiveCallOption } from "@/lib/liveCallTypes";

/** Resolve a call theme when opening from a URL (e.g. notification deep link). */
export function resolveLiveCallOptionBySlug(
  companionId: string,
  companion: Companion,
  slug: string,
): LiveCallOption | null {
  const decoded = decodeURIComponent(slug.trim());
  if (!decoded) return null;
  const fromCache = readLiveCallOptionsSessionCache(companionId);
  const hit = fromCache?.find((o) => o.slug === decoded);
  if (hit) return hit;
  return getLiveCallPresetsFallback(companion).find((o) => o.slug === decoded) ?? null;
}
