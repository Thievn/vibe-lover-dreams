import type { LovenseCommand } from "@/lib/lovense";

export type VibrationPayload =
  | { command: "vibrate"; intensity: number; duration: number }
  | { command: "pattern"; patternMode: "preset"; pattern: string; intensity: number; duration: number }
  | { command: "pattern"; patternMode: "custom"; rule: string; strength: string; intensity: number; duration: number };

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
  const intensity = typeof p.intensity === "number" ? p.intensity : Number(p.intensity ?? 50);
  const duration = typeof p.duration === "number" ? p.duration : Number(p.duration ?? 8000);
  if (!Number.isFinite(intensity) || !Number.isFinite(duration)) return null;
  const i = Math.min(100, Math.max(0, intensity));
  const d = duration;

  const rawCmd = typeof p.command === "string" ? p.command.toLowerCase().trim() : "";
  if (rawCmd !== "pattern") {
    return { command: "vibrate", intensity: i, duration: d };
  }

  const rule = typeof p.rule === "string" ? p.rule.trim() : "";
  const strength = typeof p.strength === "string" ? p.strength.trim() : "";
  const patternModeRaw = typeof p.patternMode === "string" ? p.patternMode.trim().toLowerCase() : "";

  const isCustom =
    patternModeRaw === "custom" || (rule.length > 0 && strength.length > 0 && patternModeRaw !== "preset");

  if (isCustom) {
    if (!rule || !strength) return null;
    return { command: "pattern", patternMode: "custom", rule, strength, intensity: i, duration: d };
  }

  const pat = typeof p.pattern === "string" ? p.pattern.trim() : "";
  if (!pat) return null;
  return { command: "pattern", patternMode: "preset", pattern: pat, intensity: i, duration: d };
}

/** Maps DB JSON payload → edge function / sendCommand body (intensity 0–100). */
export function payloadToLovenseCommand(payload: unknown): LovenseCommand | null {
  const parsed = parseVibrationPayload(payload);
  if (!parsed) return null;
  if (parsed.command === "vibrate") {
    return {
      command: "vibrate",
      intensity: parsed.intensity,
      duration: parsed.duration,
    };
  }
  if (parsed.patternMode === "custom") {
    return {
      command: "pattern",
      patternSubtype: "custom",
      patternRule: parsed.rule,
      patternStrength: parsed.strength,
      intensity: parsed.intensity,
      duration: parsed.duration,
    };
  }
  return {
    command: "pattern",
    patternSubtype: "preset",
    pattern: parsed.pattern,
    intensity: parsed.intensity,
    duration: parsed.duration,
  };
}
