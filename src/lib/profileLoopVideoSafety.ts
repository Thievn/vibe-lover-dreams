/**
 * Client-side guard for profile looping video **custom instructions**.
 * Keep substring list in sync with `PROFILE_PAGE_LOOP_BLOCKED_SUBSTRINGS` in
 * `supabase/functions/_shared/profileLoopVideoPrompt.ts`.
 */
const PROFILE_LOOP_BLOCKED_SUBSTRINGS = [
  "pussy",
  "vagina",
  "cock",
  "dick",
  "penis",
  "asshole",
  "cum",
  "creampie",
  "ahegao",
  "hardcore",
  "explicit",
  "porn",
] as const;

/** Returns a user-facing error string, or null if OK. */
export function profileLoopMotionInvalidReason(notes: string): string | null {
  const t = notes.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const w of PROFILE_LOOP_BLOCKED_SUBSTRINGS) {
    if (lower.includes(w)) {
      return `Instructions can't include disallowed wording (“${w}”). Keep it tasteful and suggestive only.`;
    }
  }
  return null;
}
