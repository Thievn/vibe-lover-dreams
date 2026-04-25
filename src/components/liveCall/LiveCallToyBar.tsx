import { useState } from "react";
import { sendCommand, type LovenseCommand } from "@/lib/lovense";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const LEVELS: { k: "low" | "mid" | "high"; label: string; intensity: number }[] = [
  { k: "low", label: "Low", intensity: 28 },
  { k: "mid", label: "Med", intensity: 55 },
  { k: "high", label: "High", intensity: 88 },
];

const PRESETS: { label: string; cmd: Omit<LovenseCommand, "toyId"> }[] = [
  {
    label: "Pulse",
    cmd: { command: "pattern", intensity: 60, pattern: "pulse", patternSubtype: "preset", duration: 10_000 },
  },
  {
    label: "Wave",
    cmd: { command: "pattern", intensity: 60, pattern: "wave", patternSubtype: "preset", duration: 10_000 },
  },
  { label: "Tease", cmd: { command: "vibrate", intensity: 30, duration: 8000 } },
  { label: "Strong", cmd: { command: "vibrate", intensity: 90, duration: 8000 } },
];

type Props = {
  userId: string;
  toyId: string;
  toyName: string | null;
  className?: string;
};

/**
 * Minimal in-call toy strip: intensity tier + a few one-tap patterns.
 * Companion “control” is mirrored via @/lib/liveCallToyFromAssistantSpeech in the page.
 */
export function LiveCallToyBar({ userId, toyId, toyName, className }: Props) {
  const [level, setLevel] = useState<"low" | "mid" | "high">("mid");
  const [sending, setSending] = useState(false);

  const go = async (base: LovenseCommand) => {
    setSending(true);
    try {
      await sendCommand(userId, { ...base, toyId });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toy command failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-sm rounded-2xl border border-white/10 bg-black/35 px-3 py-2.5 shadow-inner backdrop-blur-sm",
        className,
      )}
    >
      <p className="mb-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
        Device{toyName ? ` · ${toyName}` : ""}
      </p>

      {/* Intensity: discrete Low / Med / High — same underlying vibrate, different duty for users who prefer a simple scale */}
      <div className="mb-2.5 flex items-center justify-center gap-1.5" role="group" aria-label="Vibration level">
        {LEVELS.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            disabled={sending}
            onClick={() => {
              setLevel(k);
              void go({ command: "vibrate", intensity: LEVELS.find((x) => x.k === k)!.intensity, duration: 8000, toyId });
            }}
            className={cn(
              "h-7 min-w-[2.5rem] rounded-lg px-1.5 text-[11px] font-semibold transition",
              level === k
                ? "bg-pink-500/35 text-pink-100 ring-1 ring-pink-400/40"
                : "bg-white/5 text-white/55 hover:bg-white/10",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={sending}
            onClick={() => void go({ ...p.cmd, toyId })}
            className="h-8 min-w-0 rounded-lg border border-white/10 bg-white/5 px-2.5 text-[11px] font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10"
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          disabled={sending}
          onClick={() => void go({ command: "stop", intensity: 0, duration: 0, toyId })}
          className="h-8 rounded-lg border border-white/10 bg-red-500/20 px-2.5 text-[11px] font-medium text-red-200/90 hover:bg-red-500/30"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
