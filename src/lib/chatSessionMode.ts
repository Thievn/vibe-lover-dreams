const STORAGE_KEY = "lustforge-chat-session-mode";

export type ChatSessionMode = "classic" | "live_voice";

export function getChatSessionMode(): ChatSessionMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "live_voice" ? "live_voice" : "classic";
  } catch {
    return "classic";
  }
}

export function setChatSessionMode(mode: ChatSessionMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}
