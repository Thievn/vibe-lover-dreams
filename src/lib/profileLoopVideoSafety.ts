/**
 * Client-side guard for profile looping video **custom instructions**.
 * Logic lives in `supabase/functions/_shared/profileLoopMotionPolicy.ts` (Edge + app stay aligned).
 */
import {
  profilePageLoopMotionNotesViolatePolicy,
  sanitizeProfileLoopUserMotionNotes,
} from "../../supabase/functions/_shared/profileLoopMotionPolicy.ts";

/** Returns a user-facing error string, or null if OK. */
export function profileLoopMotionInvalidReason(notes: string): string | null {
  return profilePageLoopMotionNotesViolatePolicy(notes);
}

/** Client preview of what gets sent after softening (optional UI). */
export { sanitizeProfileLoopUserMotionNotes };
