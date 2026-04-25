import { useMemo, useState } from "react";
import { Mic, MicOff, Phone, PhoneOff } from "lucide-react";
import type { Companion } from "@/data/companions";
import type { LiveCallOption } from "@/lib/liveCallTypes";
import { cn } from "@/lib/utils";
import { LiveCallToyBar } from "./LiveCallToyBar";
import { LiveCallVoicePickerDialog } from "./LiveCallVoicePickerDialog";
import type { TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { TTS_UX_LABELS } from "@/lib/ttsVoicePresets";

export type LiveCallUiPhase = "preparing" | "ringing" | "connecting" | "live" | "ended" | "error";

function formatMMSS(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

type ToyBarInput = { userId: string; toyId: string; toyName: string | null } | null;

type Props = {
  companion: Companion;
  option: LiveCallOption;
  phase: LiveCallUiPhase;
  statusLine: string;
  onHangUp: () => void;
  /** Single headshot — the only “visual” on this screen besides chrome. */
  portraitUrl?: string | null;
  liveElapsedSec: number;
  /** Shown as informational burn rate; server metering may differ until wired. */
  creditsPerMinute: number;
  sessionCreditsEstimate: number;
  callVoiceId: TtsUxVoiceId;
  onCallVoiceChange: (v: TtsUxVoiceId) => void | Promise<void>;
  onPreviewVoice: (v: TtsUxVoiceId) => Promise<void>;
  previewLoadingId: TtsUxVoiceId | null;
  saveVoicePending: boolean;
  toyBar: ToyBarInput;
};

/**
 * Strips gallery/extra chrome: one avatar, a phone-like status readout, timer, credits, hang-up.
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
}: Props) {
  const gFrom = companion.gradientFrom || "#7B2D8E";
  const gTo = companion.gradientTo || "#FF2D7B";
  const ringing = phase === "ringing";
  const live = phase === "live";
  const [pickerOpen, setPickerOpen] = useState(false);

  const timeLabel = useMemo(() => formatMMSS(phase === "live" ? liveElapsedSec : 0), [phase, liveElapsedSec]);
  const voiceLine = TTS_UX_LABELS[callVoiceId];

  return (
    <div className="flex min-h-[100dvh] flex-col overflow-x-hidden bg-[hsl(230_16%_6%)] text-foreground">
      {/* Calm, phone-like dim gradient — not a “gallery” */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.28]"
        style={{
          background: `radial-gradient(ellipse 100% 70% at 50% 0%, ${gFrom}2a, transparent 55%), radial-gradient(ellipse 80% 50% at 100% 100%, ${gTo}22, transparent)`,
        }}
      />

      {/* Timer + credit strip — high contrast, glanceable in bright sun or PIP / backgrounding */}
      <div className="relative z-20 w-full border-b border-white/[0.07] bg-black/50 px-4 py-2.5 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-2 text-sm">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">On call</span>
            <span
              className="font-mono text-lg font-semibold tabular-nums text-white/95"
              aria-live="polite"
            >
              {timeLabel}
            </span>
          </div>
          <div className="text-right text-[11px] leading-tight text-white/55">
            <p className="whitespace-nowrap">−{creditsPerMinute} FC / min</p>
            {phase === "live" && sessionCreditsEstimate > 0 ? (
              <p className="text-white/40">~{sessionCreditsEstimate} FC this session</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col items-center px-4 pb-8 pt-6 sm:px-5 sm:pb-10 sm:pt-8">
        {/* One portrait, tight crop — the “star” without gallery chrome */}
        <div className="relative mb-4" style={{ width: "min(88vw, 18rem)" }}>
          <div
            className={cn(
              "relative w-full overflow-hidden rounded-full border border-white/12 bg-black/50 shadow-2xl shadow-black/50",
              ringing && "ring-2 ring-pink-400/25",
            )}
            style={{ aspectRatio: "1/1" }}
          >
            {portraitUrl ? (
              <img
                src={portraitUrl}
                alt=""
                className="h-full w-full object-cover object-top"
                decoding="async"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center p-5"
                style={{ background: `linear-gradient(160deg, ${gFrom}, ${gTo})` }}
              >
                <div className="flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-black/20">
                  <Phone className="h-8 w-8 text-white/95" />
                </div>
              </div>
            )}

            {/* Mic icon: opens voice chooser; sits on the photo edge like a product UI affordance */}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="absolute bottom-1.5 right-1.5 flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white shadow-lg shadow-black/40 transition hover:border-white/35 hover:bg-black/80"
              aria-label="Change companion voice & preview"
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
        </div>

        <p className="mb-0.5 max-w-md text-center font-gothic text-lg font-bold tracking-tight text-white sm:text-xl">
          {companion.name}
        </p>
        <p className="mb-1.5 line-clamp-2 max-w-md break-words px-1 text-center text-xs text-white/65 sm:text-sm">
          {option.title}
        </p>
        <p className="mb-5 line-clamp-1 text-center text-[11px] text-pink-200/70" title={voiceLine}>
          Voice: {voiceLine}
        </p>

        {toyBar && (
          <div className="mb-4 w-full max-w-sm">
            <LiveCallToyBar userId={toyBar.userId} toyId={toyBar.toyId} toyName={toyBar.toyName} />
          </div>
        )}

        <div
          className="mb-5 w-full max-w-md rounded-2xl border border-white/[0.07] bg-black/45 px-3 py-2.5 text-center text-xs text-white/85 backdrop-blur-md"
          role="status"
        >
          <div className="mb-0.5 flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/45">
            {live ? <Mic className="h-3 w-3 text-emerald-400" /> : <MicOff className="h-3 w-3 text-white/30" />}
            <span>Line</span>
          </div>
          <p className="whitespace-pre-wrap break-words leading-relaxed text-white/88">{statusLine}</p>
        </div>

        <div className="mt-auto flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={onHangUp}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-600/90 py-3.5 text-base font-semibold text-white shadow-md shadow-red-900/20 transition hover:bg-red-500 active:scale-[0.99]"
          >
            <PhoneOff className="h-4 w-4" />
            End call
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
    </div>
  );
}
