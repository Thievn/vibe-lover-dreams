import type { LovenseCommand } from "@/lib/lovense";

/**
 * Heuristic mapping from assistant *spoken* transcript to a Lovense command.
 * Realtime voice does not emit silent JSON; we match natural phrases the model
 * is instructed to use (see `buildLiveCallRealtimeInstructions` toy appendix).
 */
export function liveCallToyCommandFromAssistantLine(
  line: string,
  opts: { toyDeviceUid: string },
): LovenseCommand | null {
  const t = String(line ?? "").toLowerCase();
  if (t.length < 6) return null;

  const base = { toyId: opts.toyDeviceUid, duration: 8000 } as const;

  if (/\b(stop (it|the toy|this)|hold (it|everything)|cool (down|off)|ease off completely|full stop)\b/.test(t)) {
    return { command: "stop", intensity: 0, duration: 0, toyId: opts.toyDeviceUid };
  }

  if (
    /\b(turn (the toy |it )?on|switch (the toy |it )?on|power (it )?on|wake (the toy |it )?up|start (the )?(vibrat|buzz)|make (it )?buzz|get (the toy |it )?going)\b/.test(
      t,
    )
  ) {
    return { command: "vibrate", intensity: 48, ...base };
  }

  if (/\b(pulse|pulsing|rhythm(ing)?|beat(ing)? like a heart)\b/.test(t)) {
    return {
      command: "pattern",
      intensity: 60,
      pattern: "pulse",
      patternSubtype: "preset",
      ...base,
    };
  }

  if (/\b(wave|rolling|rolling through|ebb|flow(ing)? like a wave)\b/.test(t)) {
    return {
      command: "pattern",
      intensity: 60,
      pattern: "wave",
      patternSubtype: "preset",
      ...base,
    };
  }

  if (/\b(strong|hard(er)?|max|all the way|crank(ing)? (it )?up|turn(ing)? (it )?(all the way )?up|dial(ing)? to max)\b/.test(t)) {
    return { command: "vibrate", intensity: 92, ...base };
  }

  if (/\b(tease|teasing|light|soft|gentle|slow(ly)?|barely|whisper of|feather)\b/.test(t)) {
    return { command: "vibrate", intensity: 28, ...base };
  }

  if (/\b(medium|middle|steady|moderate|even)\b/.test(t)) {
    return { command: "vibrate", intensity: 55, ...base };
  }

  return null;
}
