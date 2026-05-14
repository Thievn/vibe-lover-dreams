import type { DbCompanion } from "@/hooks/useCompanions";
import { parseForgeThemeSnapshotFromPersonalityForge } from "@/lib/forgeThemeSnapshot";
import { normalizeForgeThemeTabId, type ForgeThemeTabId } from "@/lib/forgeThemeTabs";

/** Active forge tab from persisted theme DNA — omit when no snapshot so Edge does not assume a default tab. */
export function forgeActiveTabForImagine(db: DbCompanion | null | undefined): ForgeThemeTabId | undefined {
  if (!db?.personality_forge) return undefined;
  const snap = parseForgeThemeSnapshotFromPersonalityForge(db.personality_forge);
  if (!snap) return undefined;
  return normalizeForgeThemeTabId(snap.activeForgeTab);
}
