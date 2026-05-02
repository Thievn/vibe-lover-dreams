import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Mic, MicOff, Phone, PhoneOff, Sparkles } from "lucide-react";
import type { Companion } from "@/data/companions";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import type { LiveCallMoodId } from "@/lib/buildLiveCallRealtimeInstructions";
import type { LiveCallQuickActionId } from "@/lib/liveCallQuickActions";
import { LIVE_CALL_QUICK_ACTIONS_MORE, LIVE_CALL_QUICK_ACTIONS_PRIMARY } from "@/lib/liveCallQuickActions";
import { LIVE_CALL_MOOD_CHIPS } from "@/lib/liveCallMoods";
import { cn } from "@/lib/utils";
import { LiveCallToyBar } from "./LiveCallToyBar";
import { LiveCallVoicePickerDialog } from "./LiveCallVoicePickerDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { TTS_UX_LABELS } from "@/lib/ttsVoicePresets";

export type LiveCallUiPhase = "preparing" | "ringing" | "connecting" | "live" | "ended" | "error";

function formatMMSS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type ToyBarInput = {
  userId: string;
  toyId: string;
  toyName: string | null;
  onToyUiDial?: (dialLine: string) => void;
} | null;

type Props = {
  companion: Companion;
  option: LiveCallOption;
  phase: LiveCallUiPhase;
  statusLine: string;
  onHangUp: () => void;
  portraitUrl?: string | null;
  liveElapsedSec: number;
  creditsPerMinute: number;
  sessionCreditsEstimate: number;
  callVoiceId: TtsUxVoiceId;
  onCallVoiceChange: (v: TtsUxVoiceId) => void | Promise<void>;
  onPreviewVoice: (v: TtsUxVoiceId) => Promise<void>;
  previewLoadingId: TtsUxVoiceId | null;
  saveVoicePending: boolean;
  toyBar: ToyBarInput;
  callMood: LiveCallMoodId | null;
  onCallMoodChange: (m: LiveCallMoodId) => void;
  onQuickAction: (id: LiveCallQuickActionId) => void;
};

/**
 * Immersive phone-call chrome: one hero portrait, glanceable status, minimal dock controls.
 */
