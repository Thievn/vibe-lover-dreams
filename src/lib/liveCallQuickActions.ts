export type LiveCallQuickActionId = "lewd_selfie" | "moan" | "dirtier" | "possessive" | "slow_burn" | "describe_moment";

export type LiveCallQuickAction = {
  id: LiveCallQuickActionId;
  label: string;
  /** Natural user line injected as voice-session “user” text (brevity line appended in LiveCallPage). */
  prompt: string;
  /** `primary` = main grid; `more` = dropdown. */
  tier?: "primary" | "more";
};

/** Appended to every quick-tap so the model doesn’t read a long monologue. */
export const LIVE_CALL_QUICK_TAP_BREVITY = [
  "Reply in 2-4 very short spoken sentences only (under ~20 seconds) — teasing, breathy, in-character, no monologue, no list, no help-text tone.",
].join(" ");

export const LIVE_CALL_QUICK_ACTIONS: LiveCallQuickAction[] = [
  {
    id: "lewd_selfie",
    label: "Voice tease (selfie energy)",
    tier: "primary",
    prompt:
      "Talk me through a lewd selfie in your words only — what you’re showing, where your eyes are, one filthy tease. No app or “sending a pic” — voice fantasy only on this call.",
  },
  {
    id: "moan",
    label: "Moan for me",
    tier: "primary",
    prompt: "Moan for me. Make it filthy. Keep it to a few short sounds and one hungry line",
  },
  {
    id: "dirtier",
    label: "Talk dirtier",
    tier: "primary",
    prompt: "Talk dirtier — rawer, more explicit, still short lines",
  },
  {
    id: "possessive",
    label: "Be more possessive",
    tier: "primary",
    prompt: "Get possessive and claim me — but keep it a brief burst of in-character talk",
  },
  {
    id: "slow_burn",
    label: "Slow burn",
    tier: "more",
    prompt: "Build it slow: tease and edge me in your voice, step by small step, still just a few short sentences",
  },
  {
    id: "describe_moment",
    label: "Describe the moment",
    tier: "more",
    prompt: "Describe us right this second — your body, the heat, what you want in one tight vivid beat",
  },
];

export const LIVE_CALL_QUICK_ACTIONS_PRIMARY = LIVE_CALL_QUICK_ACTIONS.filter((a) => a.tier !== "more");
export const LIVE_CALL_QUICK_ACTIONS_MORE = LIVE_CALL_QUICK_ACTIONS.filter((a) => a.tier === "more");
