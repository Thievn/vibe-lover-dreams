const AUTOPLAY_KEY = "lustforge-chat-tts-autoplay";
const LIVE_VOICE_TTS_KEY = "lustforge-live-voice-tts-autoplay";

/** Per-device: auto-play TTS when a new assistant reply arrives (after you send a message). */
export function getTtsAutoplay(): boolean {
  try {
    return localStorage.getItem(AUTOPLAY_KEY) === "1";
  } catch {
    return false;
  }
}

export function persistTtsAutoplay(enabled: boolean): void {
  try {
    localStorage.setItem(AUTOPLAY_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

/**
 * Live Voice mode: auto-play TTS (default on). Independent from classic chat’s “Auto-play new replies”.
 * Missing key = enabled so first-time Live Voice users hear her without an extra click.
 */
export function getLiveVoiceTtsAutoplay(): boolean {
  try {
    const v = localStorage.getItem(LIVE_VOICE_TTS_KEY);
    if (v === "0") return false;
    return true;
  } catch {
    return true;
  }
}

export function persistLiveVoiceTtsAutoplay(enabled: boolean): void {
  try {
    localStorage.setItem(LIVE_VOICE_TTS_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}
