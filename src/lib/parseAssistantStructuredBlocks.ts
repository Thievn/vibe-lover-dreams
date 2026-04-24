import { parseLovenseChatCommand } from "./parseLovenseChatCommand";
import { type LustforgeMediaRequest, parseLustforgeMediaRequest } from "./parseLustforgeMediaRequest";

export type AssistantStructuredParse = {
  /** Text shown in the thread and persisted (no tool JSON). */
  displayText: string;
  lovenseCommand: Record<string, unknown> | null;
  mediaRequest: LustforgeMediaRequest | null;
};

/**
 * Chain-strip machine-readable blocks the model may append. Order: Lovense first (anchor-based),
 * then Lustforge media. Phase 3/4: keeps RP clean while we trigger media + devices client-side.
 */
export function parseAssistantStructuredBlocks(rawInput: unknown): AssistantStructuredParse {
  // Together/edge may rarely return a non-string — never throw on .trim().
  const raw = typeof rawInput === "string" ? rawInput : String(rawInput ?? "");
  const l = parseLovenseChatCommand(raw);
  const m = parseLustforgeMediaRequest(l.cleanText);
  const displayText = m.cleanText.trim() || l.cleanText.trim() || raw.trim();
  return {
    displayText: displayText || "*…*",
    lovenseCommand: l.command,
    mediaRequest: m.media,
  };
}
