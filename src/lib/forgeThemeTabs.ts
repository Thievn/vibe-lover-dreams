/**
 * Companion Forge — theme tabs: typed feature state, UI field registry, prompt prose, randomizers, render presets.
 */
import type { ForgeVisualTailoring } from "@/lib/forgeVisualTailoring";

export const FORGE_CORE_THEME_TAB_IDS = ["anime", "monster", "gothic", "realistic", "dark_fantasy", "chaos"] as const;
export type ForgeCoreThemeTabId = (typeof FORGE_CORE_THEME_TAB_IDS)[number];

export const FORGE_EXTENDED_THEME_TAB_IDS = [
  "cyber_neon_syndicate",
  "starlit_siren_sci_fi",
  "steampunk_velvet",
  "retro_pinup_heat",
  "iron_glory_apex",
  "velvet_romance_soft",
  "horror_whisper_court",
  "feral_nature_covenant",
  "royal_sin_palace",
  "neon_alley_predator",
  "celestial_fallen_halo",
  "infernal_high_table",
  "abyssal_depth_siren",
  "grotesque_goddess_majesty",
] as const;
export type ForgeExtendedThemeTabId = (typeof FORGE_EXTENDED_THEME_TAB_IDS)[number];

export type ForgeThemeTabId = ForgeCoreThemeTabId | ForgeExtendedThemeTabId;

export const ALL_FORGE_THEME_TAB_IDS: readonly ForgeThemeTabId[] = [
  ...FORGE_CORE_THEME_TAB_IDS,
  ...FORGE_EXTENDED_THEME_TAB_IDS,
];

export type ForgeExtendedLabFeatures = {
  voltage: number;
  saturation: number;
  gritVsPolish: number;
  gloss: number;
  motionWind: number;
  intimacyBias: number;
  worldWeirdness: number;
  propLoad: number;
  loreWhisper: string;
};

export function isForgeExtendedThemeTab(id: ForgeThemeTabId): id is ForgeExtendedThemeTabId {
  return (FORGE_EXTENDED_THEME_TAB_IDS as readonly string[]).includes(id);
}

/** Seated / lounging / low-height poses — always facing the lens, never a generic standing catalog shot. */
export type ForgeCardPoseId =
  | "seated_sofa_relaxed"
  | "seated_floor_knees_hug"
  | "seated_ottoman_legs_side"
  | "lounging_low_chaise"
  | "seated_desk_chin_hand"
  | "seated_bed_propped_pillows"
  | "seated_chair_torso_twist"
  | "floor_side_lean_one_arm"
  | "kneeling_soft_cushion"
  | "seated_barstool_legs_crossed"
  | "seated_windowsill_backlit"
  | "beanbag_sprawl"
  | "seated_rug_cross_leg"
  | "chaise_side_leg_extended";

export const FORGE_CARD_POSE_IDS: readonly ForgeCardPoseId[] = [
  "seated_sofa_relaxed",
  "seated_floor_knees_hug",
  "seated_ottoman_legs_side",
  "lounging_low_chaise",
  "seated_desk_chin_hand",
  "seated_bed_propped_pillows",
  "seated_chair_torso_twist",
  "floor_side_lean_one_arm",
  "kneeling_soft_cushion",
  "seated_barstool_legs_crossed",
  "seated_windowsill_backlit",
  "beanbag_sprawl",
  "seated_rug_cross_leg",
  "chaise_side_leg_extended",
];

export function normalizeForgeCardPoseId(raw: unknown): ForgeCardPoseId {
  if (typeof raw === "string" && (FORGE_CARD_POSE_IDS as readonly string[]).includes(raw)) {
    return raw as ForgeCardPoseId;
  }
  return "seated_sofa_relaxed";
}

export function randomForgeCardPose(): ForgeCardPoseId {
  return FORGE_CARD_POSE_IDS[Math.floor(Math.random() * FORGE_CARD_POSE_IDS.length)]!;
}

