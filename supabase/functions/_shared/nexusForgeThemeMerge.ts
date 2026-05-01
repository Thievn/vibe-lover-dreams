/**
 * Deterministic merge of parent forge theme snapshots (`_forgeThemeV2` / legacy `_forgeThemeV1`) for Nexus-forged companions.
 * Deno-safe — no path-alias imports. Tab ids must match client `forgeThemeTabs.ts`.
 */

export const FORGE_THEME_TAB_IDS = [
  "anime_temptation",
  "monster_desire",
  "gothic_seduction",
  "realistic_craving",
  "dark_fantasy",
  "furry_den",
  "pet_play_kennel",
  "insectoid_hive",
  "celestial_lust",
  "alien_embrace",
  "demonic_ruin",
  "aquatic_depths",
  "mechanical_seduction",
  "plant_bloom",
  "horror_whore",
  "mythic_beast",
  "hyper_degenerate",
  "latex_rubber",
  "eldritch_brood",
  "grotesque_goddess",
] as const;

const LEGACY_FORGE_TAB_ID_TO_CANONICAL: Record<string, string> = {
  anime: "anime_temptation",
  monster: "monster_desire",
  gothic: "gothic_seduction",
  realistic: "realistic_craving",
  dark_fantasy: "dark_fantasy",
  chaos: "hyper_degenerate",
  cyber_neon_syndicate: "mechanical_seduction",
  starlit_siren_sci_fi: "celestial_lust",
  steampunk_velvet: "mechanical_seduction",
  retro_pinup_heat: "latex_rubber",
  iron_glory_apex: "mythic_beast",
  velvet_romance_soft: "plant_bloom",
  horror_whisper_court: "horror_whore",
  feral_nature_covenant: "mythic_beast",
  royal_sin_palace: "demonic_ruin",
  neon_alley_predator: "horror_whore",
  celestial_fallen_halo: "celestial_lust",
  infernal_high_table: "demonic_ruin",
  abyssal_depth_siren: "aquatic_depths",
  grotesque_goddess_majesty: "grotesque_goddess",
};

export function normalizeForgeThemeTabIdForMerge(raw: string): string {
  const t = raw.trim();
  const migrated = LEGACY_FORGE_TAB_ID_TO_CANONICAL[t] ?? t;
  if ((FORGE_THEME_TAB_IDS as readonly string[]).includes(migrated)) return migrated;
  return "anime_temptation";
}

export function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickU32(h: number, mod: number): number {
  if (mod <= 0) return 0;
  return Math.abs(h) % mod;
}

function shuffleWithSeed<T>(arr: T[], seedStr: string): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const h = fnv1a32(`${seedStr}:${i}`);
    const j = pickU32(h, i + 1);
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export function readForgeThemeDna(rawPersonalityForge: unknown): Record<string, unknown> | null {
  if (!rawPersonalityForge || typeof rawPersonalityForge !== "object") return null;
  const root = rawPersonalityForge as Record<string, unknown>;
  const inner = root._forgeThemeV2 ?? root._forgeThemeV1;
  if (!inner || typeof inner !== "object") return null;
  return inner as Record<string, unknown>;
}

function forgeInnerSnapshotIsThemeReady(inner: Record<string, unknown>): boolean {
  if (typeof inner.activeForgeTab !== "string" || !inner.activeForgeTab.trim()) return false;
  const canon = normalizeForgeThemeTabIdForMerge(inner.activeForgeTab);
  if (!(FORGE_THEME_TAB_IDS as readonly string[]).includes(canon)) return false;
  return typeof inner.forgeTabFeatures === "object" && inner.forgeTabFeatures !== null;
}

function defaultExtLab(): Record<string, unknown> {
  return {
    voltage: 50,
    saturation: 50,
    gritVsPolish: 40,
    gloss: 48,
    motionWind: 42,
    intimacyBias: 50,
    worldWeirdness: 35,
    propLoad: 38,
    loreWhisper: "__lore_none__",
  };
}

