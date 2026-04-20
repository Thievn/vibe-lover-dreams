/** Min delay between mid-stream transcript nudges to Lovense bias (ms). */
export const RAMP_TRANSCRIPT_THROTTLE_MS = 400;

export type RampTranscriptThrottle = {
  onDelta: (delta: string, accumulated: string) => void;
  /** Call once per assistant turn when streaming text is final. */
  flushTurn: (fullText: string) => void;
  dispose: () => void;
};

/**
 * Throttles how often we pass streaming assistant transcript into the ramp driver
 * so keyword nudges feel responsive but don't spam updates every token.
 */
export function createRampTranscriptThrottle(
  ingest: (text: string) => void,
  throttleMs = RAMP_TRANSCRIPT_THROTTLE_MS,
): RampTranscriptThrottle {
  let lastRunAt = 0;
  let trailingTimer: ReturnType<typeof setTimeout> | null = null;
  let latestAccum = "";
  let lastIngestedSnapshot = "";

  const runIngest = (text: string) => {
    const t = text.trim();
    if (!t || t === lastIngestedSnapshot) return;
    lastIngestedSnapshot = t;
    lastRunAt = Date.now();
    ingest(t);
  };

  return {
    onDelta(_delta: string, accumulated: string) {
      latestAccum = accumulated;
      const now = Date.now();
      const elapsed = now - lastRunAt;
      if (elapsed >= throttleMs) {
        if (trailingTimer) {
          clearTimeout(trailingTimer);
          trailingTimer = null;
        }
        runIngest(latestAccum);
      } else if (!trailingTimer) {
        trailingTimer = setTimeout(() => {
          trailingTimer = null;
          runIngest(latestAccum);
        }, throttleMs - elapsed);
      }
    },

    flushTurn(fullText: string) {
      if (trailingTimer) {
        clearTimeout(trailingTimer);
        trailingTimer = null;
      }
      const t = fullText.trim();
      if (t && t !== lastIngestedSnapshot) {
        ingest(t);
      }
      latestAccum = "";
      lastIngestedSnapshot = "";
      lastRunAt = 0;
    },

    dispose() {
      if (trailingTimer) clearTimeout(trailingTimer);
      trailingTimer = null;
      latestAccum = "";
      lastIngestedSnapshot = "";
      lastRunAt = 0;
    },
  };
}