const POSE_PROSE: Record<ForgeCardPoseId, string> = {
  seated_sofa_relaxed:
    "Seated deep in a sofa — hips sunk, shoulders soft, **looking directly into the camera**; relaxed glamour, hands conversational on knees or cushion.",
  seated_floor_knees_hug:
    "Seated on floor or low rug — knees loosely gathered or hugged toward chest, chin lifted, **eyes locked to camera**; intimate loft energy, not standing.",
  seated_ottoman_legs_side:
    "Low ottoman perch — legs folded to one side, torso slightly angled, **steady eye contact**; editorial lounge framing.",
  lounging_low_chaise:
    "Lounging on a low chaise — torso propped on elbow, hips grounded, **face toward camera**; long-line silhouette without standing.",
  seated_desk_chin_hand:
    "Seated at a desk or vanity edge — chin resting on knuckles, **direct gaze into lens**; cerebral flirt, seated only.",
  seated_bed_propped_pillows:
    "Seated on bed edge or propped against pillows — spine long but grounded, **camera-forward eyes**; boudoir warmth, still seated.",
  seated_chair_torso_twist:
    "Seated on chair — subtle torso twist toward camera, one hand on chair back or thigh, **eyes meeting viewer**; dynamic but not standing.",
  floor_side_lean_one_arm:
    "Side-lean on floor or low platform — one arm supporting torso, legs folded or extended along ground, **head turned to camera**.",
  kneeling_soft_cushion:
    "Knees on plush cushion or rug stack — upright torso, **frontal eye contact**, hands relaxed on thighs; kneeling portrait, not standing.",
  seated_barstool_legs_crossed:
    "Seated high stool — ankles crossed or hooked on rung, shoulders open, **eyes to camera**; bar noir intimacy.",
  seated_windowsill_backlit:
    "Seated on wide sill or low ledge — rim light behind, **face still clearly toward camera**; silhouette read without losing gaze.",
  beanbag_sprawl:
    "Low beanbag sprawl — shoulders sunk, knees angled, **playful direct stare** into lens; casual chaos, grounded low.",
  seated_rug_cross_leg:
    "Cross-legged on textured rug — hands on ankles or lap, **camera-locked gaze**; grounded storyteller vibe.",
  chaise_side_leg_extended:
    "Side-lying on chaise — one leg extended along cushion, torso slightly rolled toward camera, **eyes engaging lens**; pin-up flow without standing.",
};

export function forgeCardPoseProse(id: ForgeCardPoseId): string {
  return POSE_PROSE[id] ?? POSE_PROSE.seated_sofa_relaxed;
}

const POSE_LABELS: Record<ForgeCardPoseId, string> = {
  seated_sofa_relaxed: "Sofa · relaxed lens lock",
  seated_floor_knees_hug: "Floor · knees gathered",
  seated_ottoman_legs_side: "Ottoman · legs to the side",
  lounging_low_chaise: "Chaise · low lounge",
  seated_desk_chin_hand: "Desk · chin on hand",
  seated_bed_propped_pillows: "Bed · propped sit",
  seated_chair_torso_twist: "Chair · torso twist",
  floor_side_lean_one_arm: "Floor · side lean",
  kneeling_soft_cushion: "Kneeling · cushion",
  seated_barstool_legs_crossed: "Stool · legs crossed",
  seated_windowsill_backlit: "Sill · backlit sit",
  beanbag_sprawl: "Beanbag · low sprawl",
  seated_rug_cross_leg: "Rug · cross-legged",
  chaise_side_leg_extended: "Chaise · side lie",
};

export const FORGE_CARD_POSE_UI: { id: ForgeCardPoseId; label: string }[] = FORGE_CARD_POSE_IDS.map((id) => ({
  id,
  label: POSE_LABELS[id],
}));

