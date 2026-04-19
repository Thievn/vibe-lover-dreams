/** Model prefixes rare “signature move” lines so the chat UI can style them. */
const SIG_PREFIX = /^\[\s*SIG\s*\]\s*/i;

export function parseAssistantDisplayContent(stored: string): {
  displayText: string;
  signatureBeat: boolean;
} {
  const t = stored.trimStart();
  if (SIG_PREFIX.test(t)) {
    return {
      displayText: stored.replace(SIG_PREFIX, "").trimStart(),
      signatureBeat: true,
    };
  }
  return { displayText: stored, signatureBeat: false };
}
