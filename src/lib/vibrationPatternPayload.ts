import type { LovenseCommand } from "@/lib/lovense";

export type VibrationPayload = {
  command: "vibrate" | "pattern";
  /** 0–100 — edge function scales to the toy’s 0–20 range */
  intensity: number;
  /** milliseconds */
  duration: number;
  /** Lovense Standard Pattern name when command === "pattern" */
  pattern?: string;
};

export function parseVibrationPayload(raw: unknown): VibrationPayload | null {
  if (typeof raw === "string") {
    try {
      return parseVibrationPayload(JSON.parse(raw) as unknown);
    } catch {
      return null;
    }
  }
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const cmd = p.command === "pattern" ? "pattern" : "vibrate";
  const intensity = typeof p.intensity === "number" ? p.intensity : Number(p.intensity ?? 50);
  const duration = typeof p.duration === "number" ? p.duration : Number(p.duration ?? 8000);
  if (!Number.isFinite(intensity) || !Number.isFinite(duration)) return null;
  if (cmd === "pattern") {
    const pat = typeof p.pattern === "string" ? p.pattern : "";
    if (!pat.trim()) return null;
    return { command: "pattern", intensity: Math.min(100, Math.max(0, intensity)), duration, pattern: pat.trim() };
  }
  return { command: "vibrate", intensity: Math.min(100, Math.max(0, intensity)), duration };
}

/** Maps DB JSON payload → edge function / sendCommand body (intensity 0–100). */
export function payloadToLovenseCommand(payload: unknown): LovenseCommand | null {
  const p = parseVibrationPayload(payload);
  if (!p) return null;
  if (p.command === "pattern" && p.pattern) {
    return {
      command: "pattern",
      pattern: p.pattern,
      intensity: p.intensity,
      duration: p.duration,
    };
  }
  return {
    command: "vibrate",
    intensity: p.intensity,
    duration: p.duration,
  };
}