export const FORGE_THEME_TABS: { id: ForgeThemeTabId; label: string; subtitle: string }[] = [
  { id: "anime", label: "Anime Temptation", subtitle: "Stylized charm, expressive faces, playful presets." },
  { id: "monster", label: "Monster Desire", subtitle: "Creature anatomy, appendages, and exotic silhouettes." },
  { id: "gothic", label: "Gothic Seduction", subtitle: "Lace, pallor, dramatic romance, tragic elegance." },
  { id: "realistic", label: "Realistic Craving", subtitle: "Natural skin detail, realism sliders, lived-in intimacy." },
  { id: "dark_fantasy", label: "Dark Fantasy", subtitle: "Runes, corruption, ritual markings, fallen archetypes." },
  { id: "chaos", label: "Eternal Chaos", subtitle: "Controlled insanity, hybrid horror/cute, maximal randomness." },
  { id: "cyber_neon_syndicate", label: "Cyber Neon Syndicate", subtitle: "HUD gloss, chrome skin, synth-noir rain and hologram ads." },
  { id: "starlit_siren_sci_fi", label: "Starlit Siren Sci-Fi", subtitle: "Zero-G silk, constellations on skin, soft ship-window rim light." },
  { id: "steampunk_velvet", label: "Steampunk Velvet", subtitle: "Brass, cog jewelry, corsetry over boilersuit, coal-smoke warmth." },
  { id: "retro_pinup_heat", label: "Retro Pin-Up Heat", subtitle: "Mid-century sets, film grain, cheeky poses, candy gloss." },
  { id: "iron_glory_apex", label: "Iron Glory Apex", subtitle: "Sweat-sheen muscle, arena lights, victory-strut confidence." },
  { id: "velvet_romance_soft", label: "Velvet Romance Soft", subtitle: "Candle haze, slow touches, whisper-close framing." },
  { id: "horror_whisper_court", label: "Horror Whisper Court", subtitle: "Elegant dread, bloodless menace, porcelain stillness." },
  { id: "feral_nature_covenant", label: "Feral Nature Covenant", subtitle: "Moss, rain, predator grace, pagan gold in twilight." },
  { id: "royal_sin_palace", label: "Royal Sin Palace", subtitle: "Throne rooms, jewels, power posture, velvet cruelty." },
  { id: "neon_alley_predator", label: "Neon Alley Predator", subtitle: "Wet asphalt, blade jewelry, hunted/hunter tension." },
  { id: "celestial_fallen_halo", label: "Celestial Fallen Halo", subtitle: "Tarnished gold, broken halos, soft divine bruising." },
  { id: "infernal_high_table", label: "Infernal High Table", subtitle: "Obsidian banquet, contract ink, slow-burn infernal glam." },
  { id: "abyssal_depth_siren", label: "Abyssal Depth Siren", subtitle: "Biolume, pressure-haze, drowned-palace seduction." },
  { id: "grotesque_goddess_majesty", label: "Grotesque Goddess Majesty", subtitle: "Monstrous glam, crowned weird, beautiful wrongness." },
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
  /** Collide multiple genre costume cues (0–100). */
  genreCollider: number;
  /** Stack odd props / accessories (0–100). */
  propStorm: number;
  /** Push discordant palettes / mismatched metals (0–100). */
  cursedPalette: number;
  symmetryBreak: boolean;
  oopsAllTropes: boolean;
};

type ForgeCoreTabFeatureMap = {
  anime: ForgeAnimeFeatures;
  monster: ForgeMonsterFeatures;
  gothic: ForgeGothicFeatures;
  realistic: ForgeRealisticFeatures;
  dark_fantasy: ForgeDarkFantasyFeatures;
  chaos: ForgeChaosFeatures;
};

type ForgeExtendedTabFeatureMap = { [K in ForgeExtendedThemeTabId]: ForgeExtendedLabFeatures };

export type ForgeTabFeatureMap = ForgeCoreTabFeatureMap & ForgeExtendedTabFeatureMap;

