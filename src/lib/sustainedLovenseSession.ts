import { sendCommand, type LovenseCommand } from "@/lib/lovense";

/** Matches `send-device-command` clamp: Lovense `timeSec` max 30. */
export const LOVENSE_MAX_SEGMENT_MS = 30_000;

/** Re-fire before the hardware segment ends so sensation stays continuous. */
const REFRESH_INTERVAL_MS = 25_000;

function segmentCommand(cmd: LovenseCommand): LovenseCommand {
  return {
    ...cmd,
    duration: LOVENSE_MAX_SEGMENT_MS,
  };
}

/**
 * Keeps a vibrate/pattern command active by re-sending until `stop()` (safe word, emergency, or user toggle).
 * The Lovense API caps a single segment at 30s; this bridges longer sessions.
 */
export function createSustainedLovenseSession(
  userId: string,
  command: LovenseCommand,
): { stop: () => Promise<void> } {
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const tick = () => {
    void sendCommand(userId, segmentCommand(command)).catch(() => {
      /* toast handled at call sites for one-shot; sustain failures are best-effort */
    });
  };

  tick();
  intervalId = setInterval(tick, REFRESH_INTERVAL_MS);

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      try {
        await sendCommand(userId, {
          command: "stop",
          intensity: 0,
          duration: 0,
          toyId: command.toyId,
        });
      } catch {
        /* still clear local state */
      }
    },
  };
}
