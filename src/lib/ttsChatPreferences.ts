const AUTOPLAY_KEY = "lustforge-chat-tts-autoplay";

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
