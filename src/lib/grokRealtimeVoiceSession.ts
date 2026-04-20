import type { XaiVoiceId } from "@/lib/ttsVoicePresets";

const REALTIME_WS = "wss://api.x.ai/v1/realtime";
const TARGET_RATE = 24000;

function floatToPcm16Base64(input: Float32Array): string {
  const pcm = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function downsampleHalf(input: Float32Array): Float32Array {
  const n = Math.floor(input.length / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = input[i * 2];
  return out;
}

function base64ToInt16(b64: string): Int16Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i);
  return new Int16Array(bytes.buffer, bytes.byteOffset, len / 2);
}

export type GrokRealtimeVoiceOptions = {
  clientSecret: string;
  instructions: string;
  voice: XaiVoiceId;
  onStatus?: (s: string) => void;
  onError?: (e: Error) => void;
  onAssistantTranscriptDone?: (text: string) => void;
  /** Streaming assistant speech (for Ramp Mode / analytics). */
  onAssistantTranscriptDelta?: (delta: string, accumulated: string) => void;
};

function sessionUpdatePayload(instructions: string, voice: XaiVoiceId) {
  return {
    type: "session.update",
    session: {
      instructions,
      voice,
      turn_detection: { type: "server_vad" },
      audio: {
        input: { format: { type: "audio/pcm", rate: TARGET_RATE } },
        output: { format: { type: "audio/pcm", rate: TARGET_RATE } },
      },
    },
  };
}

/**
 * Browser WebSocket to xAI Realtime Voice (mic PCM → API, assistant PCM → speakers).
 * Uses ephemeral client secret from `grok-voice-client-secret` Edge Function.
 */
export function startGrokRealtimeVoiceSession(opts: GrokRealtimeVoiceOptions): {
  stop: () => void;
  updateSessionInstructions: (instructions: string) => void;
} {
  let stopped = false;
  let ws: WebSocket | null = null;
  let audioCtx: AudioContext | null = null;
  let micStream: MediaStream | null = null;
  let processor: ScriptProcessorNode | null = null;
  let silentGain: GainNode | null = null;
  let mediaSource: MediaStreamAudioSourceNode | null = null;
  let sessionReady = false;
  let nextPlay = 0;
  let transcriptBuf = "";

  const schedulePcm = (pcm16: Int16Array, sampleRate: number) => {
    const ctx = audioCtx;
    if (!ctx) return;
    const buffer = ctx.createBuffer(1, pcm16.length, sampleRate);
    const ch = buffer.getChannelData(0);
    for (let i = 0; i < pcm16.length; i++) ch[i] = pcm16[i] / 32768;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    const startAt = Math.max(ctx.currentTime, nextPlay);
    src.start(startAt);
    nextPlay = startAt + buffer.duration;
  };

  const updateSessionInstructions = (instructions: string) => {
    const sock = ws;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    try {
      sock.send(JSON.stringify(sessionUpdatePayload(instructions, opts.voice)));
    } catch {
      /* ignore */
    }
  };

  const stop = () => {
    stopped = true;
    sessionReady = false;
    try {
      ws?.close();
    } catch {
      /* ignore */
    }
    ws = null;
    try {
      processor?.disconnect();
    } catch {
      /* ignore */
    }
    processor = null;
    try {
      mediaSource?.disconnect();
    } catch {
      /* ignore */
    }
    mediaSource = null;
    try {
      silentGain?.disconnect();
    } catch {
      /* ignore */
    }
    silentGain = null;
    micStream?.getTracks().forEach((t) => t.stop());
    micStream = null;
    void audioCtx?.close().catch(() => undefined);
    audioCtx = null;
  };

  void (async () => {
    try {
      opts.onStatus?.("Connecting…");
      micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioCtx = new AudioContext({ sampleRate: TARGET_RATE });
      await audioCtx.resume();

      const subprotocol = `xai-client-secret.${opts.clientSecret}`;
      ws = new WebSocket(REALTIME_WS, [subprotocol]);

      ws.onerror = () => {
        if (!stopped) opts.onError?.(new Error("Voice WebSocket error"));
      };

      ws.onclose = () => {
        if (!stopped) opts.onStatus?.("Disconnected");
      };

      ws.onopen = () => {
        opts.onStatus?.("Starting session…");
        ws?.send(JSON.stringify(sessionUpdatePayload(opts.instructions, opts.voice)));
      };

      ws.onmessage = (ev) => {
        if (stopped) return;
        let event: Record<string, unknown>;
        try {
          event = JSON.parse(String(ev.data)) as Record<string, unknown>;
        } catch {
          return;
        }
        const type = typeof event.type === "string" ? event.type : "";

        if (type === "session.updated") {
          sessionReady = true;
          opts.onStatus?.("Live — speak freely");
        }

        if (type === "response.output_audio.delta") {
          const raw =
            (typeof event.delta === "string" && event.delta) ||
            (typeof event.audio === "string" && event.audio) ||
            "";
          if (!raw) return;
          try {
            const pcm = base64ToInt16(raw);
            schedulePcm(pcm, TARGET_RATE);
          } catch {
            /* ignore */
          }
        }

        if (type === "response.output_audio_transcript.delta") {
          const d = typeof event.delta === "string" ? event.delta : "";
          transcriptBuf += d;
          opts.onAssistantTranscriptDelta?.(d, transcriptBuf);
        }

        if (type === "response.output_audio_transcript.done") {
          const full =
            (typeof event.transcript === "string" && event.transcript) || transcriptBuf;
          transcriptBuf = "";
          const t = full.trim();
          if (t) opts.onAssistantTranscriptDone?.(t);
        }

        if (type === "error") {
          const msg =
            typeof event.message === "string"
              ? event.message
              : JSON.stringify(event).slice(0, 200);
          opts.onError?.(new Error(msg));
        }
      };

      await new Promise<void>((resolve, reject) => {
        const t0 = Date.now();
        const id = window.setInterval(() => {
          if (stopped) {
            clearInterval(id);
            reject(new Error("Cancelled"));
          } else if (sessionReady) {
            clearInterval(id);
            resolve();
          } else if (Date.now() - t0 > 15000) {
            clearInterval(id);
            reject(new Error("Voice session timeout"));
          }
        }, 80);
      });

      const source = audioCtx!.createMediaStreamSource(micStream);
      mediaSource = source;
      const bufferSize = 4096;
      const proc = audioCtx!.createScriptProcessor(bufferSize, 1, 1);
      processor = proc;
      silentGain = audioCtx!.createGain();
      silentGain.gain.value = 0;
      source.connect(proc);
      proc.connect(silentGain);
      silentGain.connect(audioCtx!.destination);

      proc.onaudioprocess = (e) => {
        if (stopped || !ws || ws.readyState !== WebSocket.OPEN || !sessionReady) return;
        let input = e.inputBuffer.getChannelData(0);
        const rate = audioCtx!.sampleRate;
        if (rate !== TARGET_RATE) {
          if (rate === 48000) input = downsampleHalf(input);
          else {
            const ratio = rate / TARGET_RATE;
            const n = Math.floor(input.length / ratio);
            const out = new Float32Array(n);
            for (let i = 0; i < n; i++) out[i] = input[Math.floor(i * ratio)];
            input = out;
          }
        }
        const b64 = floatToPcm16Base64(input);
        try {
          ws.send(JSON.stringify({ type: "input_audio_buffer.append", audio: b64 }));
        } catch {
          /* ignore */
        }
      };
    } catch (e) {
      stop();
      opts.onError?.(e instanceof Error ? e : new Error(String(e)));
    }
  })();

  return { stop, updateSessionInstructions };
}
