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
  /** Optional portrait — matches chat split hero for a consistent look. */
  portraitUrl?: string | null;
};

export function LiveCallPhoneShell({ companion, option, phase, statusLine, onHangUp, portraitUrl }: Props) {
  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";
  const ringing = phase === "ringing";
  const live = phase === "live";

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[hsl(280_30%_5%)] text-foreground">
      <div
        className="pointer-events-none fixed inset-0 opacity-35"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 20%, ${gFrom}44, transparent), radial-gradient(ellipse 70% 50% at 80% 80%, ${gTo}33, transparent)`,
        }}
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-10 pt-12 sm:px-5 sm:pt-16">
        <div
          className={cn(
            "mb-6 flex w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl shadow-black/50",
            ringing && "ring-2 ring-primary/30",
          )}
          style={{ aspectRatio: "3 / 4", maxHeight: "min(52vh, 28rem)" }}
        >
          {portraitUrl ? (
            <img
              src={portraitUrl}
              alt=""
              className="h-full w-full object-cover object-top"
            />
          ) : (
            <div
              className="flex h-full w-full flex-col items-center justify-center p-6"
              style={{ background: `linear-gradient(160deg, ${gFrom}, ${gTo})` }}
            >
              <div
                className={cn("mb-4 flex h-24 w-24 items-center justify-center rounded-full border border-white/15 bg-black/30", ringing && "animate-pulse")}
              >
                <motion.div
                  animate={ringing ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                  transition={ringing ? { repeat: Infinity, duration: 1.2 } : {}}
                >
                  <Phone className="h-11 w-11 text-white/95" />
                </motion.div>
              </div>
            </div>
          )}
        </div>

        <p className="mb-0.5 max-w-md text-center font-gothic text-xl font-bold text-white sm:text-2xl">{companion.name}</p>
        <p className="mb-4 max-w-md break-words px-1 text-center text-sm leading-snug text-white/80 sm:text-base">{option.title}</p>

        <div
          className="mb-8 w-full max-w-md rounded-2xl border border-white/10 bg-black/50 px-3 py-3 text-center text-xs text-white/90 backdrop-blur-md sm:px-4"
          role="status"
        >
          <div className="mb-1 flex items-center justify-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            {live ? <Mic className="h-3.5 w-3.5 text-emerald-400" /> : <MicOff className="h-3.5 w-3.5 text-white/40" />}
            <span>Status</span>
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed text-white/90">{statusLine}</p>
        </div>

        <div className="mt-auto flex w-full max-w-sm flex-col gap-4">
          <button
            type="button"
            onClick={onHangUp}
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-red-600/90 py-4 text-base font-bold text-white shadow-lg shadow-red-900/40 transition hover:bg-red-500 active:scale-[0.99]"
          >
            <PhoneOff className="h-5 w-5" />
            End call
          </button>
        </div>
      </div>
    </div>
  );
}
