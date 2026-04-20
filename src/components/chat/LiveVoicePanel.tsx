import { useCallback, useEffect, useRef, useState } from "react";
import { Flame, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { startGrokRealtimeVoiceSession } from "@/lib/grokRealtimeVoiceSession";
import { invokeGrokVoiceClientSecret } from "@/lib/invokeGrokVoiceClientSecret";
import { invokeGrokStt } from "@/lib/invokeGrokStt";
import { startRampModeDriver, type RampModeDriver } from "@/lib/rampModeDriver";
import {
  createRampTranscriptThrottle,
  type RampTranscriptThrottle,
} from "@/lib/rampTranscriptThrottle";
import type { RampPresetId } from "@/lib/rampModePresets";
import { RAMP_PRESET_IDS, RAMP_PRESET_LABELS, RAMP_PRESET_SHORT } from "@/lib/rampModePresets";
import type { XaiVoiceId } from "@/lib/ttsVoicePresets";
import { cn } from "@/lib/utils";

const QUICK_LINES: { label: string; send: string }[] = [
  { label: "Take control of my toy and edge me", send: "Take control of my toy and edge me." },
  { label: "Be a brat and tease me", send: "Be a brat and tease me." },
  { label: "Talk dirty while controlling my Lovense", send: "Talk dirty while you control my Lovense." },
  { label: "Moan for me", send: "Moan for me — I want to hear you." },
  { label: "Be romantic and seductive", send: "Be romantic and seductive with me." },
  { label: "Degrade me", send: "Degrade me — consensually, in character." },
];

const RAMP_VOICE_ON =
  /\b(activate ramp mode|turn on ramp mode|start ramp mode|enable ramp mode|ramp mode on)\b/i;
const RAMP_VOICE_OFF =
  /\b(stop ramp mode|deactivate ramp mode|turn off ramp mode|disable ramp mode|ramp mode off)\b/i;

type Props = {
  disabled?: boolean;
  busy?: boolean;
  liveInstructions: string;
  xaiVoice: XaiVoiceId;
  onAssistantTranscriptDone?: (text: string) => void;
  onSendText: (text: string) => void;
  rampModeActive: boolean;
  onRampModeActiveChange: (active: boolean) => void;
  rampPreset: RampPresetId;
  onRampPresetChange: (p: RampPresetId) => void;
  hasDevice: boolean;
  userId: string | undefined;
  primaryToyUid: string | null;
  toyIntensityPercent: number;
  prepareToyForRamp: () => Promise<void>;
  className?: string;
};

/**
 * Grok Realtime Voice + optional Ramp Mode (prompt + intensity driver).
 */
export function LiveVoicePanel({
  disabled,
  busy,
  liveInstructions,
  xaiVoice,
  onAssistantTranscriptDone,
  onSendText,
  rampModeActive,
  onRampModeActiveChange,
  rampPreset,
  onRampPresetChange,
  hasDevice,
  userId,
  primaryToyUid,
  toyIntensityPercent,
  prepareToyForRamp,
  className,
}: Props) {
  const [mode, setMode] = useState<"idle" | "realtime">("idle");
  const [statusLine, setStatusLine] = useState("");
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [rampDisplayIntensity, setRampDisplayIntensity] = useState(0);

  const realtimeStopRef = useRef<(() => void) | null>(null);
  const updateSessionInstructionsRef = useRef<((instructions: string) => void) | null>(null);
  const liveInstructionsRef = useRef(liveInstructions);
  liveInstructionsRef.current = liveInstructions;

  const rampDriverRef = useRef<RampModeDriver | null>(null);
  const transcriptThrottleRef = useRef<RampTranscriptThrottle | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      realtimeStopRef.current?.();
      realtimeStopRef.current = null;
      updateSessionInstructionsRef.current = null;
      void rampDriverRef.current?.stop();
      rampDriverRef.current = null;
      transcriptThrottleRef.current?.dispose();
      transcriptThrottleRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mode === "realtime" && updateSessionInstructionsRef.current) {
      updateSessionInstructionsRef.current(liveInstructions);
    }
  }, [liveInstructions, mode]);

  useEffect(() => {
    if (!rampModeActive || mode !== "realtime" || !userId || !hasDevice) {
      void rampDriverRef.current?.stop();
      rampDriverRef.current = null;
      setRampDisplayIntensity(0);
      return;
    }

    let cancelled = false;
    void (async () => {
      await prepareToyForRamp();
      if (cancelled) return;
      await rampDriverRef.current?.stop();
      rampDriverRef.current = null;
      rampDriverRef.current = startRampModeDriver({
        userId,
        toyId: primaryToyUid ?? undefined,
        preset: rampPreset,
        userIntensityPercent: toyIntensityPercent,
        onDisplayIntensity: (n) => setRampDisplayIntensity(n),
      });
    })();

    return () => {
      cancelled = true;
      void rampDriverRef.current?.stop();
      rampDriverRef.current = null;
      setRampDisplayIntensity(0);
    };
  }, [
    rampModeActive,
    mode,
    userId,
    hasDevice,
    primaryToyUid,
    rampPreset,
    toyIntensityPercent,
    prepareToyForRamp,
  ]);

  /** Throttled streaming transcript → ramp keyword bias (only while Ramp Mode + Live). */
  useEffect(() => {
    if (!rampModeActive || mode !== "realtime") {
      transcriptThrottleRef.current?.dispose();
      transcriptThrottleRef.current = null;
      return;
    }
    transcriptThrottleRef.current = createRampTranscriptThrottle((text) => {
      rampDriverRef.current?.ingestAssistantSpeech(text);
    });
    return () => {
      transcriptThrottleRef.current?.dispose();
      transcriptThrottleRef.current = null;
    };
  }, [rampModeActive, mode]);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const finishRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return;
    }
    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      rec.stop();
    });
    mediaRecorderRef.current = null;
    setRecording(false);

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    if (blob.size < 400) {
      toast.message("Clip too short — hold the mic a little longer.");
      return;
    }

    setTranscribing(true);
    try {
      const result = await invokeGrokStt(blob, "voice.webm");
      if ("error" in result) {
        toast.error(result.error);
        return;
      }
      const text = result.text.trim();
      if (RAMP_VOICE_ON.test(text)) {
        onRampModeActiveChange(true);
        toast.success("Ramp Mode on — speak to her.");
        return;
      }
      if (RAMP_VOICE_OFF.test(text)) {
        onRampModeActiveChange(false);
        toast.message("Ramp Mode off");
        return;
      }
      onSendText(result.text);
    } finally {
      setTranscribing(false);
    }
  }, [onRampModeActiveChange, onSendText]);

  const startRecording = useCallback(async () => {
    if (disabled || busy || transcribing) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size) chunksRef.current.push(e.data);
      };
      rec.onerror = () => {
        stopStream(stream);
        toast.error("Microphone error.");
        setRecording(false);
      };
      mediaRecorderRef.current = rec;
      rec.start(120);
      setRecording(true);
      rec.addEventListener("stop", () => stopStream(rec.stream), { once: true });
    } catch {
      toast.error("Microphone permission denied or unavailable.");
    }
  }, [busy, disabled, stopStream, transcribing]);

  const stopRealtime = useCallback(() => {
    void rampDriverRef.current?.stop();
    rampDriverRef.current = null;
    transcriptThrottleRef.current?.dispose();
    transcriptThrottleRef.current = null;
    setRampDisplayIntensity(0);
    realtimeStopRef.current?.();
    realtimeStopRef.current = null;
    updateSessionInstructionsRef.current = null;
    setMode("idle");
    setStatusLine("");
  }, []);

  const startRealtime = useCallback(async () => {
    if (disabled || busy) return;
    setStatusLine("Getting session…");
    const secret = await invokeGrokVoiceClientSecret();
    if ("error" in secret) {
      toast.error(secret.error);
      setStatusLine("");
      return;
    }

    const { stop, updateSessionInstructions } = startGrokRealtimeVoiceSession({
      clientSecret: secret.value,
      instructions: liveInstructionsRef.current,
      voice: xaiVoice,
      onStatus: (s) => setStatusLine(s),
      onError: (e) => {
        toast.error(e.message);
        stopRealtime();
      },
      onAssistantTranscriptDelta: (d, acc) => {
        transcriptThrottleRef.current?.onDelta(d, acc);
      },
      onAssistantTranscriptDone: (t) => {
        transcriptThrottleRef.current?.flushTurn(t);
        onAssistantTranscriptDone?.(t);
      },
    });
    realtimeStopRef.current = stop;
    updateSessionInstructionsRef.current = updateSessionInstructions;
    setMode("realtime");
  }, [busy, disabled, onAssistantTranscriptDone, stopRealtime, xaiVoice]);

  const toggleSttRecord = useCallback(async () => {
    if (transcribing || busy) return;
    if (recording) {
      await finishRecording();
    } else {
      await startRecording();
    }
  }, [busy, finishRecording, recording, startRecording, transcribing]);

  const toggleRampMode = useCallback(() => {
    if (!hasDevice && !rampModeActive) {
      toast.message("Link a Lovense toy to use Ramp Mode — voice prompt still applies.");
    }
    onRampModeActiveChange(!rampModeActive);
  }, [hasDevice, onRampModeActiveChange, rampModeActive]);

  const off = Boolean(disabled || busy);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#00ffd4]/20 bg-gradient-to-br from-black/70 via-[hsl(280_30%_8%)]/95 to-black/80 p-4 space-y-3 shadow-[0_0_40px_rgba(0,255,212,0.08)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#00ffd4]/90">Live Voice</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            <span className="text-foreground/90 font-medium">Live</span> keeps the mic open — Grok speaks back in
            real time. Use <span className="text-foreground/90 font-medium">Push-to-talk</span> if you prefer
            transcribe-then-chat.
          </p>
          {statusLine ? (
            <p className="text-[11px] text-[#00ffd4]/85 mt-1.5 font-medium">{statusLine}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 shrink-0 items-end">
          {mode === "realtime" ? (
            <button
              type="button"
              onClick={() => {
                stopRealtime();
                toast.message("Live voice ended");
              }}
              className="relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-destructive bg-destructive/20 text-destructive transition-all touch-manipulation hover:bg-destructive/30"
              title="End live"
            >
              <Square className="h-6 w-6 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              disabled={off}
              onClick={() => void startRealtime()}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-all touch-manipulation",
                "border-[#00ffd4]/50 bg-[#00ffd4]/10 text-[#00ffd4] hover:bg-[#00ffd4]/20",
                off && "opacity-40 pointer-events-none",
              )}
              title="Start live conversation"
            >
              <Mic className="h-7 w-7" />
            </button>
          )}
          <button
            type="button"
            disabled={off || transcribing || mode === "realtime"}
            onClick={() => void toggleSttRecord()}
            className={cn(
              "inline-flex items-center justify-center gap-1 min-h-9 min-w-[7.5rem] text-[10px] font-semibold uppercase tracking-wide px-2 py-1 rounded-lg border border-white/15",
              recording ? "bg-destructive/20 text-destructive border-destructive/40" : "bg-white/[0.06]",
              (off || mode === "realtime") && "opacity-40 pointer-events-none",
            )}
          >
            {transcribing ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                Transcribing…
              </>
            ) : recording ? (
              "Stop & send"
            ) : (
              "Push to talk"
            )}
          </button>
        </div>
      </div>

      {/* Ramp Mode */}
      <div
        className={cn(
          "rounded-xl border border-white/[0.07] bg-black/25 px-3 py-3 space-y-2.5",
          rampModeActive && "border-orange-500/25 bg-gradient-to-br from-orange-950/20 to-transparent",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-200/90">Ramp Mode</p>
          {rampModeActive && mode === "realtime" && hasDevice ? (
            <span className="text-[10px] text-muted-foreground/90 tabular-nums">{Math.round(rampDisplayIntensity)}%</span>
          ) : null}
        </div>

        <button
          type="button"
          disabled={off}
          onClick={toggleRampMode}
          className={cn(
            "w-full rounded-xl px-4 py-3 text-sm font-semibold transition-all touch-manipulation text-center",
            rampModeActive
              ? "bg-gradient-to-r from-orange-600/90 to-rose-700/90 text-white shadow-[0_0_24px_rgba(251,146,60,0.25)]"
              : "bg-gradient-to-r from-orange-500/25 to-rose-600/25 border border-orange-400/30 text-orange-100 hover:from-orange-500/35 hover:to-rose-600/35",
            off && "opacity-40 pointer-events-none",
          )}
        >
          {rampModeActive ? "Ramp Mode active — tap to stop" : "Activate Ramp Mode 🔥"}
        </button>

        {rampModeActive ? (
          <div className="relative pt-0.5">
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500/50 via-orange-500/70 to-rose-500/60 transition-[width] duration-500 ease-out"
                style={{ width: `${hasDevice && mode === "realtime" ? rampDisplayIntensity : 0}%` }}
              />
            </div>
            {hasDevice && mode === "realtime" ? (
              <Flame
                className="pointer-events-none absolute -right-0.5 -top-1 h-4 w-4 text-orange-400/70 animate-pulse"
                aria-hidden
              />
            ) : null}
            <p className="text-[10px] text-muted-foreground/80 mt-1.5 leading-snug">
              {hasDevice && mode === "realtime"
                ? "Subtle intensity strip — toy follows preset + throttled speech nudges."
                : "Connect a toy and start Live for hardware ramping."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {RAMP_PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              disabled={off}
              title={RAMP_PRESET_SHORT[id]}
              onClick={() => onRampPresetChange(id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-medium transition-colors touch-manipulation max-w-[11rem] truncate",
                rampPreset === id
                  ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                  : "border-white/10 bg-black/30 text-foreground/80 hover:bg-white/[0.05]",
                off && "opacity-40 pointer-events-none",
              )}
            >
              {RAMP_PRESET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {QUICK_LINES.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={off || recording || transcribing || mode === "realtime"}
            onClick={() => onSendText(q.send)}
            className="rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[10px] font-medium text-foreground/90 hover:bg-white/[0.06] disabled:opacity-40 text-left leading-snug"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
