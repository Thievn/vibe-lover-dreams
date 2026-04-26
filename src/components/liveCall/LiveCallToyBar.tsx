import { useState } from "react";
import { sendCommand, type LovenseCommand } from "@/lib/lovense";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Waves, Zap, HeartPulse, Square } from "lucide-react";
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

const PRESETS: { label: string; icon: typeof Waves; cmd: Omit<LovenseCommand, "toyId"> }[] = [
  {
    label: "Pulse",
    icon: Zap,
    cmd: { command: "pattern", intensity: 60, pattern: "pulse", patternSubtype: "preset", duration: 10_000 },
  },
  {
    label: "Wave",
    icon: Waves,
    cmd: { command: "pattern", intensity: 60, pattern: "wave", patternSubtype: "preset", duration: 10_000 },
  },
  { label: "Tease", icon: HeartPulse, cmd: { command: "vibrate", intensity: 30, duration: 8000 } },
  { label: "Strong", icon: Zap, cmd: { command: "vibrate", intensity: 90, duration: 8000 } },
];

type Props = {
  userId: string;
  toyId: string;
  toyName: string | null;
  className?: string;
};

/**
 * Compact device control: icon trigger + dropdown (levels, patterns, stop).
 */
export function LiveCallToyBar({ userId, toyId, toyName, className }: Props) {
  const [level, setLevel] = useState<"low" | "mid" | "high">("mid");
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={sending}
          title={toyName ? `Device · ${toyName}` : "Linked device"}
          aria-label="Toy and haptics"
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white/90 shadow-inner backdrop-blur-md transition",
            "hover:border-pink-400/35 hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400/40",
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
              void go({ command: "vibrate", intensity, duration: 8000, toyId });
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
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-white/35">Patterns</DropdownMenuLabel>
        {PRESETS.map((p) => (
          <DropdownMenuItem
            key={p.label}
            disabled={sending}
            onClick={() => void go({ ...p.cmd, toyId })}
            className="gap-2 text-sm focus:bg-white/10 focus:text-white"
          >
            <p.icon className="h-3.5 w-3.5 text-pink-300/90" />
            {p.label}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuItem
          disabled={sending}
          onClick={() => void go({ command: "stop", intensity: 0, duration: 0, toyId })}
          className="gap-2 text-sm text-red-200 focus:bg-red-500/15 focus:text-red-100"
        >
          <Square className="h-3.5 w-3.5" />
          Stop
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
