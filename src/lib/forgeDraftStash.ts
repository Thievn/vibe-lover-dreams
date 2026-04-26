/** Single-slot stash so an admin can park a forge and start another (localStorage). */
const KEY = "lustforge-admin-forge-stash-v1";

import { DEFAULT_FORGE_PERSONALITY, normalizeForgePersonality, type ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";
import { normalizeForgeVisualTailoring, type ForgeVisualTailoring } from "@/lib/forgeVisualTailoring";

export type ForgeStashPayload = {
  savedAt: string;
  name: string;
  /** Optional title / clan — shown before first name in batch forges. */
  namePrefix?: string;
  tagline: string;
  gender: string;
  /** pre_op / post_op / futa; absent in older stashes → "not specified". */
  identityAnatomyDetail?: string;
  /** Ancestry / complexion forge choice; absent in older stashes → treated as open. */
  ethnicity?: string;
  /** @deprecated Stash v2 uses `forgePersonality` */
  personalitySelections?: string[];
  /** @deprecated Removed — mood tags; ignored when loading if `forgePersonality` present */
  vibeThemeSelections?: string[];
  forgePersonality: ForgePersonalityProfile;
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  traits: string[];
  orientation: string;
  extraNotes: string;
  /** Reference image notes (optional; session restore). */
  referenceNotes?: string;
  narrativeAppearance: string;
  chronicleBackstory: string;
  hookBio: string;
  charterSystemPrompt: string;
  packshotPrompt: string;
  rosterTags: string[];
  rosterKinks: string[];
  fantasyStartersJson: string;
  previewUrl: string | null;
  previewCanonicalUrl: string | null;
  /** Appearance + outfit lab (optional on older stashes). */
  visualTailoring?: ForgeVisualTailoring;
};

export function loadForgeStash(): ForgeStashPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ForgeStashPayload & { personalitySelections?: string[]; vibeThemeSelections?: string[] };
    if (!p || typeof p !== "object") return null;
    if (!p.forgePersonality) p.forgePersonality = DEFAULT_FORGE_PERSONALITY;
    p.forgePersonality = normalizeForgePersonality(p.forgePersonality);
    p.visualTailoring = normalizeForgeVisualTailoring(p.visualTailoring);
    return p;
  } catch {
    return null;
  }
}

export function saveForgeStash(payload: ForgeStashPayload): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...payload, savedAt: new Date().toISOString() }));
  } catch {
    /* ignore */
  }
}

export function clearForgeStash(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
