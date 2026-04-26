export type LiveCallQuickActionId = "lewd_selfie" | "moan" | "dirtier" | "possessive";

export type LiveCallQuickAction = {
  id: LiveCallQuickActionId;
  label: string;
  /** Natural user line injected as voice-session “user” text. */
  prompt: string;
};

export const LIVE_CALL_QUICK_ACTIONS: LiveCallQuickAction[] = [
  {
    id: "lewd_selfie",
    label: "Send Lewd Selfie",
    prompt:
      "Send me a lewd selfie energy right now—describe what you're showing me on this call like you just snapped it for me.",
  },
  {
    id: "moan",
    label: "Moan for me",
    prompt: "Moan for me… I need to hear you.",
  },
  {
    id: "dirtier",
    label: "Talk dirtier",
    prompt: "Talk dirtier to me. Don't hold anything back.",
  },
  {
    id: "possessive",
    label: "Be more possessive",
    prompt: "Be more possessive with me—claim me like I'm yours.",
  },
];
