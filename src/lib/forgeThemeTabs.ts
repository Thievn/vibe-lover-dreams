/**
 * Companion Forge — theme tabs: typed feature state, UI field registry, prompt prose, randomizers, render presets.
 */
import type { ForgeVisualTailoring } from "@/lib/forgeVisualTailoring";

export type ForgeThemeTabId = "anime" | "monster" | "gothic" | "realistic" | "dark_fantasy" | "chaos";

export const FORGE_THEME_TABS: { id: ForgeThemeTabId; label: string; subtitle: string }[] = [
  { id: "anime", label: "Anime Temptation", subtitle: "Stylized charm, expressive faces, playful presets." },
  { id: "monster", label: "Monster Desire", subtitle: "Creature anatomy, appendages, and exotic silhouettes." },
  { id: "gothic", label: "Gothic Seduction", subtitle: "Lace, pallor, dramatic romance, tragic elegance." },
  { id: "realistic", label: "Realistic Craving", subtitle: "Natural skin detail, realism sliders, lived-in intimacy." },
  { id: "dark_fantasy", label: "Dark Fantasy", subtitle: "Runes, corruption, ritual markings, fallen archetypes." },
  { id: "chaos", label: "Eternal Chaos", subtitle: "Controlled insanity, hybrid horror/cute, maximal randomness." },
];

export type ForgeTabSharedOverride = {
  bodyTypeEnabled: boolean;
  bodyTypeValue: string;
  sexualEnergyEnabled: boolean;
  sexualEnergyValue: string;
  kinksEnabled: boolean;
  kinksValue: string;
};

export type ForgeAnimeFeatures = {
  eyeShine: number;
  ahogeVariety: number;
  thighhighLayers: number;
  skirtPhysics: number;
  ahegaoIntensity: number;
  hairHighlights: number;
  posePreset: "cute" | "seductive" | "lewd" | "dynamic";
};

export type ForgeMonsterFeatures = {
  tentacleCount: number;
  multiBreastRows: boolean;
  hornConfig: string;
  tailType: string;
  wingSize: number;
  skinTexture: string;
  extraLimbs: boolean;
};

export type ForgeGothicFeatures = {
  corsetTightness: number;
  laceDensity: number;
  fangLength: number;
  pallor: number;
  gothicFashionMode: "victorian" | "modern";
  jewelryOverload: number;
  tragicBeauty: number;
};

export type ForgeRealisticFeatures = {
  softnessVsToned: number;
  stretchMarkCellulite: number;
  tanLineStrength: number;
  breastWeightRealism: number;
  postHeatFlush: number;
  makeupSmudge: number;
  poreDetail: number;
};

export type ForgeDarkFantasyFeatures = {
  corruptionLevel: number;
  runePlacement: string;
  demonicIntensity: number;
  ritualScars: string;
  manaAuraColor: string;
  manaAuraStrength: number;
  fallenVsRising: "fallen_angel" | "rising_demon";
};

export type ForgeChaosFeatures = {
  garbagePailGrotesque: boolean;
  maxDegeneracy: boolean;
  bodyHorrorCuteBlend: number;
  randomizerPower: number;
  whatTheFuckSeed: number;
};

export type ForgeTabFeatureMap = {
  anime: ForgeAnimeFeatures;
  monster: ForgeMonsterFeatures;
  gothic: ForgeGothicFeatures;
  realistic: ForgeRealisticFeatures;
  dark_fantasy: ForgeDarkFantasyFeatures;
  chaos: ForgeChaosFeatures;
};

