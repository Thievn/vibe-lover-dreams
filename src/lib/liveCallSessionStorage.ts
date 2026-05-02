import type { LiveCallOption } from "@/lib/liveCallTypes";

const key = (companionId: string) => `liveCallPendingOption:v1:${companionId}`;

/** Persist chosen call theme when SPA navigation state is dropped (common on mobile). */
export function stashLiveCallOption(companionId: string, opt: LiveCallOption): void {
  try {
    sessionStorage.setItem(key(companionId), JSON.stringify(opt));
  } catch {
    /* quota / private mode */
  }
}

export function readStashedLiveCallOption(companionId: string): LiveCallOption | null {
  try {
    const raw = sessionStorage.getItem(key(companionId));
    if (!raw) return null;
    const o = JSON.parse(raw) as LiveCallOption;
    if (!o || typeof o.slug !== "string") return null;
    return o;
  } catch {
    return null;
  }
}

export function clearStashedLiveCallOption(companionId: string): void {
  try {
    sessionStorage.removeItem(key(companionId));
  } catch {
    /* ignore */
  }
}