export function clampForgeTabNum(v: number, min: number, max: number): number {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

const FORGE_EXTENDED_LORE_WHISPERS = [
  "last frame of a forbidden holo-ad",
  "ozone, velvet, and distant thunder",
  "crowd noise turned to honey static",
  "salt on skin, starship coolant haze",
  "wax candles drowning in black wine",
  "rusted crown, fresh bruise glam",
  "tide pool biolume kissing ankles",
  "chrome saints filing their halos down",
] as const;

export function makeDefaultTabSharedOverrides(): Record<ForgeThemeTabId, ForgeTabSharedOverride> {
  const empty: ForgeTabSharedOverride = {
    bodyTypeEnabled: false,
    bodyTypeValue: "",
    sexualEnergyEnabled: false,
    sexualEnergyValue: "",
    kinksEnabled: false,
    kinksValue: "",
  };
  return Object.fromEntries(FORGE_THEME_TABS.map((t) => [t.id, { ...empty }])) as Record<
    ForgeThemeTabId,
    ForgeTabSharedOverride
  >;
}

function makeDefaultExtendedLabFeatures(): ForgeExtendedLabFeatures {
  return {
    voltage: 55,
    saturation: 50,
    gritVsPolish: 40,
    gloss: 48,
    motionWind: 42,
    intimacyBias: 55,
    worldWeirdness: 35,
    propLoad: 38,
    loreWhisper: "",
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
      genreCollider: 38,
      propStorm: 42,
      cursedPalette: 28,
      symmetryBreak: false,
      oopsAllTropes: false,
    },
    ...Object.fromEntries(
      FORGE_EXTENDED_THEME_TAB_IDS.map((id) => [id, makeDefaultExtendedLabFeatures()]),
    ),
  } as ForgeTabFeatureMap;
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
    return {
      eyeShine: n("eyeShine"),
      ahogeVariety: n("ahogeVariety"),
      thighhighLayers: n("thighhighLayers"),
      skirtPhysics: n("skirtPhysics"),
      ahegaoIntensity: n("ahegaoIntensity"),
      hairHighlights: n("hairHighlights"),
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
    const n100 = (key: string, fallback: number) =>
      typeof x[key] === "number" ? clampForgeTabNum(x[key] as number, 0, 100) : fallback;
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
      genreCollider: n100("genreCollider", base.genreCollider),
      propStorm: n100("propStorm", base.propStorm),
      cursedPalette: n100("cursedPalette", base.cursedPalette),
      symmetryBreak: typeof x.symmetryBreak === "boolean" ? x.symmetryBreak : base.symmetryBreak,
      oopsAllTropes: typeof x.oopsAllTropes === "boolean" ? x.oopsAllTropes : base.oopsAllTropes,
    };
  };

  const mergeExtended = (id: ForgeExtendedThemeTabId, o: unknown): ForgeExtendedLabFeatures => {
    const base = { ...d[id] };
    if (!o || typeof o !== "object") return base;
    const x = o as Record<string, unknown>;
    const n = (k: keyof ForgeExtendedLabFeatures) =>
      k === "loreWhisper"
        ? typeof x.loreWhisper === "string"
          ? x.loreWhisper.slice(0, 400)
          : base.loreWhisper
        : typeof x[k] === "number"
          ? clampForgeTabNum(x[k] as number, 0, 100)
          : base[k];
    return {
      voltage: n("voltage") as number,
      saturation: n("saturation") as number,
      gritVsPolish: n("gritVsPolish") as number,
      gloss: n("gloss") as number,
      motionWind: n("motionWind") as number,
      intimacyBias: n("intimacyBias") as number,
      worldWeirdness: n("worldWeirdness") as number,
      propLoad: n("propLoad") as number,
      loreWhisper: n("loreWhisper") as string,
    };
  };

  const extendedPart = Object.fromEntries(
    FORGE_EXTENDED_THEME_TAB_IDS.map((id) => [id, mergeExtended(id, r[id])]),
  ) as { [K in ForgeExtendedThemeTabId]: ForgeExtendedLabFeatures };

  return {
    anime: mergeAnime(r.anime),
    monster: mergeMonster(r.monster),
    gothic: mergeGothic(r.gothic),
    realistic: mergeRealistic(r.realistic),
    dark_fantasy: mergeDark(r.dark_fantasy),
    chaos: mergeChaos(r.chaos),
    ...extendedPart,
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
  return Object.fromEntries(FORGE_THEME_TABS.map((t) => [t.id, mergeOne(t.id, r[t.id])])) as Record<
    ForgeThemeTabId,
    ForgeTabSharedOverride
  >;
}

export function normalizeForgeThemeTabId(raw: unknown): ForgeThemeTabId {
  if (typeof raw === "string" && (ALL_FORGE_THEME_TAB_IDS as readonly string[]).includes(raw)) {
    return raw as ForgeThemeTabId;
  }
  return "anime";
}

// --- Select option pools (random + UI) ---

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