function buildDefaultForgeTabFeaturesAllTabs(): Record<string, unknown> {
  const ext = defaultExtLab();
  return {
    anime_temptation: {
      eyeShine: 72,
      ahogeVariety: 35,
      thighhighLayers: 60,
      skirtPhysics: 58,
      ahegaoIntensity: 12,
      hairHighlights: 64,
    },
    monster_desire: {
      tentacleCount: 4,
      multiBreastRows: false,
      hornConfig: "curved",
      tailType: "serpentine",
      wingSize: 56,
      skinTexture: "scales",
      extraLimbs: false,
    },
    gothic_seduction: {
      corsetTightness: 70,
      laceDensity: 66,
      fangLength: 30,
      pallor: 62,
      gothicFashionMode: "victorian",
      jewelryOverload: 45,
      tragicBeauty: 58,
    },
    realistic_craving: {
      softnessVsToned: 48,
      stretchMarkCellulite: 28,
      tanLineStrength: 22,
      breastWeightRealism: 64,
      postHeatFlush: 40,
      makeupSmudge: 24,
      poreDetail: 62,
    },
    dark_fantasy: {
      corruptionLevel: 52,
      runePlacement: "collarbone",
      demonicIntensity: 48,
      ritualScars: "subtle",
      manaAuraColor: "violet",
      manaAuraStrength: 54,
      fallenVsRising: "fallen_angel",
    },
    hyper_degenerate: {
      garbagePailGrotesque: false,
      maxDegeneracy: false,
      bodyHorrorCuteBlend: 64,
      randomizerPower: 70,
      whatTheFuckSeed: 0,
      genreCollider: 38,
      propStorm: 42,
      cursedPalette: 28,
      symmetryBreak: false,
      oopsAllTropes: false,
    },
    furry_den: { ...ext },
    pet_play_kennel: { ...ext },
    insectoid_hive: { ...ext },
    celestial_lust: { ...ext },
    alien_embrace: { ...ext },
    demonic_ruin: { ...ext },
    aquatic_depths: { ...ext },
    mechanical_seduction: { ...ext },
    plant_bloom: { ...ext },
    horror_whore: { ...ext },
    mythic_beast: { ...ext },
    latex_rubber: { ...ext },
    eldritch_brood: { ...ext },
    grotesque_goddess: { ...ext },
  };
}

function buildDefaultTabSharedOverridesAllTabs(): Record<string, unknown> {
  const empty = {
    bodyTypeEnabled: false,
    bodyTypeValue: "",
    sexualEnergyEnabled: false,
    sexualEnergyValue: "",
    kinksEnabled: false,
    kinksValue: "",
  };
  return Object.fromEntries(FORGE_THEME_TAB_IDS.map((id) => [id, { ...empty }]));
}

function defaultVisualTailoring(): Record<string, unknown> {
  return {
    breastSize: "Full",
    assSize: "Curvy",
    hairStyle: "Long wavy",
    hairColor: "Jet black",
    eyeColor: "Ice blue",
    skinTone: "Porcelain fair",
    height: "Average",
    specialFeatures: [] as string[],
    outfitStyle: "Evening dress",
    colorPalette: "Ivory + champagne",
    footwear: "Heels",
    accessories: "Choker",
  };
}

/** Synthetic snapshot for breeding when a parent has no forge theme block (not persisted on the parent). */
export function buildSyntheticForgeThemeInnerForNexus(mergePairSeed: string, arm: "A" | "B"): Record<string, unknown> {
  const h = fnv1a32(`${mergePairSeed}:${arm}:nexus_synth_tab`);
  const tab = FORGE_THEME_TAB_IDS[pickU32(h, FORGE_THEME_TAB_IDS.length)]!;
  return {
    v: 2,
    activeForgeTab: tab,
    forgeCardPose: "seated_sofa_relaxed",
    artStyle: "Dark Moody Realism",
    sceneAtmosphere: "Neutral Gray Seamless Backdrop",
    bodyType: "Athletic Hourglass",
    visualTailoring: defaultVisualTailoring(),
    forgeTabFeatures: buildDefaultForgeTabFeaturesAllTabs(),
    forgeTabSharedOverrides: buildDefaultTabSharedOverridesAllTabs(),
  };
}

export function resolveForgeThemeInnerForNexusMerge(
  rawPersonalityForge: unknown,
  arm: "A" | "B",
  mergePairSeed: string,
): Record<string, unknown> {
  const inner = readForgeThemeDna(rawPersonalityForge);
  if (inner && forgeInnerSnapshotIsThemeReady(inner)) {
    const o = { ...inner } as Record<string, unknown>;
    if (typeof o.activeForgeTab === "string") {
      o.activeForgeTab = normalizeForgeThemeTabIdForMerge(o.activeForgeTab);
    }
    return o;
  }
  return buildSyntheticForgeThemeInnerForNexus(mergePairSeed, arm);
}

