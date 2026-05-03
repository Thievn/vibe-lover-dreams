import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Flame, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { invokeGrokStt } from "@/lib/invokeGrokStt";
import { matchesSafeWord } from "@/lib/matchesSafeWord";
import { startRampModeDriver, type RampModeDriver } from "@/lib/rampModeDriver";
import type { RampPresetId } from "@/lib/rampModePresets";
import { RAMP_PRESET_IDS, RAMP_PRESET_LABELS, RAMP_PRESET_SHORT } from "@/lib/rampModePresets";
import { cn } from "@/lib/utils";

const QUICK_LINES: { label: string; send: string }[] = [
  { label: "Take control of my toy and edge me", send: "Take control of my toy and edge me." },
  { label: "Do your signature move on me", send: "Do your signature move on me — toy and all." },
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

function LiveMicWaveBars({ active }: { active: boolean }) {
  if (!active) return null;
  const heights = [5, 12, 8, 14, 7];
  return (
    <span className="flex h-8 items-end gap-0.5 px-0.5" aria-hidden>
      {heights.map((h, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-destructive/90"
          style={{ height: h, transformOrigin: "bottom" }}
          animate={{ scaleY: [0.45, 1, 0.5, 0.95, 0.45] }}
          transition={{
            duration: 0.55,
            repeat: Infinity,
            delay: i * 0.07,
            ease: "easeInOut",
          }}
        />
      ))}
    </span>
  );
}

type Props = {
  companionName: string;
  disabled?: boolean;
  busy?: boolean;
  /** Same rate as full-screen Live Call; shown while session is active. */
  creditsPerMinute?: number;
  sessionElapsedSec?: number;
  /** Fires when open-mic recording starts/stops (not transcribing). Parent uses this for billing ticks. */
  onMicRecordingChange?: (recording: boolean) => void;
  /** When true, mic is closed — ramp presets and quick chips stay off until they open the mic again. */
  voiceInteractiveLocked?: boolean;
  /** Parent stores this to nudge Ramp Mode from Grok assistant replies (typed or voice turn). */
  onRegisterRampAssistFeed?: (fn: ((text: string) => void) | null) => void;
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
  /** Same store as header — if spoken, we route through the chat path as the safe word. */
  safeWord: string;
  /** Increment from parent to cancel the open mic and streams (emergency, safe word, etc.). */
  emergencyStopTick: number;
  onVoiceSettingsClick?: () => void;
  className?: string;
};

/**
 * Voice: STT (xAI) → same chat path as typing (Grok) → optional Grok TTS from Chat autoplay.
 * Ramp Mode follows assistant text from Grok via `onRegisterRampAssistFeed`.
 */
export function LiveVoicePanel({
  companionName,
  disabled,
  busy,
  creditsPerMinute,
  sessionElapsedSec = 0,
  onMicRecordingChange,
  voiceInteractiveLocked = false,
  onRegisterRampAssistFeed,
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
  safeWord,
  emergencyStopTick,
  onVoiceSettingsClick,
  className,
}: Props) {
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [rampDisplayIntensity, setRampDisplayIntensity] = useState(0);

  const rampDriverRef = useRef<RampModeDriver | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startInFlightRef = useRef(false);
  const finishRecordingRef = useRef<() => Promise<void>>(async () => {});

  const MIN_AUDIO_BYTES = 200;
  const lastEmergencyTick = useRef(0);

  useEffect(() => {
    return () => {
      void rampDriverRef.current?.stop();
      rampDriverRef.current = null;
    };
  }, []);

  useEffect(() => {
    onRegisterRampAssistFeed?.((text) => {
      rampDriverRef.current?.ingestAssistantSpeech(text);
    });
    return () => onRegisterRampAssistFeed?.(null);
  }, [onRegisterRampAssistFeed]);

  useEffect(() => {
    onMicRecordingChange?.(recording);
  }, [recording, onMicRecordingChange]);

  useEffect(() => {
    if (!rampModeActive || !userId || !hasDevice) {
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
    userId,
    hasDevice,
    primaryToyUid,
    rampPreset,
    toyIntensityPercent,
    prepareToyForRamp,
  ]);

  const stopStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const cancelOpenMic = useCallback(() => {
    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      chunksRef.current = [];
      rec.ondataavailable = null;
      rec.onerror = null;
      rec.onstop = null;
      try {
        if (rec.state === "recording") rec.stop();
      } catch {
        /* ignore */
      }
    }
    mediaRecorderRef.current = null;
    const stream = mediaStreamRef.current;
    mediaStreamRef.current = null;
    stopStream(stream);
    setRecording(false);
    setTranscribing(false);
  }, [stopStream]);

  useEffect(() => {
    return () => {
      cancelOpenMic();
    };
  }, [cancelOpenMic]);

  useEffect(() => {
    if (emergencyStopTick <= 0) return;
    if (emergencyStopTick === lastEmergencyTick.current) return;
    lastEmergencyTick.current = emergencyStopTick;
    cancelOpenMic();
    void rampDriverRef.current?.stop();
  }, [emergencyStopTick, cancelOpenMic]);

  const finishRecording = useCallback(async () => {
    const rec = mediaRecorderRef.current;
    if (!rec || rec.state === "inactive") {
      setRecording(false);
      return;
    }
    try {
      if (rec.state === "recording" && typeof (rec as MediaRecorder & { requestData?: () => void }).requestData === "function") {
        (rec as MediaRecorder & { requestData: () => void }).requestData();
      }
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, 40));

    await new Promise<void>((resolve) => {
      rec.onstop = () => resolve();
      try {
        rec.stop();
      } catch {
        resolve();
      }
    });
    const stream = mediaStreamRef.current;
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    stopStream(stream);
    setRecording(false);

    const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "audio/webm" });
    chunksRef.current = [];
    if (blob.size < MIN_AUDIO_BYTES) {
      toast.message("Didn’t catch that — hold the mic, speak, then release.");
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
      if (safeWord.trim() && matchesSafeWord(text, safeWord)) {
        onSendText(text);
        return;
      }
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
  }, [onRampModeActiveChange, onSendText, stopStream, safeWord]);

  finishRecordingRef.current = finishRecording;

  const startRecording = useCallback(async () => {
    if (disabled || busy || transcribing) return;
    if (startInFlightRef.current || mediaRecorderRef.current) return;
    startInFlightRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
      mediaStreamRef.current = stream;
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
        mediaStreamRef.current = null;
        toast.error("Microphone error.");
        setRecording(false);
      };
      mediaRecorderRef.current = rec;
      rec.start(200);
      setRecording(true);
    } catch {
      mediaStreamRef.current = null;
      toast.error("Microphone permission denied or unavailable.");
    } finally {
      startInFlightRef.current = false;
    }
  }, [busy, disabled, stopStream, transcribing]);

  const off = Boolean(disabled || busy);
  const rampQuickLocked = voiceInteractiveLocked || transcribing;
  const quickLineOff = off || recording || transcribing || voiceInteractiveLocked;
  const rate = typeof creditsPerMinute === "number" && creditsPerMinute > 0 ? creditsPerMinute : null;
  const runningFc =
    rate != null && sessionElapsedSec > 0
      ? Math.ceil(sessionElapsedSec / 60) * rate
      : 0;

  /** Open mic: tap to start, tap again to send (continuous capture while “on”). */
  const onMicClick = useCallback(() => {
    if (off || transcribing) return;
    if (mediaRecorderRef.current) {
      void finishRecordingRef.current();
      return;
    }
    void startRecording();
  }, [off, transcribing, startRecording]);

  const toggleRampMode = useCallback(() => {
    if (!hasDevice && !rampModeActive) {
      toast.message("Link a Lovense toy to use Ramp Mode — voice prompt still applies.");
    }
    onRampModeActiveChange(!rampModeActive);
  }, [hasDevice, onRampModeActiveChange, rampModeActive]);

  return (
    <div
      id="lf-live-voice-panel"
      className={cn(
        "rounded-xl border border-[#00ffd4]/20 bg-gradient-to-br from-black/70 via-[hsl(280_30%_8%)]/95 to-black/80 p-2.5 space-y-2 shadow-[0_0_32px_rgba(0,255,212,0.06)]",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#00ffd4]/90">Live Voice</p>
              {rate != null ? (
                <span className="text-[9px] font-medium tabular-nums text-amber-200/90">
                  {rate} FC/min · ~{runningFc} FC
                </span>
              ) : null}
            </div>
            {onVoiceSettingsClick ? (
              <button
                type="button"
                onClick={onVoiceSettingsClick}
                className="text-[10px] text-primary/80 underline-offset-2 hover:underline"
              >
                Voice &amp; TTS
              </button>
            ) : null}
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight line-clamp-3">
            Forge coins accrue only while the mic is open (same per-started-minute rule as full-screen Live Call).{" "}
            <span className="text-[#00ffd4]/85">Mic open — tap the square when you are done</span> to send and transcribe.
            You can always type below; open the mic again for another voice turn, ramp, or quick line.
            {disabled && rate != null ? (
              <span className="mt-1 block text-amber-200/85">Need at least {rate} FC to use mic &amp; ramp — top up or switch to Classic.</span>
            ) : null}
            {voiceInteractiveLocked && !disabled ? (
              <span className="mt-1 block text-[#00ffd4]/80">Mic is closed — ramp &amp; quick lines unlock when you tap Open.</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="flex items-end gap-1">
            <LiveMicWaveBars active={recording && !transcribing} />
            <button
              type="button"
              disabled={off || transcribing}
              onClick={onMicClick}
              className={cn(
                "relative flex h-11 w-11 select-none items-center justify-center rounded-xl border-2 transition-all touch-manipulation",
                recording
                  ? "border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : "border-[#00ffd4]/50 bg-[#00ffd4]/10 text-[#00ffd4] hover:bg-[#00ffd4]/20",
                off && "opacity-40 pointer-events-none",
              )}
              title={recording ? "Tap to send & transcribe" : "Tap to open the mic"}
              aria-label={recording ? "Stop recording and send to chat" : "Start open microphone for live voice"}
            >
              {transcribing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : recording ? (
                <Square className="h-5 w-5 fill-current" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>
          </div>
          <span className="text-[8px] text-muted-foreground text-right max-w-[6.5rem] leading-tight">
            {transcribing ? "Transcribing…" : recording ? "Recording — tap square" : "Open mic"}
          </span>
        </div>
      </div>

      <div
        id="lf-ramp-block"
        className={cn(
          "rounded-lg border border-white/[0.07] bg-black/25 px-2.5 py-2 space-y-1.5",
          rampModeActive && "border-orange-500/25 bg-gradient-to-br from-orange-950/20 to-transparent",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-orange-200/90">Ramp</p>
          {rampModeActive && hasDevice ? (
            <span className="text-[9px] text-muted-foreground/90 tabular-nums">{Math.round(rampDisplayIntensity)}%</span>
          ) : null}
        </div>

        <button
          type="button"
          disabled={off || rampQuickLocked}
          onClick={toggleRampMode}
          className={cn(
            "w-full rounded-lg px-3 py-2 text-xs font-semibold transition-all touch-manipulation text-center",
            rampModeActive
              ? "bg-gradient-to-r from-orange-600/90 to-rose-700/90 text-white"
              : "bg-gradient-to-r from-orange-500/25 to-rose-600/25 border border-orange-400/30 text-orange-100 hover:from-orange-500/35 hover:to-rose-600/35",
            (off || rampQuickLocked) && "opacity-40 pointer-events-none",
          )}
        >
          {rampModeActive ? "On — tap to stop" : "Activate 🔥"}
        </button>

        {rampModeActive ? (
          <div className="relative">
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-500/50 via-orange-500/70 to-rose-500/60 transition-[width] duration-500 ease-out"
                style={{ width: `${hasDevice ? rampDisplayIntensity : 0}%` }}
              />
            </div>
            {hasDevice ? (
              <Flame
                className="pointer-events-none absolute -right-0.5 -top-1 h-3.5 w-3.5 text-orange-400/70 animate-pulse"
                aria-hidden
              />
            ) : null}
            <p className="text-[9px] text-muted-foreground/80 mt-1 leading-tight line-clamp-1">
              {hasDevice
                ? "Grok lines steer intensity; toy runs the preset."
                : "Add a linked toy for real hardware ramping."}
            </p>
          </div>
        ) : null}

        <div className="flex flex-nowrap gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-w-full">
          {RAMP_PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              disabled={off || rampQuickLocked}
              title={RAMP_PRESET_SHORT[id]}
              onClick={() => onRampPresetChange(id)}
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium transition-colors touch-manipulation max-w-[8rem] truncate",
                rampPreset === id
                  ? "border-orange-400/50 bg-orange-500/15 text-orange-100"
                  : "border-white/10 bg-black/30 text-foreground/80 hover:bg-white/[0.05]",
                (off || rampQuickLocked) && "opacity-40 pointer-events-none",
              )}
            >
              {RAMP_PRESET_LABELS[id]}
            </button>
          ))}
        </div>
      </div>

      <div className="max-h-14 overflow-y-auto flex flex-wrap gap-1 [scrollbar-width:thin]">
        {QUICK_LINES.map((q) => (
          <button
            key={q.label}
            type="button"
            disabled={quickLineOff}
            onClick={() => onSendText(q.send)}
            className="rounded-full border border-white/10 bg-black/35 px-2 py-0.5 text-[9px] font-medium text-foreground/90 hover:bg-white/[0.06] disabled:opacity-40 text-left leading-tight"
          >
            {q.label}
          </button>
        ))}
      </div>
    </div>
  );
}
