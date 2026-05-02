import type { NavigateFunction } from "react-router-dom";
import type { Companion } from "@/data/companions";
import { getLiveCallPresetsFallback } from "@/lib/liveCallPresetsFallback";
import { readLiveCallOptionsSessionCache } from "@/lib/invokeGenerateLiveCallOptions";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { stashLiveCallOption } from "@/lib/liveCallSessionStorage";

export function pickInitialLiveCallOption(companionId: string, companion: Companion): LiveCallOption | null {
  const cached = readLiveCallOptionsSessionCache(companionId);
  if (cached?.length) return cached[0] ?? null;
  const fall = getLiveCallPresetsFallback(companion);
  return fall[0] ?? null;
}

/**
 * Navigate to full-screen live call immediately using cache/offline presets, stashing the option
 * so `/live-call/:id` still works if `location.state` is lost.
 */
export function stashAndNavigateToLiveCall(
  navigate: NavigateFunction,
  companionId: string,
  companion: Companion,
  opt?: LiveCallOption | null,
): boolean {
  const o = opt ?? pickInitialLiveCallOption(companionId, companion);
  if (!o) return false;
  stashLiveCallOption(companionId, o);
  navigate(`/live-call/${companionId}?call=${encodeURIComponent(o.slug)}`, { state: { callOption: o } });
  return true;
}
