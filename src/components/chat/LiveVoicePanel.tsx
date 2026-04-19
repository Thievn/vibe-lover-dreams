import { useCallback, useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { toast } from "sonner";
import { invokeGrokStt } from "@/lib/invokeGrokStt";
import { cn } from "@/lib/utils";

const QUICK_LINES: { label: string; send: string }[] = [
  { label: "Take control of my toy and edge me", send: "Take control of my toy and edge me." },
  { label: "Be a brat and tease me", send: "Be a brat and tease me." },
  { label: "Talk dirty while controlling my Lovense", send: "Talk dirty while you control my Lovense." },
  { label: "Moan for me", send: "Moan for me — I want to hear you." },
  { label: "Be romantic and seductive", send: "Be romantic and seductive with me." },
  { label: "Degrade me", send: "Degrade me — consensually, in character." },
];

type Props = {
  disabled?: boolean;
  busy?: boolean;
  onSendText: (text: string) => void;
  className?: string;
};

/**
 * Turn-based Live Voice: record → Grok STT → same chat pipeline as Classic.
 * True WebSocket S2S would need a server relay; this matches xAI STT + chat + TTS.
 */
export function LiveVoicePanel({ disabled, busy, onSendText, className }: Props) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
      onSendText(result.text);
    } finally {
      setTranscribing(false);
    }
  }, [onSendText]);

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
      // Stop underlying preview when recorder stops — tie to rec.stream
      rec.addEventListener("stop", () => stopStream(rec.stream), { once: true });
    } catch {
      toast.error("Microphone permission denied or unavailable.");
    }
  }, [busy, disabled, stopStream, transcribing]);

  const toggleMic = useCallback(async () => {
    if (transcribing || busy) return;
    if (recording) {
      await finishRecording();
    } else {
      await startRecording();
    }
  }, [busy, finishRecording, recording, startRecording, transcribing]);

  const off = Boolean(disabled || busy);

  return (
    <div
      className={cn(
        "rounded-2xl border border-[#00ffd4]/20 bg-gradient-to-br from-black/70 via-[hsl(280_30%_8%)]/95 to-black/80 p-4 space-y-3 shadow-[0_0_40px_rgba(0,255,212,0.08)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#00ffd4]/90">Live Voice</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Tap the mic to speak — we transcribe with Grok STT, then she replies (voice plays if TTS autoplay is on).
            Full duplex WebSocket can be added behind a relay later.
          </p>
        </div>
        <button
          type="button"
          disabled={off || transcribing}
          onClick={() => void toggleMic()}
          className={cn(
            "relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 transition-all touch-manipulation",
            recording
              ? "border-destructive bg-destructive/20 text-destructive animate-pulse"
              : "border-[#00ffd4]/50 bg-[#00ffd4]/10 text-[#00ffd4] hover:bg-[#00ffd4]/20",
            off && "opacity-40 pointer-events-none",
          )}
          title={recording ? "Stop & send" : "Start speaking"}
          aria-pressed={recording}
        >
          {transcribing ? (
            <Loader2 className="h-7 w-7 animate-spin" />
          ) : recording ? (
            <Square className="h-6 w-6 fill-current" />
          ) : (
            <Mic className="h-7 w-7" />
          )}
        </button>
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
