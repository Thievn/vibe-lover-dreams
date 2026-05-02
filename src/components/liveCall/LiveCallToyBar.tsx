import { useEffect, useRef, useState } from "react";
import { type LovenseCommand } from "@/lib/lovense";
import { createSustainedLovenseSession } from "@/lib/sustainedLovenseSession";
import { buildLiveCallToyUiDialLine, type LiveCallToyUiSignal } from "@/lib/liveCallToyUiReaction";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Waves, Zap, HeartPulse, Square, ArrowBigUpDash, RotateCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LEVELS: { k: "low" | "mid" | "high"; label: string; intensity: number }[] = [
  { k: "low", label: "Low", intensity: 28 },
  { k: "mid", label: "Med", intensity: 55 },
  { k: "high", label: "High", intensity: 88 },
];

type PresetRow = {
  label: string;
  icon: typeof Waves;
  cmd: Omit<LovenseCommand, "toyId">;
  /** Static signal or resolver (reads latest vibrate baseline for “Strong”). */
  signal: LiveCallToyUiSignal | (() => LiveCallToyUiSignal);
};

function resolvePresetSignal(p: PresetRow): LiveCallToyUiSignal {
  return typeof p.signal === "function" ? p.signal() : p.signal;
}

type Props = {
  userId: string;
  toyId: string;
  toyName: string | null;
  className?: string;
  /** Live Voice: after a successful command, inject dial line so Grok speaks a short reaction. */
  onToyUiDial?: (dialLine: string) => void;
};

function vibrateSignal(next: number, lastVibrate: number | null): LiveCallToyUiSignal {
  if (lastVibrate == null) return { kind: "touch", intensity: next };
  if (next > lastVibrate + 3) return { kind: "heat_rise", from: lastVibrate, to: next };
  if (next < lastVibrate - 3) return { kind: "heat_fall", from: lastVibrate, to: next };
  return { kind: "touch", intensity: next };
}

/**
 * Compact device control: icon trigger + dropdown (levels, patterns, motors, stop).
 * Voice reactions are triggered only when `onToyUiDial` is passed (Live Call page, live phase).
 * Haptics use a sustained session (30s Lovense segments + refresh) until Stop or a different command.
 */
export function LiveCallToyBar({ userId, toyId, toyName, className, onToyUiDial }: Props) {
  const [level, setLevel] = useState<"low" | "mid" | "high">("mid");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const lastVibrateIntensityRef = useRef<number | null>(null);
  const sustainedRef = useRef<{ stop: () => Promise<void> } | null>(null);

  const stopSustained = async () => {
    const cur = sustainedRef.current;
    sustainedRef.current = null;
    if (cur) await cur.stop();
  };

  useEffect(() => {
    return () => {
      const cur = sustainedRef.current;
      sustainedRef.current = null;
      void cur?.stop();
    };
  }, []);

  const presets: PresetRow[] = [
    {
      label: "Pulse",
      icon: Zap,
      cmd: { command: "pattern", intensity: 60, pattern: "pulse", patternSubtype: "preset", duration: 10_000 },
      signal: { kind: "new_pattern", pattern: "pulse", intensity: 60 },
    },
    {
      label: "Wave",
      icon: Waves,
      cmd: { command: "pattern", intensity: 60, pattern: "wave", patternSubtype: "preset", duration: 10_000 },
      signal: { kind: "new_pattern", pattern: "wave", intensity: 60 },
    },
    {
      label: "Tease",
      icon: HeartPulse,
      cmd: { command: "vibrate", intensity: 30, duration: 8000 },
      signal: { kind: "gentle_tease", intensity: 30 },
    },
    {
      label: "Strong",
      icon: Zap,
      cmd: { command: "vibrate", intensity: 90, duration: 8000 },
      signal: () => vibrateSignal(90, lastVibrateIntensityRef.current),
    },
    {
      label: "Thrust",
      icon: ArrowBigUpDash,
      cmd: { command: "thrust", intensity: 65, duration: 8000 },
      signal: { kind: "motor", motor: "thrust", intensity: 65 },
    },
    {
      label: "Rotate",
      icon: RotateCw,
      cmd: { command: "rotate", intensity: 55, duration: 8000 },
      signal: { kind: "motor", motor: "rotate", intensity: 55 },
    },
  ];

  const go = async (base: LovenseCommand, signal: LiveCallToyUiSignal) => {
    setSending(true);
    try {
      if (base.command === "stop") {
        await stopSustained();
        onToyUiDial?.(buildLiveCallToyUiDialLine(signal));
        lastVibrateIntensityRef.current = null;
        return;
      }

      await stopSustained();
      const fullCmd: LovenseCommand = { ...base, toyId };
      sustainedRef.current = createSustainedLovenseSession(userId, fullCmd);
      onToyUiDial?.(buildLiveCallToyUiDialLine(signal));

      if (base.command === "vibrate") {
        lastVibrateIntensityRef.current = base.intensity ?? lastVibrateIntensityRef.current;
      } else if (base.command === "pattern" || base.command === "thrust" || base.command === "rotate") {
        lastVibrateIntensityRef.current = base.intensity ?? lastVibrateIntensityRef.current;
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Toy command failed");
    } finally {
      setSending(false);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={sending}
          title={toyName ? `Device · ${toyName}` : "Linked device"}
          aria-label="Toy and haptics"
          className={cn(
            "flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white/90 shadow-inner backdrop-blur-md transition",
            "hover:border-pink-400/35 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/40 active:scale-[0.97]",
            open && "border-pink-400/40 bg-pink-500/15",
            className,
          )}
        >
          <HeartPulse className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-56 border-white/10 bg-[#0a0a10]/95 text-white backdrop-blur-xl"
      >
        <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
          {toyName ? `Device · ${toyName}` : "Device"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-white/35">Level</DropdownMenuLabel>
        {LEVELS.map(({ k, label, intensity }) => (
          <DropdownMenuItem
            key={k}
            disabled={sending}
            onClick={() => {
              setLevel(k);
              const prev = lastVibrateIntensityRef.current;
              const sig = vibrateSignal(intensity, prev);
              void go({ command: "vibrate", intensity, duration: 8000, toyId }, sig);
            }}
            className={cn(
              "gap-2 text-sm focus:bg-white/10 focus:text-white",
              level === k && "bg-pink-500/20 text-pink-100",
            )}
          >
            <span className="flex-1">{label}</span>
            <span className="text-[10px] text-white/40">{intensity}%</span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-white/35">Patterns & motors</DropdownMenuLabel>
        {presets.map((p) => (
          <DropdownMenuItem
            key={p.label}
            disabled={sending}
            onClick={() => void go({ ...p.cmd, toyId }, resolvePresetSignal(p))}
            className="gap-2 text-sm focus:bg-white/10 focus:text-white"
          >
            <p.icon className="h-3.5 w-3.5 text-pink-300/90" />
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          disabled={sending}
          onClick={() => void go({ command: "stop", intensity: 0, duration: 0, toyId }, { kind: "halt" })}
          className="gap-2 text-sm text-red-200 focus:bg-red-500/15 focus:text-red-100"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
