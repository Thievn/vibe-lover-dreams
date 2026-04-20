/** Single-slot stash so an admin can park a forge and start another (localStorage). */
const KEY = "lustforge-admin-forge-stash-v1";

export type ForgeStashPayload = {
  savedAt: string;
  name: string;
  tagline: string;
  gender: string;
  personalitySelections: string[];
  vibeThemeSelections: string[];
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  traits: string[];
  orientation: string;
  extraNotes: string;
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
};

export function loadForgeStash(): ForgeStashPayload | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as ForgeStashPayload;
    if (!p || typeof p !== "object") return null;
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
