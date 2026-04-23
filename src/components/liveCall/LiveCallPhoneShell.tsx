import { motion } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff } from "lucide-react";
import type { Companion } from "@/data/companions";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { cn } from "@/lib/utils";

export type LiveCallUiPhase = "preparing" | "ringing" | "connecting" | "live" | "ended" | "error";

type Props = {
  companion: Companion;
  option: LiveCallOption;
  phase: LiveCallUiPhase;
  statusLine: string;
  onHangUp: () => void;
};

export function LiveCallPhoneShell({ companion, option, phase, statusLine, onHangUp }: Props) {
  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";
  const ringing = phase === "ringing";
  const live = phase === "live";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 20%, ${gFrom}55, transparent), radial-gradient(ellipse 70% 50% at 80% 80%, ${gTo}44, transparent)`,
        }}
      />

      <div className="relative z-10 flex flex-1 flex-col items-center px-5 pb-10 pt-16">
        <div
          className={cn(
            "mb-10 flex h-36 w-36 items-center justify-center rounded-full border border-white/10 shadow-2xl",
            ringing && "animate-pulse",
          )}
          style={{
            background: `linear-gradient(145deg, ${gFrom}, ${gTo})`,
            boxShadow: `0 0 60px ${gFrom}66`,
          }}
        >
          <motion.div
            animate={ringing ? { scale: [1, 1.06, 1] } : { scale: 1 }}
            transition={ringing ? { repeat: Infinity, duration: 1.2 } : {}}
            className="flex h-28 w-28 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm"
          >
            <Phone className="h-12 w-12 text-white" />
          </motion.div>
        </div>

        <p className="mb-1 text-center font-gothic text-2xl font-bold text-white">{companion.name}</p>
        <p className="mb-6 max-w-sm text-center text-sm text-white/75">{option.title}</p>

        <div className="mb-8 flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs text-muted-foreground backdrop-blur-md">
          {live ? (
            <Mic className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <MicOff className="h-3.5 w-3.5 text-white/40" />
          )}
          <span className="text-white/85">{statusLine}</span>
        </div>

        <div className="mt-auto flex w-full max-w-xs flex-col gap-4">
          <button
            type="button"
            onClick={onHangUp}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600/90 py-4 text-base font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.98]"
          >
            <PhoneOff className="h-5 w-5" />
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
