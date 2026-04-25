/**
 * Auto-saved forge session so leaving Companion Forge and returning does not lose paid previews + work.
 * Separate from manual "park" stash (`forgeDraftStash.ts`).
 */
import { DEFAULT_FORGE_PERSONALITY, normalizeForgePersonality, type ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";
import type { ForgeStashPayload } from "@/lib/forgeDraftStash";
import { normalizeForgeVisualTailoring } from "@/lib/forgeVisualTailoring";

const PREFIX = "lustforge-forge-session-v1";

/** Auto-saved session — same shape as stash (name prefix + reference notes optional). */
export type ForgeSessionDraft = ForgeStashPayload;

function key(userId: string, mode: "user" | "admin") {
  return `${PREFIX}_${mode}_${userId}`;
}

export function loadForgeSessionDraft(userId: string, mode: "user" | "admin"): ForgeSessionDraft | null {
  try {
    const raw = localStorage.getItem(key(userId, mode));
    if (!raw) return null;
    const p = JSON.parse(raw) as ForgeSessionDraft;
    if (!p || typeof p !== "object") return null;
    p.forgePersonality = p.forgePersonality ? normalizeForgePersonality(p.forgePersonality) : DEFAULT_FORGE_PERSONALITY;
    p.visualTailoring = normalizeForgeVisualTailoring(p.visualTailoring);
    return p;
  } catch {
    return null;
  }
}

export function saveForgeSessionDraft(userId: string, mode: "user" | "admin", payload: ForgeSessionDraft): void {
  try {
    localStorage.setItem(
      key(userId, mode),
      JSON.stringify({ ...payload, savedAt: new Date().toISOString() }),
    );
  } catch {
    /* quota / private mode */
  }
}

export function clearForgeSessionDraft(userId: string, mode: "user" | "admin"): void {
  try {
    localStorage.removeItem(key(userId, mode));
  } catch {
    /* ignore */
  }
}