function fallenRisingLabel(v: ForgeDarkFantasyFeatures["fallenVsRising"]): string {
  return v === "fallen_angel" ? "fallen angel melancholy and tarnished grace" : "rising demon ambition and hungry heat";
}

export function buildForgeTabPromptAddon(o: {
  tabId: ForgeThemeTabId;
  features: ForgeTabFeatureMap[ForgeThemeTabId];
  effectiveBodyType: string;
  sexualEnergy: string;
  kinks: string[];
  cardPose: ForgeCardPoseId;
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
        `Genre collision ${intensityLabel(f.genreCollider)} — intentionally mash costume languages.`,
        `Prop storm ${intensityLabel(f.propStorm)} — extra accessories / set-dressing chaos (still SFW).`,
        `Palette sabotage ${intensityLabel(f.cursedPalette)} — discord metallics / hues vs safe harmony.`,
        f.symmetryBreak ? "Composition: subtle asymmetry — off-center framing, uneven shoulders, tilted horizon micro-tilt." : "Composition: mostly balanced framing.",
        f.oopsAllTropes ? "Meta: pile recognizable romance / villain / idol tropes into one overstuffed bouquet (playful, not messy text)." : "",
        f.whatTheFuckSeed > 0 ? `Creative salt: ${f.whatTheFuckSeed} (use to diverge from generic output).` : "",
      ]
        .filter(Boolean)
        .join(" ");
      break;
    }
    default: {
      if (isForgeExtendedThemeTab(o.tabId)) {
        const f = o.features as ForgeExtendedLabFeatures;
        themeProse = [
          `Theme lab — voltage & neon / synth tension ${intensityLabel(f.voltage)}.`,
          `Saturation & candy-vs-noir color ${intensityLabel(f.saturation)}.`,
          `Film grit vs polish ${intensityLabel(f.gritVsPolish)}.`,
          `Surface gloss & skin sheen ${intensityLabel(f.gloss)}.`,
          `Motion, wind, hair whip ${intensityLabel(f.motionWind)}.`,
          `Intimacy bias (close vs editorial) ${intensityLabel(f.intimacyBias)}.`,
          `World weirdness / genre bend ${intensityLabel(f.worldWeirdness)}.`,
          `Props & set-dressing load ${intensityLabel(f.propLoad)}.`,
          f.loreWhisper.trim() ? `Lore whisper: "${f.loreWhisper.trim().slice(0, 200)}".` : "",
        ]
          .filter(Boolean)
          .join(" ");
      } else {
        themeProse = "";
      }
      break;
    }
  }

  const kinkLine = o.kinks.length ? o.kinks.join(", ") : "none specified";
  const poseLine = forgeCardPoseProse(o.cardPose);
  return `Forge focus theme: "${tabLabel}" (high priority). ${themeProse} **Portrait pose (global):** ${poseLine} Shared anchors for this tab: physique "${o.effectiveBodyType}"; sexual energy "${o.sexualEnergy}"; kink undertones to weave into tension (subtle): ${kinkLine}. Fuse with the Personalities matrix, wardrobe lab, and scene into one coherent portrait and character.`;
}

export function forgeTabLiveSummary(tabId: ForgeThemeTabId): string {
  const t = FORGE_THEME_TABS.find((x) => x.id === tabId);
  if (!t) return "";
  const bits: Partial<Record<ForgeThemeTabId, string>> = {
    anime: "big-eye anime stylization, shine, pose presets",
    monster: "appendages, texture, wings, creature silhouette",
    gothic: "corsetry, lace, pallor, tragic glamour",
    realistic: "skin truth, softness, lived-in detail",
    dark_fantasy: "corruption, runes, aura, fallen vs rising",
    chaos: "hybrid weirdness, maximal variety",
    cyber_neon_syndicate: "HUD chrome, synth rain, hologram noir",
    starlit_siren_sci_fi: "constellation skin, ship-window glow",
    steampunk_velvet: "brass, velvet, cog jewelry, coal warmth",
    retro_pinup_heat: "mid-century sets, film grain, cheeky tease",
    iron_glory_apex: "arena lights, sweat sheen, power muscle",
    velvet_romance_soft: "candles, slow touch, whisper framing",
    horror_whisper_court: "elegant dread, porcelain stillness",
    feral_nature_covenant: "moss, rain, pagan predator grace",
    royal_sin_palace: "throne jewels, velvet cruelty, crown tension",
    neon_alley_predator: "wet asphalt, blade jewelry, hunt tension",
    celestial_fallen_halo: "tarnished gold, broken halo glam",
    infernal_high_table: "obsidian banquet, contract ink heat",
    abyssal_depth_siren: "biolume, drowned-palace seduction",
    grotesque_goddess_majesty: "monstrous glam, crowned weird beauty",
  };
  const bit = bits[tabId] ?? "theme lab sliders + lore whisper";
  return `Active: ${t.label} — ${bit}. These notes merge into your preview prompt and Extra notes.`;
}

