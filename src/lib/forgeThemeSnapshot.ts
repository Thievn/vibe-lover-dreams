/**
 * Persisted forge theme DNA for Nexus + stash — stored under `personality_forge._forgeThemeV2` (and legacy `_forgeThemeV1`).
 */
import { normalizeForgeVisualTailoring, type ForgeVisualTailoring } from "@/lib/forgeVisualTailoring";
import {
  type ForgeCardPoseId,
  type ForgeTabFeatureMap,
  type ForgeTabSharedOverride,
  type ForgeThemeTabId,
  FORGE_THEME_TABS,
  buildForgeTabPromptAddon,
  normalizeForgeCardPoseId,
  normalizeForgeTabFeatureMap,
  normalizeForgeTabSharedOverrides,
  normalizeForgeThemeTabId,
} from "@/lib/forgeThemeTabs";

export const FORGE_THEME_SNAPSHOT_VERSION = 2 as const;

export type ForgeThemeSnapshotV1 = {
  v: typeof FORGE_THEME_SNAPSHOT_VERSION;
  activeForgeTab: ForgeThemeTabId;
  forgeCardPose: ForgeCardPoseId;
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  visualTailoring: ForgeVisualTailoring;
  forgeTabFeatures: ForgeTabFeatureMap;
  forgeTabSharedOverrides: Record<ForgeThemeTabId, ForgeTabSharedOverride>;
};

export function buildForgeThemeSnapshotV1(input: {
  activeForgeTab: ForgeThemeTabId;
  forgeCardPose: ForgeCardPoseId;
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  visualTailoring: ForgeVisualTailoring;
  forgeTabFeatures: ForgeTabFeatureMap;
  forgeTabSharedOverrides: Record<ForgeThemeTabId, ForgeTabSharedOverride>;
}): ForgeThemeSnapshotV1 {
  return {
    v: FORGE_THEME_SNAPSHOT_VERSION,
    activeForgeTab: input.activeForgeTab,
    forgeCardPose: normalizeForgeCardPoseId(input.forgeCardPose),
    artStyle: input.artStyle,
    sceneAtmosphere: input.sceneAtmosphere,
    bodyType: input.bodyType,
    visualTailoring: { ...input.visualTailoring },
    forgeTabFeatures: normalizeForgeTabFeatureMap(input.forgeTabFeatures),
    forgeTabSharedOverrides: normalizeForgeTabSharedOverrides(input.forgeTabSharedOverrides),
  };
}

export function normalizeForgeThemeSnapshotV1(raw: unknown): ForgeThemeSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 1 && o.v !== 2) return null;
  const vt = o.visualTailoring;
  if (!vt || typeof vt !== "object") return null;
  return {
    v: FORGE_THEME_SNAPSHOT_VERSION,
    activeForgeTab: normalizeForgeThemeTabId(o.activeForgeTab),
    forgeCardPose: normalizeForgeCardPoseId(o.forgeCardPose),
    artStyle: typeof o.artStyle === "string" ? o.artStyle : "",
    sceneAtmosphere: typeof o.sceneAtmosphere === "string" ? o.sceneAtmosphere : "",
    bodyType: typeof o.bodyType === "string" ? o.bodyType : "",
    visualTailoring: normalizeForgeVisualTailoring(vt),
    forgeTabFeatures: normalizeForgeTabFeatureMap(o.forgeTabFeatures),
    forgeTabSharedOverrides: normalizeForgeTabSharedOverrides(o.forgeTabSharedOverrides),
  };
}

/** Extract snapshot from DB `personality_forge` JSON (ignores normalized personality keys). */
export function parseForgeThemeSnapshotFromPersonalityForge(raw: unknown): ForgeThemeSnapshotV1 | null {
  if (!raw || typeof raw !== "object") return null;
  const root = raw as Record<string, unknown>;
  const inner = root._forgeThemeV2 ?? root._forgeThemeV1;
  return normalizeForgeThemeSnapshotV1(inner);
}

function tabKinksFromShared(
  tab: ForgeThemeTabId,
  shared: Record<ForgeThemeTabId, ForgeTabSharedOverride>,
  fallbackKinks: string[],
): string[] {
  const s = shared[tab];
  if (!s?.kinksEnabled || !s.kinksValue.trim()) return fallbackKinks;
  return s.kinksValue
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, 24);
}

function tabSexualEnergy(shared: Record<ForgeThemeTabId, ForgeTabSharedOverride>, tab: ForgeThemeTabId, fallback: string): string {
  const s = shared[tab];
  if (!s?.sexualEnergyEnabled || !s.sexualEnergyValue.trim()) return fallback;
  return s.sexualEnergyValue.trim();
}

function effectiveBody(shared: Record<ForgeThemeTabId, ForgeTabSharedOverride>, tab: ForgeThemeTabId, baseBody: string): string {
  const s = shared[tab];
  if (!s?.bodyTypeEnabled || !s.bodyTypeValue.trim()) return baseBody;
  return s.bodyTypeValue.trim();
}

/**
 * Dense multi-tab digest for Nexus LLM — every tab’s feature block + shared anchors.
 */
export function buildNexusForgeThemeDigestFromSnapshot(
  snap: ForgeThemeSnapshotV1,
  fallbackKinks: string[],
  fallbackSexualEnergy: string,
): string {
  const lines: string[] = [];
  lines.push(
    `Primary active tab at forge time: "${snap.activeForgeTab}". Card pose lock: ${snap.forgeCardPose}. Art: ${snap.artStyle}. Scene: ${snap.sceneAtmosphere}. Base body label: ${snap.bodyType}.`,
  );
  const vt = snap.visualTailoring;
  lines.push(
    `Look lab: ${vt.hairColor} ${vt.hairStyle}, ${vt.eyeColor} eyes, ${vt.skinTone}; ${vt.outfitStyle}; palette ${vt.colorPalette}; footwear ${vt.footwear}; accessories ${vt.accessories}; specials: ${vt.specialFeatures?.length ? vt.specialFeatures.join(", ") : "none"}.`,
  );
  for (const t of FORGE_THEME_TABS) {
    const tab = t.id;
    const feats = snap.forgeTabFeatures[tab];
    const eb = effectiveBody(snap.forgeTabSharedOverrides, tab, snap.bodyType);
    const se = tabSexualEnergy(snap.forgeTabSharedOverrides, tab, fallbackSexualEnergy);
    const kinks = tabKinksFromShared(tab, snap.forgeTabSharedOverrides, fallbackKinks);
    const prose = buildForgeTabPromptAddon({
      tabId: tab,
      features: feats,
      effectiveBodyType: eb,
      sexualEnergy: se,
      kinks,
      cardPose: snap.forgeCardPose,
      styleDnaTier: "full",
    });
    lines.push(`[${t.label}] ${prose}`);
  }
  return lines.join("\n\n");
}
