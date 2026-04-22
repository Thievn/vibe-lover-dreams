import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { Flame, Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { invokeGrokStt } from "@/lib/invokeGrokStt";
import { startRampModeDriver, type RampModeDriver } from "@/lib/rampModeDriver";
import type { RampPresetId } from "@/lib/rampModePresets";
import { RAMP_PRESET_IDS, RAMP_PRESET_LABELS, RAMP_PRESET_SHORT } from "@/lib/rampModePresets";
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
  /** Parent stores this to nudge Ramp Mode from Together assistant replies (typed or voice turn). */
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
  className?: string;
};

/**
 * Voice: STT (xAI) → same chat path as typing (Together.ai) → optional Grok TTS from Chat autoplay.
 * Ramp Mode follows assistant text from Together via `onRegisterRampAssistFeed`.
 */
export function LiveVoicePanel({
  disabled,
  busy,
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
  className,
}: Props) {
  const [transcribing, setTranscribing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [rampDisplayIntensity, setRampDisplayIntensity] = useState(0);

  const rampDriverRef = useRef<RampModeDriver | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  /** User released finger before getUserMedia finished (short tap) — stop right after we start. */
  const stopRequestedBeforeReadyRef = useRef(false);
  const startInFlightRef = useRef(false);
  const finishRecordingRef = useRef<() => Promise<void>>(async () => {});

  const MIN_AUDIO_BYTES = 200;

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
  }, [onRampModeActiveChange, onSendText, stopStream]);

  finishRecordingRef.current = finishRecording;

  const startRecording = useCallback(async () => {
    if (disabled || busy || transcribing) return;
    if (startInFlightRef.current || mediaRecorderRef.current) return;
    startInFlightRef.current = true;
    stopRequestedBeforeReadyRef.current = false;
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
      if (stopRequestedBeforeReadyRef.current) {
        stopRequestedBeforeReadyRef.current = false;
        await finishRecordingRef.current();
      }
    } catch {
      mediaStreamRef.current = null;
      toast.error("Microphone permission denied or unavailable.");
    } finally {
      startInFlightRef.current = false;
    }
  }, [busy, disabled, stopStream, transcribing]);

  const onMicPointerDown = useCallback(
    (e: PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      if (off || transcribing || busy) return;
      const onRelease = () => {
        window.removeEventListener("pointerup", onRelease);
        window.removeEventListener("pointercancel", onRelease);
        stopRequestedBeforeReadyRef.current = true;
        if (mediaRecorderRef.current) void finishRecordingRef.current();
      };
      window.addEventListener("pointerup", onRelease, { passive: true });
      window.addEventListener("pointercancel", onRelease, { passive: true });
      void startRecording();
    },
    [off, transcribing, busy, startRecording],
  );

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
            <span className="text-foreground/90 font-medium">Press &amp; hold the mic</span>, speak, then release
            (walkie-talkie). It’s <span className="text-foreground/90 font-medium">not</span> open-mic live chat —
            each clip is sent to <span className="text-foreground/90 font-medium">xAI STT</span>, then{" "}
            <span className="text-foreground/90 font-medium">Together</span> answers like a typed message. For voice
            playback, use <span className="text-foreground/90 font-medium">TTS</span> on a reply.
          </p>
        </div>
        <div className="flex flex-col gap-2 shrink-0 items-end">
          <button
            type="button"
            disabled={off || transcribing}
            onPointerDown={onMicPointerDown}
            className={cn(
              "relative flex h-14 w-14 select-none items-center justify-center rounded-2xl border-2 transition-all touch-manipulation",
              "touch-none",
              recording
                ? "border-destructive bg-destructive/20 text-destructive hover:bg-destructive/30"
                : "border-[#00ffd4]/50 bg-[#00ffd4]/10 text-[#00ffd4] hover:bg-[#00ffd4]/20",
              off && "opacity-40 pointer-events-none",
            )}
            title="Hold to talk — release to send"
            aria-label="Hold to talk, release to send to chat"
          >
            {transcribing ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : recording ? (
              <Square className="h-6 w-6 fill-current" />
            ) : (
              <Mic className="h-7 w-7" />
            )}
          </button>
          <span className="text-[9px] text-muted-foreground text-center max-w-[5.5rem] leading-tight">
            {transcribing ? "Transcribing…" : "Hold = record"}
          </span>
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
          {rampModeActive && hasDevice ? (
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
                style={{ width: `${hasDevice ? rampDisplayIntensity : 0}%` }}
              />
            </div>
            {hasDevice ? (
              <Flame
                className="pointer-events-none absolute -right-0.5 -top-1 h-4 w-4 text-orange-400/70 animate-pulse"
                aria-hidden
              />
            ) : null}
            <p className="text-[10px] text-muted-foreground/80 mt-1.5 leading-snug">
              {hasDevice
                ? "Toy follows the preset; Together replies nudge intensity from keywords."
                : "Connect a Lovense toy for hardware ramping."}
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
            disabled={off || recording || transcribing}
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
