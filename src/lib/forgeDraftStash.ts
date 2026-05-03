/** Single-slot stash so an admin can park a forge and start another (localStorage). */
const KEY = "lustforge-admin-forge-stash-v1";

import { DEFAULT_FORGE_PERSONALITY, normalizeForgePersonality, type ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";
import {
  type ForgeCardPoseId,
  type ForgeTabFeatureMap,
  type ForgeTabSharedOverride,
  type ForgeThemeTabId,
} from "@/lib/forgeThemeTabs";
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
  /** Recent portrait previews (optional; user session). */
  previewHistory?: ForgePreviewHistoryEntry[];
  /** Appearance + outfit lab (optional on older stashes). */
  visualTailoring?: ForgeVisualTailoring;
  /** Forge theme tabs (optional on older stashes). */
  activeForgeTab?: ForgeThemeTabId;
  forgeTabFeatures?: ForgeTabFeatureMap;
  forgeTabSharedOverrides?: Record<ForgeThemeTabId, ForgeTabSharedOverride>;
  /** Global seated / lounge pose for card portrait (all tabs). */
  forgeCardPose?: ForgeCardPoseId;
};

/** Last few forge portrait previews (user forge) — image URLs + optional full settings snapshot. */
export type ForgePreviewHistoryEntry = {
  /** Stable id for React keys / dedupe (older saves may omit — assign on load). */
  id: string;
  display: string;
  canonical: string;
  savedAt: string;
  /**
   * Full forge form state when this portrait was last captured (new preview) or last edited while this image was active.
   * Omits nested `previewHistory` to avoid bloat.
   */
  snapshot?: Omit<ForgeStashPayload, "previewHistory">;
};

/** Migrate legacy history rows (no id / no snapshot) from localStorage. */
export function normalizeForgePreviewHistoryEntryLoose(raw: unknown): ForgePreviewHistoryEntry | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const display = typeof o.display === "string" ? o.display.trim() : "";
  const canonical = typeof o.canonical === "string" ? o.canonical.trim() : "";
  if (!display || !canonical) return null;
  const savedAt = typeof o.savedAt === "string" ? o.savedAt : new Date().toISOString();
  const id =
    typeof o.id === "string" && o.id.trim()
      ? o.id.trim()
      : typeof globalThis.crypto?.randomUUID === "function"
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let snapshot: Omit<ForgeStashPayload, "previewHistory"> | undefined;
  if (o.snapshot && typeof o.snapshot === "object") {
    const s = o.snapshot as Record<string, unknown>;
    const { previewHistory: _drop, ...rest } = s;
    snapshot = rest as Omit<ForgeStashPayload, "previewHistory">;
  }
  return { id, display, canonical, savedAt, snapshot };
}

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
