import { sendCommand, type LovenseCommand } from "@/lib/lovense";
import type { RampPresetId } from "@/lib/rampModePresets";

const TICK_MS = 2300;

/** Rough bias from companion speech (assistant transcript chunks). */
function biasFromAssistantText(text: string): number {
  const t = text.toLowerCase();
  let b = 0;
  if (/\b(harder|more|don't stop|keep going|yes|right there)\b/.test(t)) b += 12;
  if (/\b(edge|edging|close|so close|almost)\b/.test(t)) b += 6;
  if (/\b(stop|wait|hold|slow|ease|gentle|not yet)\b/.test(t)) b -= 14;
  if (/\b(ruin|denial|no cum|don't you dare cum)\b/.test(t)) b -= 8;
  if (/\b(mercy|come for me|let go|cum|finish|good boy|good girl)\b/.test(t)) b += 18;
  return Math.max(-22, Math.min(22, b));
}

function scaleToUserCap(raw: number, userCapPercent: number): number {
  const c = Math.min(100, Math.max(10, userCapPercent)) / 100;
  return Math.round(Math.min(100, Math.max(5, raw * c)));
}

function computeRawIntensity(preset: RampPresetId, tick: number, phase: number): number {
  const wobble = () => (Math.random() - 0.5) * 12;
  switch (preset) {
    case "gentle_tease": {
      const wave = (Math.sin(tick / 5) * 0.5 + 0.5) * 38 + 12;
      return Math.min(52, wave + wobble() * 0.3);
    }
    case "brutal_edge": {
      const spike = tick % 3 === 0 ? 78 + Math.random() * 17 : 22 + Math.random() * 28;
      return Math.min(96, spike);
    }
    case "random_chaos": {
      return 28 + Math.random() * 62;
    }
    case "slow_ruin": {
      const base = Math.min(88, 18 + tick * 1.1 + Math.sin(tick / 4) * 8);
      if (tick > 0 && tick % 14 === 0) return 24 + Math.random() * 15;
      return base;
    }
    case "mercy": {
      return Math.min(98, 35 + phase * 0.35 + Math.sin(tick / 3) * 10);
    }
    default:
      return 40;
  }
}

export type RampModeDriver = {
  stop: () => Promise<void>;
  /** Feed assistant transcript (delta or full turn) to nudge intensity. */
  ingestAssistantSpeech: (text: string) => void;
};

/**
 * Sends repeating vibrate commands with preset-shaped intensity while Ramp Mode is active.
 * Independent from chat JSON — pairs with Live Voice + Ramp prompt; nudged by Together assistant text.
 */
export function startRampModeDriver(opts: {
  userId: string;
  toyId: string | undefined;
  preset: RampPresetId;
  userIntensityPercent: number;
  onDisplayIntensity?: (n: number) => void;
}): RampModeDriver {
  let tick = 0;
  let phase = 0;
  let speechBias = 0;
  let intervalId: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  const tickFn = () => {
    if (stopped) return;
    tick += 1;
    phase += 1;
    let raw = computeRawIntensity(opts.preset, tick, phase) + speechBias * 0.45;
    raw = Math.min(100, Math.max(8, raw));
    speechBias *= 0.88;
    const scaled = scaleToUserCap(raw, opts.userIntensityPercent);
    opts.onDisplayIntensity?.(scaled);

    const cmd: LovenseCommand = {
      command: "vibrate",
      intensity: scaled,
      duration: 8500,
      toyId: opts.toyId,
    };
    void sendCommand(opts.userId, cmd).catch(() => {
      /* best-effort */
    });
  };

  tickFn();
  intervalId = setInterval(tickFn, TICK_MS);

  return {
    ingestAssistantSpeech: (text: string) => {
      speechBias += biasFromAssistantText(text);
      speechBias = Math.max(-30, Math.min(30, speechBias));
    },
    stop: async () => {
      stopped = true;
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      try {
        await sendCommand(opts.userId, {
          command: "stop",
          intensity: 0,
          duration: 0,
          toyId: opts.toyId,
        });
      } catch {
        /* ignore */
      }
    },
  };
}