function blendUnknown(a: unknown, b: unknown, path: string, childId: string): unknown {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  const h = fnv1a32(`${childId}:${path}`);
  const key = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1) : path;

  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    if (key === "whatTheFuckSeed") {
      return pickU32(h, 2) === 0 ? Math.floor(a) : Math.floor(b);
    }
    if (key === "tentacleCount") {
      const mid = (a + b) / 2;
      return Math.max(0, Math.min(12, Math.round(mid + pickU32(h >>> 3, 5) - 2)));
    }
    const mid = (a + b) / 2;
    const jitter = pickU32(h, 17) - 8;
    return Math.max(0, Math.min(100, Math.round(mid + jitter)));
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return pickU32(h, 2) === 0 ? a : b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return pickU32(h, 2) === 0 ? a : b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = a.map((x) => String(x)).filter(Boolean);
    const sb = b.map((x) => String(x)).filter(Boolean);
    const set = [...new Set([...sa, ...sb])];
    if (!set.length) return [];
    const shuffled = shuffleWithSeed(set, `${childId}:${path}`);
    const n = 1 + pickU32(h, Math.min(5, shuffled.length));
    return shuffled.slice(0, n);
  }
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(ao), ...Object.keys(bo)])].filter(
      (k) => k !== "_forgeThemeV1" && k !== "_forgeThemeV2",
    );
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const v = blendUnknown(ao[k], bo[k], `${path}.${k}`, childId);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return pickU32(h, 2) === 0 ? a : b;
}

/** Remove nested theme snapshot from personality_forge JSON. */
export function stripForgeThemeV1(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const o = { ...(raw as Record<string, unknown>) };
  delete o._forgeThemeV1;
  delete o._forgeThemeV2;
  return o;
}

const PERSONALITY_FORGE_KEYS = [
  "timePeriod",
  "personalityType",
  "speechStyle",
  "sexualEnergy",
  "relationshipVibe",
] as const;

/**
 * Merge parents' top-level personality_forge pillars (excluding _forgeThemeV1) for the offspring row.
 */
export function mergeChildPersonalityForgeBase(
  rawA: unknown,
  rawB: unknown,
  childId: string,
): Record<string, unknown> {
  const a = stripForgeThemeV1(rawA);
  const b = stripForgeThemeV1(rawB);
  const out: Record<string, unknown> = {};
  for (const k of PERSONALITY_FORGE_KEYS) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === "string" && va.trim() && typeof vb === "string" && vb.trim()) {
      const merged = blendUnknown(va, vb, `pf.${k}`, childId);
      if (typeof merged === "string" && merged.trim()) out[k] = merged;
    } else if (typeof va === "string" && va.trim()) out[k] = va;
    else if (typeof vb === "string" && vb.trim()) out[k] = vb;
  }
  return out;
}

/**
 * Merge two parent forge theme inner snapshots.
 */
export function mergeForgeThemeSnapshotsV1(
  themeA: Record<string, unknown> | null,
  themeB: Record<string, unknown> | null,
  childId: string,
): Record<string, unknown> | null {
  if (!themeA && !themeB) return null;
  const ao = (themeA ?? {}) as Record<string, unknown>;
  const bo = (themeB ?? {}) as Record<string, unknown>;
  const merged = blendUnknown(ao, bo, "snap", childId) as Record<string, unknown>;
  merged.v = 2;

  const hTab = fnv1a32(`${childId}:activeForgeTab`);
  const at =
    typeof ao.activeForgeTab === "string" && ao.activeForgeTab.trim()
      ? normalizeForgeThemeTabIdForMerge(ao.activeForgeTab)
      : "";
  const bt =
    typeof bo.activeForgeTab === "string" && bo.activeForgeTab.trim()
      ? normalizeForgeThemeTabIdForMerge(bo.activeForgeTab)
      : "";
  if (at && bt && at === bt) {
    merged.activeForgeTab = at;
  } else if (at && bt) {
    merged.activeForgeTab = pickU32(hTab, 2) === 0 ? at : bt;
  } else if (at) merged.activeForgeTab = at;
  else if (bt) merged.activeForgeTab = bt;
  else {
    merged.activeForgeTab = FORGE_THEME_TAB_IDS[pickU32(hTab, FORGE_THEME_TAB_IDS.length)]!;
  }

  if (typeof merged.activeForgeTab === "string") {
    merged.activeForgeTab = normalizeForgeThemeTabIdForMerge(merged.activeForgeTab);
    const ok = (FORGE_THEME_TAB_IDS as readonly string[]).includes(merged.activeForgeTab);
    if (!ok) merged.activeForgeTab = "anime_temptation";
  }

  return merged;
}

export function buildChildPersonalityForgeRow(
  rawPersonalityA: unknown,
  rawPersonalityB: unknown,
  themeA: Record<string, unknown> | null,
  themeB: Record<string, unknown> | null,
  childId: string,
): Record<string, unknown> | null {
  const base = mergeChildPersonalityForgeBase(rawPersonalityA, rawPersonalityB, childId);
  const theme = mergeForgeThemeSnapshotsV1(themeA, themeB, childId);
  if (!theme && Object.keys(base).length === 0) return null;
  if (theme) {
    return { ...base, _forgeThemeV2: theme, _forgeThemeV1: theme };
  }
  return Object.keys(base).length ? base : null;
}
