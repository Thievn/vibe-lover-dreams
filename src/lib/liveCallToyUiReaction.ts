/**
 * Live Voice only: machine-readable user lines so Grok Realtime speaks in-character
 * reactions after on-screen Lovense controls (see `buildLiveCallRealtimeInstructions`).
 */

export type LiveCallToyUiSignal =
  | { kind: "heat_rise"; from: number; to: number }
  | { kind: "heat_fall"; from: number; to: number }
  | { kind: "touch"; intensity: number }
  | { kind: "new_pattern"; pattern: string; intensity: number }
  | { kind: "gentle_tease"; intensity: number }
  | { kind: "motor"; motor: "thrust" | "rotate"; intensity: number }
  | { kind: "halt" };

function escInt(n: number): string {
  return String(Math.max(0, Math.min(100, Math.round(n))));
}

function escPattern(p: string): string {
  const t = p.replace(/[^a-z0-9_-]/gi, "").slice(0, 24).toLowerCase();
  return t || "pulse";
}

/** Single-line user message for `sendUserTextPrompt` — model must not read XML aloud. */
export function buildLiveCallToyUiDialLine(signal: LiveCallToyUiSignal): string {
  switch (signal.kind) {
    case "halt":
      return `<toy_ui kind="halt"/>`;
    case "touch":
      return `<toy_ui kind="touch" intensity="${escInt(signal.intensity)}"/>`;
    case "heat_rise":
      return `<toy_ui kind="heat_rise" from="${escInt(signal.from)}" to="${escInt(signal.to)}"/>`;
    case "heat_fall":
      return `<toy_ui kind="heat_fall" from="${escInt(signal.from)}" to="${escInt(signal.to)}"/>`;
    case "new_pattern":
      return `<toy_ui kind="new_pattern" pattern="${escPattern(signal.pattern)}" intensity="${escInt(signal.intensity)}"/>`;
    case "gentle_tease":
      return `<toy_ui kind="gentle_tease" intensity="${escInt(signal.intensity)}"/>`;
    case "motor":
      return `<toy_ui kind="motor" motor="${signal.motor}" intensity="${escInt(signal.intensity)}"/>`;
  }
}
