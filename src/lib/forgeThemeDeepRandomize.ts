/**
 * Deep tab randomization: theme sliders + per-tab shared overrides + rendering / wardrobe rolls.
 */
import { normalizeForgeArtStyle, normalizeForgeScene } from "@/lib/forgePortraitPrompt";
import {
  FORGE_TAB_RENDER_PRESETS,
  type ForgeTabFeatureMap,
  type ForgeTabSharedOverride,
  type ForgeThemeTabId,
  FORGE_THEME_TABS,
  randomizeForgeTabFeatures,
} from "@/lib/forgeThemeTabs";
import { FORGE_BODY_TYPES } from "@/lib/forgeBodyTypes";
import { FORGE_SEXUAL_ENERGIES } from "@/lib/forgePersonalityProfile";
import {
  normalizeForgeVisualTailoring,
  randomForgeVisualTailoring,
  type ForgeVisualTailoring,
} from "@/lib/forgeVisualTailoring";

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const SAMPLE_KINKS = [
  "praise, edging, eye contact",
  "rope marks, slow burn, consent check-ins",
  "teasing, denial, playful brat energy",
  "aftercare, hair pulling (opt-in), whispered orders",
  "voyeur tension, mirrors, soft degradation",
  "service top, worship, stocking seams",
  "temperature play hints, silk, breath control (safe)",
];

function randBool(p: number): boolean {
  return Math.random() < p;
}

/** Randomize the per-tab shared override block (body / energy / kinks toggles). */
export function randomizeForgeTabSharedOverrides(
  tab: ForgeThemeTabId,
  mode: "normal" | "chaos_wtf",
): ForgeTabSharedOverride {
  const hi = mode === "chaos_wtf";
  return {
    bodyTypeEnabled: randBool(hi ? 0.55 : 0.38),
    bodyTypeValue: pick([...FORGE_BODY_TYPES]),
    sexualEnergyEnabled: randBool(hi ? 0.5 : 0.32),
    sexualEnergyValue: pick([...FORGE_SEXUAL_ENERGIES]),
    kinksEnabled: randBool(hi ? 0.48 : 0.28),
    kinksValue: pick(SAMPLE_KINKS),
  };
}

function blendVisualWithPreset(basePatch: Partial<ForgeVisualTailoring>, wild: boolean): ForgeVisualTailoring {
  const roll = randomForgeVisualTailoring();
  const merged = normalizeForgeVisualTailoring({ ...roll, ...basePatch });
  if (!wild && Math.random() < 0.55) {
    return normalizeForgeVisualTailoring({
      ...merged,
      specialFeatures: [...new Set([...(basePatch.specialFeatures ?? []), ...merged.specialFeatures])].slice(0, 5),
    });
  }
  if (wild) {
    const roll2 = randomForgeVisualTailoring();
    return normalizeForgeVisualTailoring({
      ...merged,
      outfitStyle: Math.random() < 0.45 ? merged.outfitStyle : roll2.outfitStyle,
      colorPalette: Math.random() < 0.45 ? merged.colorPalette : roll2.colorPalette,
      specialFeatures: [...new Set([...merged.specialFeatures, ...roll2.specialFeatures])].slice(0, 6),
    });
  }
  return merged;
}

export type TabRenderRoll = {
  artStyle: string;
  sceneAtmosphere: string;
  visual: ForgeVisualTailoring;
};

/** Smart rendering roll: anchor to tab preset, then mutate lab fields for variety. */
export function rollForgeRenderingForTab(tab: ForgeThemeTabId, mode: "normal" | "chaos_wtf"): TabRenderRoll {
  const wild = mode === "chaos_wtf";
  const preset = FORGE_TAB_RENDER_PRESETS[tab];
  const altTab: ForgeThemeTabId = wild ? pick([...FORGE_THEME_TABS.map((x) => x.id)]) : tab;
  const altPreset = FORGE_TAB_RENDER_PRESETS[wild ? altTab : tab];
  const artStyle = normalizeForgeArtStyle(wild && Math.random() < 0.35 ? pick([preset.artStyle, altPreset.artStyle]) : preset.artStyle);
  const sceneAtmosphere = normalizeForgeScene(
    wild && Math.random() < 0.4 ? pick([preset.sceneAtmosphere, altPreset.sceneAtmosphere]) : preset.sceneAtmosphere,
  );
  const visual = blendVisualWithPreset(altPreset.visualTailoringPatch, wild);
  return { artStyle, sceneAtmosphere, visual };
}

export function rollForgeRenderingChaosWildcard(): TabRenderRoll {
  const tab = pick([...FORGE_THEME_TABS.map((t) => t.id)]);
  return rollForgeRenderingForTab(tab, "chaos_wtf");
}

export function randomizeAllTabsFeatureMaps(mode: "normal" | "chaos_wtf"): ForgeTabFeatureMap {
  const out = {} as ForgeTabFeatureMap;
  for (const t of FORGE_THEME_TABS) {
    const m = t.id === "hyper_degenerate" && mode === "chaos_wtf" ? "chaos_wtf" : "normal";
    out[t.id] = randomizeForgeTabFeatures(t.id, m);
  }
  return out;
}

export function randomizeAllTabSharedOverrides(mode: "normal" | "chaos_wtf"): Record<ForgeThemeTabId, ForgeTabSharedOverride> {
  const out = {} as Record<ForgeThemeTabId, ForgeTabSharedOverride>;
  for (const t of FORGE_THEME_TABS) {
    out[t.id] = randomizeForgeTabSharedOverrides(t.id, mode);
  }
  return out;
}
