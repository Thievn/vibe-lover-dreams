import { parseLovenseChatCommand } from "@/lib/parseLovenseChatCommand";

/** Model prefixes rare “signature move” lines so the chat UI can style them. */
const SIG_PREFIX = /^\[\s*SIG\s*\]\s*/i;

export function parseAssistantDisplayContent(stored: string): {
  displayText: string;
  signatureBeat: boolean;
} {
  let t = stored.trimStart();
  let signatureBeat = false;
  if (SIG_PREFIX.test(t)) {
    signatureBeat = true;
    t = stored.replace(SIG_PREFIX, "").trimStart();
  }
  /** Legacy rows may still store raw `{lovense_command:...}` — strip for display only. */
  if (t.toLowerCase().includes("lovense_command")) {
    const { cleanText } = parseLovenseChatCommand(t);
    t = cleanText.trim() || "*Toy command sent.*";
  }
  return { displayText: t, signatureBeat };
}