export function clampForgeTabNum(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function makeDefaultTabSharedOverrides(): Record<ForgeThemeTabId, ForgeTabSharedOverride> {
  const empty: ForgeTabSharedOverride = {
    bodyTypeEnabled: false,
    bodyTypeValue: "",
    sexualEnergyEnabled: false,
    sexualEnergyValue: "",
    kinksEnabled: false,
    kinksValue: "",
  };
  return {
    anime: { ...empty },
    monster: { ...empty },
    gothic: { ...empty },
    realistic: { ...empty },
    dark_fantasy: { ...empty },
    chaos: { ...empty },
  };
}

export function makeDefaultTabFeatures(): ForgeTabFeatureMap {
  return {
    anime: {
      eyeShine: 72,
      ahogeVariety: 35,
      thighhighLayers: 60,
      skirtPhysics: 58,
      ahegaoIntensity: 12,
      hairHighlights: 64,
      posePreset: "cute",
    },
    monster: {
      tentacleCount: 4,
      multiBreastRows: false,
      hornConfig: "curved",
      tailType: "serpentine",
      wingSize: 56,
      skinTexture: "scales",
      extraLimbs: false,
    },
    gothic: {
      corsetTightness: 70,
      laceDensity: 66,
      fangLength: 30,
      pallor: 62,
      gothicFashionMode: "victorian",
      jewelryOverload: 45,
      tragicBeauty: 58,
    },
    realistic: {
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
    chaos: {
      garbagePailGrotesque: false,
      maxDegeneracy: false,
      bodyHorrorCuteBlend: 64,
      randomizerPower: 80,
      whatTheFuckSeed: 0,
    },
  };
}

/** Merge partial / legacy stash JSON into full typed tab map. */
export function normalizeForgeTabFeatureMap(raw: unknown): ForgeTabFeatureMap {
  const d = makeDefaultTabFeatures();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;

  const mergeAnime = (o: unknown): ForgeAnimeFeatures => {
    const base = { ...d.anime };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const n = (k: keyof ForgeAnimeFeatures, min = 0, max = 100) =>
      typeof x[k] === "number" ? clampForgeTabNum(x[k] as number, min, max) : base[k];
    const pose = x.posePreset;
    const poseOk =
      pose === "cute" || pose === "seductive" || pose === "lewd" || pose === "dynamic" ? pose : base.posePreset;
    return {
      eyeShine: n("eyeShine"),
      ahogeVariety: n("ahogeVariety"),
      thighhighLayers: n("thighhighLayers"),
      skirtPhysics: n("skirtPhysics"),
      ahegaoIntensity: n("ahegaoIntensity"),
      hairHighlights: n("hairHighlights"),
      posePreset: poseOk,
    };
  };

  const mergeMonster = (o: unknown): ForgeMonsterFeatures => {
    const base = { ...d.monster };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const opts = FORGE_MONSTER_HORN_OPTIONS as readonly string[];
    const tailOpts = FORGE_MONSTER_TAIL_OPTIONS as readonly string[];
    const skinOpts = FORGE_MONSTER_SKIN_OPTIONS as readonly string[];
    return {
      tentacleCount:
        typeof x.tentacleCount === "number"
          ? clampForgeTabNum(Math.round(x.tentacleCount as number), 0, 12)
          : base.tentacleCount,
      multiBreastRows: typeof x.multiBreastRows === "boolean" ? x.multiBreastRows : base.multiBreastRows,
      hornConfig: typeof x.hornConfig === "string" && opts.includes(x.hornConfig) ? x.hornConfig : base.hornConfig,
      tailType: typeof x.tailType === "string" && tailOpts.includes(x.tailType) ? x.tailType : base.tailType,
      wingSize: typeof x.wingSize === "number" ? clampForgeTabNum(x.wingSize as number, 0, 100) : base.wingSize,
      skinTexture: typeof x.skinTexture === "string" && skinOpts.includes(x.skinTexture) ? x.skinTexture : base.skinTexture,
      extraLimbs: typeof x.extraLimbs === "boolean" ? x.extraLimbs : base.extraLimbs,
    };
  };

  const mergeGothic = (o: unknown): ForgeGothicFeatures => {
    const base = { ...d.gothic };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const n = (k: keyof ForgeGothicFeatures) =>
      typeof x[k] === "number" ? clampForgeTabNum(x[k] as number, 0, 100) : base[k];
    const mode = x.gothicFashionMode;
    const modeOk = mode === "victorian" || mode === "modern" ? mode : base.gothicFashionMode;
    return {
      corsetTightness: n("corsetTightness"),
      laceDensity: n("laceDensity"),
      fangLength: n("fangLength"),
      pallor: n("pallor"),
      gothicFashionMode: modeOk,
      jewelryOverload: n("jewelryOverload"),
      tragicBeauty: n("tragicBeauty"),
    };
  };

  const mergeRealistic = (o: unknown): ForgeRealisticFeatures => {
    const base = { ...d.realistic };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const n = (k: keyof ForgeRealisticFeatures) =>
      typeof x[k] === "number" ? clampForgeTabNum(x[k] as number, 0, 100) : base[k];
    return {
      softnessVsToned: n("softnessVsToned"),
      stretchMarkCellulite: n("stretchMarkCellulite"),
      tanLineStrength: n("tanLineStrength"),
      breastWeightRealism: n("breastWeightRealism"),
      postHeatFlush: n("postHeatFlush"),
      makeupSmudge: n("makeupSmudge"),
      poreDetail: n("poreDetail"),
    };
  };

  const mergeDark = (o: unknown): ForgeDarkFantasyFeatures => {
    const base = { ...d.dark_fantasy };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const runeOpts = FORGE_DARK_RUNE_OPTIONS as readonly string[];
    const scarOpts = FORGE_DARK_SCAR_OPTIONS as readonly string[];
    const manaOpts = FORGE_DARK_MANA_COLORS as readonly string[];
    const fr = x.fallenVsRising;
    const frOk =
      fr === "fallen_angel" || fr === "rising_demon" ? fr : base.fallenVsRising;
    return {
      corruptionLevel:
        typeof x.corruptionLevel === "number" ? clampForgeTabNum(x.corruptionLevel as number, 0, 100) : base.corruptionLevel,
      runePlacement: typeof x.runePlacement === "string" && runeOpts.includes(x.runePlacement) ? x.runePlacement : base.runePlacement,
      demonicIntensity:
        typeof x.demonicIntensity === "number" ? clampForgeTabNum(x.demonicIntensity as number, 0, 100) : base.demonicIntensity,
      ritualScars: typeof x.ritualScars === "string" && scarOpts.includes(x.ritualScars) ? x.ritualScars : base.ritualScars,
      manaAuraColor: typeof x.manaAuraColor === "string" && manaOpts.includes(x.manaAuraColor) ? x.manaAuraColor : base.manaAuraColor,
      manaAuraStrength:
        typeof x.manaAuraStrength === "number" ? clampForgeTabNum(x.manaAuraStrength as number, 0, 100) : base.manaAuraStrength,
      fallenVsRising: frOk,
    };
  };

  const mergeChaos = (o: unknown): ForgeChaosFeatures => {
    const base = { ...d.chaos };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    return {
      garbagePailGrotesque:
        typeof x.garbagePailGrotesque === "boolean" ? x.garbagePailGrotesque : base.garbagePailGrotesque,
      maxDegeneracy: typeof x.maxDegeneracy === "boolean" ? x.maxDegeneracy : base.maxDegeneracy,
      bodyHorrorCuteBlend:
        typeof x.bodyHorrorCuteBlend === "number"
          ? clampForgeTabNum(x.bodyHorrorCuteBlend as number, 0, 100)
          : base.bodyHorrorCuteBlend,
      randomizerPower:
        typeof x.randomizerPower === "number" ? clampForgeTabNum(x.randomizerPower as number, 0, 100) : base.randomizerPower,
      whatTheFuckSeed:
        typeof x.whatTheFuckSeed === "number"
          ? clampForgeTabNum(Math.floor(x.whatTheFuckSeed as number), 0, 9_999_999)
          : base.whatTheFuckSeed,
    };
  };

  return {
    anime: mergeAnime(r.anime),
    monster: mergeMonster(r.monster),
    gothic: mergeGothic(r.gothic),
    realistic: mergeRealistic(r.realistic),
    dark_fantasy: mergeDark(r.dark_fantasy),
    chaos: mergeChaos(r.chaos),
  };
}

export function normalizeForgeTabSharedOverrides(raw: unknown): Record<ForgeThemeTabId, ForgeTabSharedOverride> {
  const d = makeDefaultTabSharedOverrides();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const mergeOne = (id: ForgeThemeTabId, o: unknown): ForgeTabSharedOverride => {
    const base = { ...d[id] };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    return {
      bodyTypeEnabled: typeof x.bodyTypeEnabled === "boolean" ? x.bodyTypeEnabled : base.bodyTypeEnabled,
      bodyTypeValue: typeof x.bodyTypeValue === "string" ? x.bodyTypeValue : base.bodyTypeValue,
      sexualEnergyEnabled: typeof x.sexualEnergyEnabled === "boolean" ? x.sexualEnergyEnabled : base.sexualEnergyEnabled,
      sexualEnergyValue: typeof x.sexualEnergyValue === "string" ? x.sexualEnergyValue : base.sexualEnergyValue,
      kinksEnabled: typeof x.kinksEnabled === "boolean" ? x.kinksEnabled : base.kinksEnabled,
      kinksValue: typeof x.kinksValue === "string" ? x.kinksValue : base.kinksValue,
    };
  };
  return {
    anime: mergeOne("anime", r.anime),
    monster: mergeOne("monster", r.monster),
    gothic: mergeOne("gothic", r.gothic),
    realistic: mergeOne("realistic", r.realistic),
    dark_fantasy: mergeOne("dark_fantasy", r.dark_fantasy),
    chaos: mergeOne("chaos", r.chaos),
  };
}

export function normalizeForgeThemeTabId(raw: unknown): ForgeThemeTabId {
  const ids: ForgeThemeTabId[] = ["anime", "monster", "gothic", "realistic", "dark_fantasy", "chaos"];
  if (typeof raw === "string" && ids.includes(raw as ForgeThemeTabId)) return raw as ForgeThemeTabId;
  return "anime";
}

// --- Select option pools (random + UI) ---

export const FORGE_ANIME_POSE_OPTIONS = ["cute", "seductive", "lewd", "dynamic"] as const;

export const FORGE_MONSTER_HORN_OPTIONS = ["curved", "spiral", "straight", "ram", "crown", "broken"] as const;
export const FORGE_MONSTER_TAIL_OPTIONS = ["serpentine", "spaded", "fluffy", "draconic", "finned", "insect"] as const;
export const FORGE_MONSTER_SKIN_OPTIONS = ["scales", "slime", "fur", "chitin", "feathered", "stone-like"] as const;

export const FORGE_DARK_RUNE_OPTIONS = ["collarbone", "thigh", "spine", "cheek", "forehead", "hands"] as const;
export const FORGE_DARK_SCAR_OPTIONS = ["subtle", "medium", "heavy"] as const;
export const FORGE_DARK_MANA_COLORS = ["violet", "crimson", "cyan", "obsidian", "emerald", "gold"] as const;

// --- Slider wording for prose ---

function intensityLabel(n: number): string {
  if (n <= 15) return "very subtle";
  if (n <= 35) return "light";
  if (n <= 55) return "moderate";
  if (n <= 75) return "strong";
  if (n <= 90) return "very strong";
  return "extreme";
}

function biasSoftVsToned(n: number): string {
  if (n <= 33) return "softer, more plush natural weight";
  if (n <= 66) return "balanced between soft and athletic";
  return "toned, firmer definition";
}

function posePresetLabel(p: ForgeAnimeFeatures["posePreset"]): string {
  const m: Record<typeof p, string> = {
    cute: "cute, playful idol energy",
    seductive: "slow, inviting glamour pose",
    lewd: "bold, unapologetic pin-up tension (SFW framing)",
    dynamic: "action-line manga dynamism",
  };
  return m[p];
}

function fallenRisingLabel(v: ForgeDarkFantasyFeatures["fallenVsRising"]): string {
  return v === "fallen_angel" ? "fallen angel melancholy and tarnished grace" : "rising demon ambition and hungry heat";
}

export function buildForgeTabPromptAddon(o: {
  tabId: ForgeThemeTabId;
  features: ForgeTabFeatureMap[ForgeThemeTabId];
  effectiveBodyType: string;
  sexualEnergy: string;
  kinks: string[];
}): string {
  const tabLabel = FORGE_THEME_TABS.find((t) => t.id === o.tabId)?.label ?? o.tabId;
  let themeProse = "";

  switch (o.tabId) {
    case "anime": {
      const f = o.features as ForgeAnimeFeatures;
      themeProse = [
        `Anime-forward portrait: ${intensityLabel(f.eyeShine)} eye size emphasis and specular "shine" on stylized irises.`,
        `Ahoge / stray hair silliness at ${intensityLabel(f.ahogeVariety)}.`,
        `Legwear layering and thigh-high stack reads ${intensityLabel(f.thighhighLayers)}.`,
        `Skirt weight, pleats, and "physics" exaggeration at ${intensityLabel(f.skirtPhysics)}.`,
        `Expressive "ahegao-adjacent" face play (still SFW card) at ${intensityLabel(f.ahegaoIntensity)} — more cartoon exaggeration, not explicit.`,
        `Hair streaks and highlight ribbons at ${intensityLabel(f.hairHighlights)}.`,
        `Pose direction: ${posePresetLabel(f.posePreset)}.`,
      ].join(" ");
      break;
    }
    case "monster": {
      const f = o.features as ForgeMonsterFeatures;
      themeProse = [
        `Creature fantasy: ${f.tentacleCount} tentacle-like or appendage elements (placement varies; keep anatomy coherent).`,
        f.multiBreastRows ? "Multiple breast rows suggested — stylized fantasy biology, tasteful SFW framing." : "Single natural breast row.",
        `Horns: ${f.hornConfig}. Tail: ${f.tailType}.`,
        `Wing presence scale ${intensityLabel(f.wingSize)}.`,
        `Skin surface: ${f.skinTexture}.`,
        f.extraLimbs ? "Extra limbs or hybrid joints visible — sell non-human silhouette clearly." : "Standard limb count unless body type already implies otherwise.",
      ].join(" ");
      break;
    }
    case "gothic": {
      const f = o.features as ForgeGothicFeatures;
      themeProse = [
        `Gothic romance: corset cinch and rib silhouette emphasis ${intensityLabel(f.corsetTightness)}.`,
        `Lace density and veil layering ${intensityLabel(f.laceDensity)}.`,
        `Fang suggestion length ${intensityLabel(f.fangLength)}.`,
        `Pallor / candlelit undead-adjacent skin read ${intensityLabel(f.pallor)}.`,
        `Fashion era: ${f.gothicFashionMode === "victorian" ? "Victorian / gaslamp" : "modern goth street-luxe"}.`,
        `Jewelry stacking and metal filigree ${intensityLabel(f.jewelryOverload)}.`,
        `Tragic beauty / ruined-saint mood ${intensityLabel(f.tragicBeauty)}.`,
      ].join(" ");
      break;
    }
    case "realistic": {
      const f = o.features as ForgeRealisticFeatures;
      themeProse = [
        `Photoreal lean: body softness vs muscle ${biasSoftVsToned(f.softnessVsToned)}.`,
        `Natural skin storytelling — stretch marks / cellulite visibility ${intensityLabel(f.stretchMarkCellulite)} (tasteful, humanizing).`,
        `Tan lines / sun history ${intensityLabel(f.tanLineStrength)}.`,
        `Breast weight and gravity realism ${intensityLabel(f.breastWeightRealism)}.`,
        `Post-intimacy flush and under-eye fatigue ${intensityLabel(f.postHeatFlush)}.`,
        `Makeup wear and smudge ${intensityLabel(f.makeupSmudge)}.`,
        `Pore and micro-skin detail ${intensityLabel(f.poreDetail)}.`,
      ].join(" ");
      break;
    }
    case "dark_fantasy": {
      const f = o.features as ForgeDarkFantasyFeatures;
      themeProse = [
        `Dark fantasy: corruption / unholy taint ${intensityLabel(f.corruptionLevel)}.`,
        `Glowing runes anchored near ${f.runePlacement}.`,
        `Demonic feature read (horns, eyes, markings) ${intensityLabel(f.demonicIntensity)}.`,
        `Ritual scar pattern intensity: ${f.ritualScars}.`,
        `Mana aura color ${f.manaAuraColor}, strength ${intensityLabel(f.manaAuraStrength)}.`,
        `Archetype tilt: ${fallenRisingLabel(f.fallenVsRising)}.`,
      ].join(" ");
      break;
    }
    case "chaos": {
      const f = o.features as ForgeChaosFeatures;
      themeProse = [
        `Chaos mode: grotesque-cute hybrid ${f.garbagePailGrotesque ? "ON — warped cute proportions, collectible-monster vibe" : "off — keep face mostly appealing"}.`,
        `Maximal degeneracy flavor ${f.maxDegeneracy ? "ON — push weird wardrobe and props within SFW portrait rules" : "off"}.`,
        `Body-horror vs cute tension ${intensityLabel(f.bodyHorrorCuteBlend)}.`,
        `Randomizer strength ${intensityLabel(f.randomizerPower)} — break clichés, mix genres.`,
        f.whatTheFuckSeed > 0 ? `Creative salt: ${f.whatTheFuckSeed} (use to diverge from generic output).` : "",
      ]
        .filter(Boolean)
        .join(" ");
      break;
    }
    default:
      themeProse = "";
  }

  const kinkLine = o.kinks.length ? o.kinks.join(", ") : "none specified";
  return `Forge focus theme: "${tabLabel}" (high priority). ${themeProse} Shared anchors for this tab: physique "${o.effectiveBodyType}"; sexual energy "${o.sexualEnergy}"; kink undertones to weave into tension (subtle): ${kinkLine}. Fuse with the Personalities matrix, wardrobe lab, and scene into one coherent portrait and character.`;
}

export function forgeTabLiveSummary(tabId: ForgeThemeTabId): string {
  const t = FORGE_THEME_TABS.find((x) => x.id === tabId);
  if (!t) return "";
  const bits: Record<ForgeThemeTabId, string> = {
    anime: "big-eye anime stylization, shine, pose presets",
    monster: "appendages, texture, wings, creature silhouette",
    gothic: "corsetry, lace, pallor, tragic glamour",
    realistic: "skin truth, softness, lived-in detail",
    dark_fantasy: "corruption, runes, aura, fallen vs rising",
    chaos: "hybrid weirdness, maximal variety",
  };
  return `Active: ${t.label} — ${bits[tabId]}. These notes merge into your preview prompt and Extra notes.`;
}

// --- Randomizers ---

function rand100(): number {
  return Math.floor(Math.random() * 101);
}

export function randomizeForgeTabFeatures(tab: ForgeThemeTabId, mode: "normal" | "chaos_wtf"): ForgeTabFeatureMap[ForgeThemeTabId] {
  if (tab === "anime") {
    const f = makeDefaultTabFeatures().anime;
    return {
      eyeShine: rand100(),
      ahogeVariety: rand100(),
      thighhighLayers: rand100(),
      skirtPhysics: rand100(),
      ahegaoIntensity: rand100(),
      hairHighlights: rand100(),
      posePreset: pick([...FORGE_ANIME_POSE_OPTIONS]),
    };
  }
  if (tab === "monster") {
    return {
      tentacleCount: Math.floor(Math.random() * 13),
      multiBreastRows: Math.random() < 0.35,
      hornConfig: pick([...FORGE_MONSTER_HORN_OPTIONS]),
      tailType: pick([...FORGE_MONSTER_TAIL_OPTIONS]),
      wingSize: rand100(),
      skinTexture: pick([...FORGE_MONSTER_SKIN_OPTIONS]),
      extraLimbs: Math.random() < 0.4,
    };
  }
  if (tab === "gothic") {
    return {
      corsetTightness: rand100(),
      laceDensity: rand100(),
      fangLength: rand100(),
      pallor: rand100(),
      gothicFashionMode: Math.random() < 0.5 ? "victorian" : "modern",
      jewelryOverload: rand100(),
      tragicBeauty: rand100(),
    };
  }
  if (tab === "realistic") {
    return {
      softnessVsToned: rand100(),
      stretchMarkCellulite: rand100(),
      tanLineStrength: rand100(),
      breastWeightRealism: rand100(),
      postHeatFlush: rand100(),
      makeupSmudge: rand100(),
      poreDetail: rand100(),
    };
  }
  if (tab === "dark_fantasy") {
    return {
      corruptionLevel: rand100(),
      runePlacement: pick([...FORGE_DARK_RUNE_OPTIONS]),
      demonicIntensity: rand100(),
      ritualScars: pick([...FORGE_DARK_SCAR_OPTIONS]),
      manaAuraColor: pick([...FORGE_DARK_MANA_COLORS]),
      manaAuraStrength: rand100(),
      fallenVsRising: Math.random() < 0.5 ? "fallen_angel" : "rising_demon",
    };
  }
  /* chaos */
  if (mode === "chaos_wtf") {
    return {
      garbagePailGrotesque: Math.random() < 0.65,
      maxDegeneracy: Math.random() < 0.55,
      bodyHorrorCuteBlend: rand100(),
      randomizerPower: Math.max(70, rand100()),
      whatTheFuckSeed: Math.floor(Math.random() * 9_000_000) + 1_000_000,
    };
  }
  return {
    garbagePailGrotesque: Math.random() < 0.25,
    maxDegeneracy: Math.random() < 0.2,
    bodyHorrorCuteBlend: rand100(),
    randomizerPower: rand100(),
    whatTheFuckSeed: Math.random() < 0.3 ? Math.floor(Math.random() * 9_000_000) + 1 : 0,
  };
}

export function randomizeForgeTabField(
  tab: ForgeThemeTabId,
  fieldKey: string,
  current: ForgeTabFeatureMap[ForgeThemeTabId],
): ForgeTabFeatureMap[ForgeThemeTabId] {
  const c = { ...current } as Record<string, number | string | boolean>;
  const v = c[fieldKey];
  if (typeof v === "number") {
    if (tab === "monster" && fieldKey === "tentacleCount") {
      c[fieldKey] = Math.floor(Math.random() * 13);
    } else if (tab === "chaos" && fieldKey === "whatTheFuckSeed") {
      c[fieldKey] = Math.floor(Math.random() * 9_000_000) + 1_000_000;
    } else {
      c[fieldKey] = rand100();
    }
    return c as ForgeTabFeatureMap[ForgeThemeTabId];
  }
  if (typeof v === "boolean") {
    c[fieldKey] = Math.random() < 0.5;
    return c as ForgeTabFeatureMap[ForgeThemeTabId];
  }
  if (typeof v === "string") {
    if (tab === "anime" && fieldKey === "posePreset") c[fieldKey] = pick([...FORGE_ANIME_POSE_OPTIONS]);
    else if (tab === "monster" && fieldKey === "hornConfig") c[fieldKey] = pick([...FORGE_MONSTER_HORN_OPTIONS]);
    else if (tab === "monster" && fieldKey === "tailType") c[fieldKey] = pick([...FORGE_MONSTER_TAIL_OPTIONS]);
    else if (tab === "monster" && fieldKey === "skinTexture") c[fieldKey] = pick([...FORGE_MONSTER_SKIN_OPTIONS]);
    else if (tab === "gothic" && fieldKey === "gothicFashionMode") c[fieldKey] = Math.random() < 0.5 ? "victorian" : "modern";
    else if (tab === "dark_fantasy" && fieldKey === "runePlacement") c[fieldKey] = pick([...FORGE_DARK_RUNE_OPTIONS]);
    else if (tab === "dark_fantasy" && fieldKey === "ritualScars") c[fieldKey] = pick([...FORGE_DARK_SCAR_OPTIONS]);
    else if (tab === "dark_fantasy" && fieldKey === "manaAuraColor") c[fieldKey] = pick([...FORGE_DARK_MANA_COLORS]);
    else if (tab === "dark_fantasy" && fieldKey === "fallenVsRising") {
      c[fieldKey] = Math.random() < 0.5 ? "fallen_angel" : "rising_demon";
    }
    return c as ForgeTabFeatureMap[ForgeThemeTabId];
  }
  return current;
}

// --- Render + wardrobe presets (explicit user click only) ---

export type ForgeTabRenderPreset = {
  artStyle: string;
  sceneAtmosphere: string;
  visualTailoringPatch: Partial<ForgeVisualTailoring>;
};

export const FORGE_TAB_RENDER_PRESETS: Record<ForgeThemeTabId, ForgeTabRenderPreset> = {
  anime: {
    artStyle: "Anime Style",
    sceneAtmosphere: "High-Key Fashion Test Wall",
    visualTailoringPatch: {
      outfitStyle: "Casual streetwear",
      colorPalette: "Neon magenta + cyan",
      eyeColor: "Violet fantasy",
      accessories: "Choker",
    },
  },
  monster: {
    artStyle: "Dark Fantasy Art",
    sceneAtmosphere: "Black Void Infinity Cove",
    visualTailoringPatch: {
      outfitStyle: "Fantasy robes",
      colorPalette: "Ultraviolet + black",
      specialFeatures: ["Horns", "Tail", "Bioluminescent markings"],
    },
  },
  gothic: {
    artStyle: "Gothic Victorian",
    sceneAtmosphere: "Crystal Chandelier Ballroom",
    visualTailoringPatch: {
      outfitStyle: "Gothic corsetry",
      colorPalette: "Noir + crimson accent",
      footwear: "Thigh-high boots",
      accessories: "Layered chains",
    },
  },
  realistic: {
    artStyle: "Dark Moody Realism",
    sceneAtmosphere: "Neutral Gray Seamless Backdrop",
    visualTailoringPatch: {
      outfitStyle: "Evening dress",
      colorPalette: "Ivory + champagne",
      skinTone: "Freckled sun-kissed",
    },
  },
  dark_fantasy: {
    artStyle: "Dark Fantasy Art",
    sceneAtmosphere: "Moonlit Rooftop",
    visualTailoringPatch: {
      outfitStyle: "Fantasy robes",
      colorPalette: "Ultraviolet + black",
      specialFeatures: ["Runic sigils", "Glowing eyes"],
    },
  },
  chaos: {
    artStyle: "Surreal Dreamscape",
    sceneAtmosphere: "Rainbow After-Storm Street Puddle",
    visualTailoringPatch: {
      outfitStyle: "Cyberwear",
      colorPalette: "Neon magenta + cyan",
      hairColor: "Pastel pink tips",
      specialFeatures: ["Heterochromia", "Bioluminescent markings"],
    },
  },
};

// --- UI field registry ---

export type ForgeThemeFieldKind = "slider" | "toggle" | "select" | "numberInput";

export type ForgeThemeFieldRow = {
  section?: string;
  key: string;
  label: string;
  hint?: string;
  kind: ForgeThemeFieldKind;
  sliderMin?: number;
  sliderMax?: number;
  selectOptions?: readonly string[];
  /** Human-readable labels for select values (same order as selectOptions). */
  selectLabels?: readonly string[];
};

function selOpts(opts: readonly string[], labels?: readonly string[]): Pick<ForgeThemeFieldRow, "selectOptions" | "selectLabels"> {
  return { selectOptions: opts, selectLabels: labels ?? opts };
}

export const FORGE_TAB_FIELD_ROWS: Record<ForgeThemeTabId, readonly ForgeThemeFieldRow[]> = {
  anime: [
    { section: "Face & hair", key: "eyeShine", label: "Eye size & shine", hint: "Higher = bigger anime eyes and glossier highlights.", kind: "slider" },
    { key: "ahogeVariety", label: "Ahoge / stray locks", hint: "Silly hair antenna energy.", kind: "slider" },
    { key: "hairHighlights", label: "Streaks & highlights", hint: "Ribbon streaks and secondary hair colors.", kind: "slider" },
    { section: "Wardrobe physics", key: "thighhighLayers", label: "Thigh-high layers", hint: "Stacked hosiery and accessories on legs.", kind: "slider" },
    { key: "skirtPhysics", label: "Skirt motion", hint: "Pleats, lift, and exaggerated cloth motion.", kind: "slider" },
    { section: "Expression & pose", key: "ahegaoIntensity", label: "Exaggerated face play", hint: "Cartoon intensity (SFW card — no explicit acts).", kind: "slider" },
    {
      key: "posePreset",
      label: "Pose vibe",
      kind: "select",
      ...selOpts([...FORGE_ANIME_POSE_OPTIONS], ["Cute", "Seductive", "Lewd tension (SFW)", "Dynamic action"]),
    },
  ],
  monster: [
    { section: "Anatomy", key: "tentacleCount", label: "Tentacles / tendrils", hint: "Count of prominent appendages (0–12).", kind: "slider", sliderMin: 0, sliderMax: 12 },
    { key: "extraLimbs", label: "Extra limbs", hint: "Additional arms or hybrid joints.", kind: "toggle" },
    { key: "multiBreastRows", label: "Multiple breast rows", hint: "Fantasy biology — keep portrait tasteful.", kind: "toggle" },
    { section: "Creature kit", key: "hornConfig", label: "Horns", kind: "select", ...selOpts([...FORGE_MONSTER_HORN_OPTIONS]) },
    { key: "tailType", label: "Tail", kind: "select", ...selOpts([...FORGE_MONSTER_TAIL_OPTIONS]) },
    { key: "skinTexture", label: "Skin / surface", kind: "select", ...selOpts([...FORGE_MONSTER_SKIN_OPTIONS]) },
    { key: "wingSize", label: "Wing scale", hint: "How large wings read in frame.", kind: "slider" },
  ],
  gothic: [
    { section: "Silhouette", key: "corsetTightness", label: "Corset cinch", kind: "slider" },
    { key: "laceDensity", label: "Lace & veils", kind: "slider" },
    { key: "jewelryOverload", label: "Jewelry stacking", kind: "slider" },
    { section: "Vampire glam", key: "fangLength", label: "Fang suggestion", kind: "slider" },
    { key: "pallor", label: "Pallor", hint: "Candlelit undead-adjacent skin.", kind: "slider" },
    { key: "tragicBeauty", label: "Tragic beauty", hint: "Ruined-saint melodrama.", kind: "slider" },
    {
      key: "gothicFashionMode",
      label: "Fashion era",
      kind: "select",
      selectOptions: ["victorian", "modern"],
      selectLabels: ["Victorian / gaslamp", "Modern goth"],
    },
  ],
  realistic: [
    { section: "Body", key: "softnessVsToned", label: "Soft vs toned", hint: "Left = softer, right = more athletic.", kind: "slider" },
    { key: "breastWeightRealism", label: "Breast weight & gravity", kind: "slider" },
    { section: "Skin truth", key: "stretchMarkCellulite", label: "Stretch & cellulite visibility", kind: "slider" },
    { key: "tanLineStrength", label: "Tan lines", kind: "slider" },
    { key: "poreDetail", label: "Pore & micro-detail", kind: "slider" },
    { section: "Lived-in glam", key: "postHeatFlush", label: "Flush & tired eyes", hint: "Just-rumpled intimacy cues.", kind: "slider" },
    { key: "makeupSmudge", label: "Makeup smudge", kind: "slider" },
  ],
  dark_fantasy: [
    { section: "Corruption", key: "corruptionLevel", label: "Corruption", kind: "slider" },
    { key: "demonicIntensity", label: "Demonic features", kind: "slider" },
    { key: "manaAuraStrength", label: "Mana aura strength", kind: "slider" },
    { section: "Marks", key: "runePlacement", label: "Rune placement", kind: "select", ...selOpts([...FORGE_DARK_RUNE_OPTIONS]) },
    { key: "ritualScars", label: "Ritual scars", kind: "select", ...selOpts([...FORGE_DARK_SCAR_OPTIONS], ["Subtle", "Medium", "Heavy"]) },
    { key: "manaAuraColor", label: "Aura color", kind: "select", ...selOpts([...FORGE_DARK_MANA_COLORS]) },
    {
      key: "fallenVsRising",
      label: "Archetype",
      kind: "select",
      selectOptions: ["fallen_angel", "rising_demon"],
      selectLabels: ["Fallen angel", "Rising demon"],
    },
  ],
  chaos: [
    { section: "Chaos switches", key: "garbagePailGrotesque", label: "Grotesque-cute", hint: "Warped cute / collectible monster vibe.", kind: "toggle" },
    { key: "maxDegeneracy", label: "Max weird wardrobe", hint: "Push odd props within SFW portrait rules.", kind: "toggle" },
    { section: "Sliders", key: "bodyHorrorCuteBlend", label: "Cute vs body-horror tension", kind: "slider" },
    { key: "randomizerPower", label: "Rule-breaking strength", kind: "slider" },
    {
      key: "whatTheFuckSeed",
      label: "Chaos salt",
      hint: "Optional number to diverge prompts, or use Wild roll.",
      kind: "numberInput",
      sliderMin: 0,
      sliderMax: 9_999_999,
    },
  ],
};