export function LiveCallPhoneShell({
  companion,
  option,
  phase,
  statusLine,
  onHangUp,
  portraitUrl,
  liveElapsedSec,
  creditsPerMinute,
  sessionCreditsEstimate,
  callVoiceId,
  onCallVoiceChange,
  onPreviewVoice,
  previewLoadingId,
  saveVoicePending,
  toyBar,
  callMood,
  onCallMoodChange,
  onQuickAction,
}: Props) {
  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";
  const ringing = phase === "ringing";
  const live = phase === "live";
  const [pickerOpen, setPickerOpen] = useState(false);

  const timeLabel = useMemo(() => formatMMSS(phase === "live" ? liveElapsedSec : 0), [phase, liveElapsedSec]);
  const voiceLine = TTS_UX_LABELS[callVoiceId];

  return (
    <motion.div
      className="relative flex min-h-[100dvh] flex-col overflow-x-hidden bg-[hsl(230_16%_6%)] text-foreground"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.32]"
        style={{
          background: `radial-gradient(ellipse 100% 65% at 50% -5%, ${gFrom}38, transparent 58%), radial-gradient(ellipse 70% 55% at 100% 100%, ${gTo}28, transparent), radial-gradient(ellipse 50% 40% at 0% 80%, ${gFrom}18, transparent)`,
        }}
      />

      <div
        className={cn(
          "relative z-20 w-full border-b border-white/[0.06] px-4 pb-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] backdrop-blur-xl transition-colors",
          ringing ? "bg-pink-950/35" : "bg-black/40",
        )}
      >
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">On call</span>
            <motion.span
              className="font-mono text-lg font-semibold tabular-nums text-white/95"
              aria-live="polite"
              animate={ringing ? { opacity: [1, 0.65, 1] } : { opacity: 1 }}
              transition={ringing ? { duration: 1.6, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              {timeLabel}
            </motion.span>
          </div>
          <div className="text-right text-[10px] leading-tight text-white/50">
            <p className="whitespace-nowrap">−{creditsPerMinute} FC / min</p>
            {phase === "live" && sessionCreditsEstimate > 0 ? (
              <p className="text-white/35">~{sessionCreditsEstimate} FC this session</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-36 pt-5 sm:px-5 sm:pt-7">
        <motion.div
          className="relative mb-3"
          style={{ width: "min(88vw, 17.5rem)" }}
          initial={{ opacity: 0, scale: 0.92, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.05 }}
        >
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-full border border-white/[0.14] bg-black/55 shadow-[0_24px_80px_rgba(0,0,0,0.55)]",
              ringing && "ring-2 ring-pink-400/30 ring-offset-2 ring-offset-[hsl(230_16%_6%)]",
              live && "shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_28px_90px_rgba(0,0,0,0.45)]",
            )}
            style={{ aspectRatio: "1/1" }}
          >
            <motion.div
              className="pointer-events-none absolute inset-0 z-[1] rounded-full"
              animate={
                live || ringing
                  ? {
                      boxShadow: [
                        `inset 0 0 0 0px transparent`,
                        `inset 0 0 48px ${gFrom}55`,
                        `inset 0 0 0 0px transparent`,
                      ],
                    }
                  : {}
              }
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            />
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt=""
                className="relative z-0 h-full w-full object-cover object-top"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-5"
                style={{ background: `linear-gradient(160deg, ${gFrom}, ${gTo})` }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/25">
                  <Phone className="h-8 w-8 text-white/95" />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.p
          className="mb-0.5 max-w-md text-center font-gothic text-xl font-bold tracking-tight text-white sm:text-2xl"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.35 }}
        >
          {companion.name}
        </motion.p>
        <p className="mb-1 line-clamp-2 max-w-md break-words px-1 text-center text-[11px] text-white/60 sm:text-xs">
          {option.title}
        </p>
        <p className="mb-4 line-clamp-1 text-center text-[10px] text-pink-200/55" title={voiceLine}>
          Voice · {voiceLine}
        </p>

        <AnimatePresence>
          {live ? (
            <motion.div
              key="mood-row"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-3 w-full max-w-md space-y-2"
            >
              <p className="text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-white/35">Mood</p>
              <div className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                {LIVE_CALL_MOOD_CHIPS.map(({ id, label }, i) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onCallMoodChange(id)}
                    className={cn(
                      "w-full min-h-[48px] touch-manipulation rounded-full border px-3 py-2 text-center text-[11px] font-medium leading-tight transition active:scale-[0.99]",
                      i === LIVE_CALL_MOOD_CHIPS.length - 1 && "sm:col-span-2 sm:mx-auto sm:max-w-sm",
                      callMood === id
                        ? "border-pink-400/50 bg-pink-500/25 text-pink-50 shadow-[0_0_20px_rgba(236,72,153,0.2)]"
                        : "border-white/[0.08] bg-white/[0.04] text-white/70 hover:border-white/20 hover:bg-white/[0.08]",
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence>
          {live ? (
            <motion.div
              key="quick-row"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mb-4 w-full max-w-md"
            >
              <p className="mb-1.5 text-center text-[9px] font-semibold uppercase tracking-[0.28em] text-white/35">
                Quick taps
              </p>
              <div className="w-full max-w-md space-y-1.5">
                <div className="grid grid-cols-2 gap-2">
                  {LIVE_CALL_QUICK_ACTIONS_PRIMARY.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onQuickAction(a.id)}
                      className="min-h-[52px] w-full touch-manipulation rounded-xl border border-white/[0.1] bg-white/[0.04] px-2 py-2 text-center text-[10px] font-medium leading-tight text-white/85 backdrop-blur-sm transition hover:border-pink-400/35 hover:bg-pink-500/10 hover:text-white active:scale-[0.99]"
                    >
                      {a.label}
                    </button>
                  ))}
                </div>
                {LIVE_CALL_QUICK_ACTIONS_MORE.length > 0 ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex min-h-[48px] w-full touch-manipulation items-center justify-center gap-1 rounded-xl border border-white/15 bg-white/[0.05] px-2 text-[10px] font-medium text-white/80 transition hover:border-pink-400/30 hover:bg-pink-500/10 active:scale-[0.99]"
                      >
                        More teases & lines
                        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="center"
                      className="z-50 w-[min(100vw-2rem,20rem)] border border-white/10 bg-[hsl(230_16%_8%)] text-white/90"
                    >
                      {LIVE_CALL_QUICK_ACTIONS_MORE.map((a) => (
                        <DropdownMenuItem
                          key={a.id}
                          className="cursor-pointer text-xs focus:bg-pink-500/15"
                          onSelect={() => onQuickAction(a.id)}
                        >
                          {a.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div
          className="mb-4 w-full max-w-md rounded-2xl border border-white/[0.06] bg-black/35 px-3 py-2 text-center text-[11px] text-white/82 backdrop-blur-md"
          role="status"
        >
          <div className="mb-0.5 flex items-center justify-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/38">
            {live ? <Mic className="h-3 w-3 text-emerald-400/90" /> : <MicOff className="h-3 w-3 text-white/28" />}
            <span>Line</span>
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed text-white/85">{statusLine}</p>
        </div>
      </div>

      {/* Bottom dock — subtle glass capsule */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.85rem,env(safe-area-inset-bottom))] pt-2"
        style={{
          background: "linear-gradient(to top, rgba(5,6,12,0.92) 0%, rgba(5,6,12,0.55) 55%, transparent 100%)",
        }}
      >
        <div className="flex items-center gap-2.5 rounded-full border border-white/[0.1] bg-black/50 px-2.5 py-2.5 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          {toyBar ? (
            <LiveCallToyBar
              userId={toyBar.userId}
              toyId={toyBar.toyId}
              toyName={toyBar.toyName}
              onToyUiDial={toyBar.onToyUiDial}
            />
          ) : (
            <div
              className="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-dashed border-white/10 text-white/25"
              title="No linked device"
              aria-hidden
            >
              <Sparkles className="h-4 w-4" />
            </div>
          )}

          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.06] text-white/90 transition hover:border-cyan-400/35 hover:bg-cyan-500/10 active:scale-[0.97]"
            aria-label="Voice & preview"
          >
            <Mic className="h-5 w-5" strokeWidth={1.75} />
          </button>

          <div className="mx-0.5 h-8 w-px bg-white/10" aria-hidden />

          <button
            type="button"
            onClick={onHangUp}
            className="flex h-14 w-14 shrink-0 touch-manipulation items-center justify-center rounded-full border border-red-500/25 bg-gradient-to-br from-red-600/95 to-red-900/90 text-white shadow-[0_8px_28px_rgba(220,38,38,0.35)] transition hover:brightness-110 active:scale-[0.96]"
            aria-label="End call"
          >
            <PhoneOff className="h-6 w-6" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <LiveCallVoicePickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        active={callVoiceId}
        savePending={saveVoicePending}
        playingId={previewLoadingId}
        onPlaySample={onPreviewVoice}
        onConfirm={async (v) => {
          await Promise.resolve(onCallVoiceChange(v));
          setPickerOpen(false);
        }}
      />
    </motion.div>
  );
}