// --- Randomizers ---

function rand100(): number {
  return Math.floor(Math.random() * 101);
}

export function randomizeForgeTabFeatures(tab: ForgeThemeTabId, mode: "normal" | "chaos_wtf"): ForgeTabFeatureMap[ForgeThemeTabId] {
  if (tab === "anime") {
    return {
      eyeShine: rand100(),
      ahogeVariety: rand100(),
      thighhighLayers: rand100(),
      skirtPhysics: rand100(),
      ahegaoIntensity: rand100(),
      hairHighlights: rand100(),
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
  if (isForgeExtendedThemeTab(tab)) {
    return {
      voltage: mode === "chaos_wtf" ? Math.max(45, rand100()) : rand100(),
      saturation: mode === "chaos_wtf" ? Math.max(50, rand100()) : rand100(),
      gritVsPolish: rand100(),
      gloss: rand100(),
      motionWind: rand100(),
      intimacyBias: rand100(),
      worldWeirdness: mode === "chaos_wtf" ? Math.max(55, rand100()) : rand100(),
      propLoad: mode === "chaos_wtf" ? Math.max(50, rand100()) : rand100(),
      loreWhisper:
        mode === "chaos_wtf"
          ? pick(FORGE_EXTENDED_LORE_WHISPERS)
          : Math.random() < 0.35
            ? pick(FORGE_EXTENDED_LORE_WHISPERS)
            : "",
    };
  }
  if (tab === "chaos") {
    if (mode === "chaos_wtf") {
      return {
        garbagePailGrotesque: Math.random() < 0.65,
        maxDegeneracy: Math.random() < 0.55,
        bodyHorrorCuteBlend: rand100(),
        randomizerPower: Math.max(70, rand100()),
        whatTheFuckSeed: Math.floor(Math.random() * 9_000_000) + 1_000_000,
        genreCollider: Math.max(55, rand100()),
        propStorm: Math.max(50, rand100()),
        cursedPalette: Math.max(45, rand100()),
        symmetryBreak: Math.random() < 0.62,
        oopsAllTropes: Math.random() < 0.48,
      };
    }
    return {
      garbagePailGrotesque: Math.random() < 0.25,
      maxDegeneracy: Math.random() < 0.2,
      bodyHorrorCuteBlend: rand100(),
      randomizerPower: rand100(),
      whatTheFuckSeed: Math.random() < 0.3 ? Math.floor(Math.random() * 9_000_000) + 1 : 0,
      genreCollider: rand100(),
      propStorm: rand100(),
      cursedPalette: rand100(),
      symmetryBreak: Math.random() < 0.35,
      oopsAllTropes: Math.random() < 0.28,
    };
  }
  return randomizeForgeTabFeatures("anime", mode);
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
    if (isForgeExtendedThemeTab(tab) && fieldKey === "loreWhisper") {
      c[fieldKey] = pick([...FORGE_EXTENDED_LORE_WHISPERS]);
      return c as ForgeTabFeatureMap[ForgeThemeTabId];
    }
    if (tab === "monster" && fieldKey === "hornConfig") c[fieldKey] = pick([...FORGE_MONSTER_HORN_OPTIONS]);
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
  cyber_neon_syndicate: {
    artStyle: "Cyberpunk Neon",
    sceneAtmosphere: "Rain-Slick Rooftop With Hologram Sky",
    visualTailoringPatch: { outfitStyle: "Tech harness streetwear", colorPalette: "Cyan + magenta + black" },
  },
  starlit_siren_sci_fi: {
    artStyle: "Soft Sci-Fi Illustration",
    sceneAtmosphere: "Observation Deck Stars",
    visualTailoringPatch: { outfitStyle: "Flowing zero-g silks", colorPalette: "Silver + deep violet" },
  },
  steampunk_velvet: {
    artStyle: "Steampunk Portrait",
    sceneAtmosphere: "Brass Atrium With Gear Windows",
    visualTailoringPatch: { outfitStyle: "Corset over boilersuit", colorPalette: "Brass + burgundy" },
  },
  retro_pinup_heat: {
    artStyle: "Vintage Pin-Up",
    sceneAtmosphere: "Pastel Studio Cyclorama",
    visualTailoringPatch: { outfitStyle: "High-waist retro glam", colorPalette: "Cherry red + cream" },
  },
  iron_glory_apex: {
    artStyle: "Sports Noir Realism",
    sceneAtmosphere: "Arena Tunnel Rim Light",
    visualTailoringPatch: { outfitStyle: "Athletic compression + tape", colorPalette: "Sweat sheen + steel blue" },
  },
  velvet_romance_soft: {
    artStyle: "Romantic Oil Study",
    sceneAtmosphere: "Candlelit Drawing Room",
    visualTailoringPatch: { outfitStyle: "Silk slip and robe", colorPalette: "Rose smoke + gold" },
  },
  horror_whisper_court: {
    artStyle: "Gothic Horror Glam",
    sceneAtmosphere: "Marble Gallery After Hours",
    visualTailoringPatch: { outfitStyle: "Victorian mourning chic", colorPalette: "Bone white + dried blood" },
  },
  feral_nature_covenant: {
    artStyle: "Fantasy Nature Portrait",
    sceneAtmosphere: "Moss Temple Ruins",
    visualTailoringPatch: { outfitStyle: "Primitive luxe wraps", colorPalette: "Forest green + amber" },
  },
  royal_sin_palace: {
    artStyle: "Baroque Fantasy",
    sceneAtmosphere: "Throne Antechamber",
    visualTailoringPatch: { outfitStyle: "Regal armor-gown hybrid", colorPalette: "Gold leaf + ink black" },
  },
  neon_alley_predator: {
    artStyle: "Neo-Noir",
    sceneAtmosphere: "Wet Alley Neon Bounce",
    visualTailoringPatch: { outfitStyle: "Leather and chain mesh", colorPalette: "Teal + hot pink" },
  },
  celestial_fallen_halo: {
    artStyle: "Angelic Fantasy",
    sceneAtmosphere: "Broken Cloud Stair",
    visualTailoringPatch: { outfitStyle: "Tarnished celestial silks", colorPalette: "Pale gold + bruised violet" },
  },
  infernal_high_table: {
    artStyle: "Infernal Baroque",
    sceneAtmosphere: "Obsidian Banquet Hall",
    visualTailoringPatch: { outfitStyle: "Infernal couture", colorPalette: "Crimson + soot" },
  },
  abyssal_depth_siren: {
    artStyle: "Bioluminescent Fantasy",
    sceneAtmosphere: "Sunken Palace Balcony",
    visualTailoringPatch: { outfitStyle: "Pearl net and scales", colorPalette: "Teal biolume + abyss blue" },
  },
  grotesque_goddess_majesty: {
    artStyle: "Monstrous Glam Illustration",
    sceneAtmosphere: "Cathedral Of Wrong Angles",
    visualTailoringPatch: { outfitStyle: "Grotesque crown regalia", colorPalette: "Sickly pearl + void black" },
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

const LORE_WHISPER_SELECT_OPTIONS = ["", ...FORGE_EXTENDED_LORE_WHISPERS] as const;
const LORE_WHISPER_SELECT_LABELS = ["(none)", ...FORGE_EXTENDED_LORE_WHISPERS] as const;

/** Shared Theme Lab rows for all extended (14) forge tabs. */
const FORGE_EXTENDED_THEME_FIELD_ROWS: readonly ForgeThemeFieldRow[] = [
  { section: "Theme lab", key: "voltage", label: "Voltage / neon tension", hint: "Synth energy and hot highlights.", kind: "slider" },
  { key: "saturation", label: "Color saturation", hint: "Candy pop vs desaturated noir.", kind: "slider" },
  { key: "gritVsPolish", label: "Grit vs polish", hint: "Film grain / wear vs glassy perfection.", kind: "slider" },
  { key: "gloss", label: "Surface gloss", hint: "Skin sheen, latex shine, wet reads.", kind: "slider" },
  { key: "motionWind", label: "Motion & wind", hint: "Hair, cloth, particles in motion.", kind: "slider" },
  { key: "intimacyBias", label: "Intimacy bias", hint: "Close breath vs editorial distance.", kind: "slider" },
  { key: "worldWeirdness", label: "World weirdness", hint: "Genre bend and surreal set cues.", kind: "slider" },
  { key: "propLoad", label: "Prop & set load", hint: "Accessories and environment density.", kind: "slider" },
  {
    key: "loreWhisper",
    label: "Lore whisper",
    hint: "Tiny story flavor stitched into prompts.",
    kind: "select",
    selectOptions: [...LORE_WHISPER_SELECT_OPTIONS],
    selectLabels: [...LORE_WHISPER_SELECT_LABELS],
  },
];

const FORGE_TAB_FIELD_ROWS_CORE = {
  anime: [
    { section: "Face & hair", key: "eyeShine", label: "Eye size & shine", hint: "Higher = bigger anime eyes and glossier highlights.", kind: "slider" },
    { key: "ahogeVariety", label: "Ahoge / stray locks", hint: "Silly hair antenna energy.", kind: "slider" },
    { key: "hairHighlights", label: "Streaks & highlights", hint: "Ribbon streaks and secondary hair colors.", kind: "slider" },
    { section: "Wardrobe physics", key: "thighhighLayers", label: "Thigh-high layers", hint: "Stacked hosiery and accessories on legs.", kind: "slider" },
    { key: "skirtPhysics", label: "Skirt motion", hint: "Pleats, lift, and exaggerated cloth motion.", kind: "slider" },
    { section: "Expression", key: "ahegaoIntensity", label: "Exaggerated face play", hint: "Cartoon intensity (SFW card — no explicit acts).", kind: "slider" },
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
    { key: "symmetryBreak", label: "Asymmetric framing", hint: "Tilted horizon, off-center weight, uneven shoulders.", kind: "toggle" },
    { key: "oopsAllTropes", label: "Trope overload", hint: "Stack romance / villain / idol clichés on purpose.", kind: "toggle" },
    { section: "Sliders", key: "bodyHorrorCuteBlend", label: "Cute vs body-horror tension", kind: "slider" },
    { key: "randomizerPower", label: "Rule-breaking strength", kind: "slider" },
    { key: "genreCollider", label: "Genre mash intensity", hint: "Collide costume languages from different eras.", kind: "slider" },
    { key: "propStorm", label: "Prop / accessory storm", kind: "slider" },
    { key: "cursedPalette", label: "Palette sabotage", hint: "Clashing metals and hues vs safe harmony.", kind: "slider" },
    {
      key: "whatTheFuckSeed",
      label: "Chaos salt",
      hint: "Optional number to diverge prompts, or use Wild roll.",
      kind: "numberInput",
      sliderMin: 0,
      sliderMax: 9_999_999,
    },
  ],
} as const satisfies Record<ForgeCoreThemeTabId, readonly ForgeThemeFieldRow[]>;

export const FORGE_TAB_FIELD_ROWS: Record<ForgeThemeTabId, readonly ForgeThemeFieldRow[]> = {
  ...(FORGE_TAB_FIELD_ROWS_CORE as unknown as Record<ForgeCoreThemeTabId, readonly ForgeThemeFieldRow[]>),
  ...Object.fromEntries(
    FORGE_EXTENDED_THEME_TAB_IDS.map((id) => [id, FORGE_EXTENDED_THEME_FIELD_ROWS]),
  ),
} as Record<ForgeThemeTabId, readonly ForgeThemeFieldRow[]>;
