/**
 * Companion Forge — Appearance & outfit seeds (stored in session stash + fed to design-lab / portrait prompt).
 */
import type { ForgePersonalityProfile } from "@/lib/forgePersonalityProfile";

export type ForgeVisualTailoring = {
  breastSize: string;
  assSize: string;
  hairStyle: string;
  hairColor: string;
  eyeColor: string;
  skinTone: string;
  height: string;
  specialFeatures: string[];
  outfitStyle: string;
  colorPalette: string;
  footwear: string;
  accessories: string;
};

export const FORGE_BREAST_SIZES = [
  "Flat / androgynous",
  "Petite",
  "Average",
  "Full",
  "Very full",
  "Voluptuous",
] as const;

export const FORGE_ASS_SIZES = [
  "Athletic / tight",
  "Average",
  "Round",
  "Curvy",
  "Very curvy",
] as const;

export const FORGE_HAIR_STYLES = [
  "Long straight",
  "Long wavy",
  "Long curly",
  "Bob",
  "Pixie cut",
  "Braided crown",
  "Undercut",
  "Twin tails",
  "Buzzed sides + long top",
  "Wild messy",
] as const;

export const FORGE_HAIR_COLORS = [
  "Jet black",
  "Warm brown",
  "Honey blonde",
  "Platinum",
  "Copper red",
  "Silver white",
  "Electric blue streaks",
  "Pastel pink tips",
  "Green fantasy dye",
  "White / pale fantasy",
] as const;

export const FORGE_EYE_COLORS = [
  "Deep brown",
  "Hazel",
  "Ice blue",
  "Emerald green",
  "Amber gold",
  "Violet fantasy",
  "Heterochromia (gold / black)",
  "Glowing cyber pupils",
] as const;

export const FORGE_SKIN_TONES = [
  "Porcelain fair",
  "Light olive",
  "Golden tan",
  "Deep brown",
  "Cool grey undertone",
  "Fantasy iridescent sheen",
  "Freckled sun-kissed",
] as const;

export const FORGE_HEIGHTS = [
  "Petite (under 5'2\")",
  "Compact 5'2\"–5'4\"",
  "Average 5'5\"–5'7\"",
  "Tall 5'8\"–5'11\"",
  "Statuesque 6'+",
  "Variable / shapeshifter",
] as const;

export const FORGE_SPECIAL_FEATURES = [
  "Freckles",
  "Tattoos",
  "Piercings",
  "Scars",
  "Fangs",
  "Horns",
  "Wings",
  "Tail",
  "Vitiligo pattern",
  "Heterochromia",
  "Elf ears",
  "Cybernetic lines",
] as const;

export const FORGE_OUTFIT_STYLES = [
  "Bikini",
  "Lingerie",
  "Evening dress",
  "Casual streetwear",
  "Fantasy robes",
  "Battle armor",
  "Cyberwear",
  "Gothic corsetry",
  "Athleisure",
  "Royal court attire",
  "Desert wanderer wraps",
  "Swim cover-up",
] as const;

export const FORGE_COLOR_PALETTES = [
  "Noir + crimson accent",
  "Teal + rose gold",
  "Ivory + champagne",
  "Ultraviolet + black",
  "Forest green + copper",
  "Neon magenta + cyan",
  "Muted earth tones",
  "Monochrome silver",
] as const;

export const FORGE_FOOTWEAR = [
  "Barefoot",
  "Strappy heels",
  "Combat boots",
  "Thigh-high boots",
  "Sandals",
  "Sneakers",
  "Fantasy greaves",
  "Stiletto pumps",
] as const;

export const FORGE_ACCESSORIES = [
  "Choker",
  "Layered chains",
  "Statement earrings",
  "Fingerless gloves",
  "Cape / cloak clasp",
  "Waist chain",
  "AR visor",
  "Circlet / tiara",
  "None / minimal",
] as const;

export const DEFAULT_FORGE_VISUAL_TAILORING: ForgeVisualTailoring = {
  breastSize: FORGE_BREAST_SIZES[2]!,
  assSize: FORGE_ASS_SIZES[1]!,
  hairStyle: FORGE_HAIR_STYLES[1]!,
  hairColor: FORGE_HAIR_COLORS[1]!,
  eyeColor: FORGE_EYE_COLORS[0]!,
  skinTone: FORGE_SKIN_TONES[1]!,
  height: FORGE_HEIGHTS[2]!,
  specialFeatures: [],
  outfitStyle: FORGE_OUTFIT_STYLES[3]!,
  colorPalette: FORGE_COLOR_PALETTES[0]!,
  footwear: FORGE_FOOTWEAR[1]!,
  accessories: FORGE_ACCESSORIES[8]!,
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export function randomForgeVisualTailoring(): ForgeVisualTailoring {
  const n = 1 + Math.floor(Math.random() * 3);
  const feats = [...FORGE_SPECIAL_FEATURES].sort(() => Math.random() - 0.5).slice(0, n);
  return {
    breastSize: pick(FORGE_BREAST_SIZES),
    assSize: pick(FORGE_ASS_SIZES),
    hairStyle: pick(FORGE_HAIR_STYLES),
    hairColor: pick(FORGE_HAIR_COLORS),
    eyeColor: pick(FORGE_EYE_COLORS),
    skinTone: pick(FORGE_SKIN_TONES),
    height: pick(FORGE_HEIGHTS),
    specialFeatures: feats,
    outfitStyle: pick(FORGE_OUTFIT_STYLES),
    colorPalette: pick(FORGE_COLOR_PALETTES),
    footwear: pick(FORGE_FOOTWEAR),
    accessories: pick(FORGE_ACCESSORIES),
  };
}

export function normalizeForgeVisualTailoring(raw: unknown): ForgeVisualTailoring {
  const d = { ...DEFAULT_FORGE_VISUAL_TAILORING };
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const str = (k: keyof ForgeVisualTailoring, pool: readonly string[]) => {
    const v = o[k];
    return typeof v === "string" && pool.includes(v) ? v : d[k];
  };
  let feats: string[] = d.specialFeatures;
  if (Array.isArray(o.specialFeatures)) {
    const pool = FORGE_SPECIAL_FEATURES as readonly string[];
    feats = o.specialFeatures.filter((x): x is string => typeof x === "string" && pool.includes(x));
  }
  return {
    breastSize: str("breastSize", FORGE_BREAST_SIZES),
    assSize: str("assSize", FORGE_ASS_SIZES),
    hairStyle: str("hairStyle", FORGE_HAIR_STYLES),
    hairColor: str("hairColor", FORGE_HAIR_COLORS),
    eyeColor: str("eyeColor", FORGE_EYE_COLORS),
    skinTone: str("skinTone", FORGE_SKIN_TONES),
    height: str("height", FORGE_HEIGHTS),
    specialFeatures: [...new Set(feats)].slice(0, 6),
    outfitStyle: str("outfitStyle", FORGE_OUTFIT_STYLES),
    colorPalette: str("colorPalette", FORGE_COLOR_PALETTES),
    footwear: str("footwear", FORGE_FOOTWEAR),
    accessories: str("accessories", FORGE_ACCESSORIES),
  };
}

/**
 * Smart outfit theme: same outfit *word* (e.g. Bikini) is re-costumed to match era + personality — never default modern beachwear in medieval etc.
 */
export function deriveSmartOutfitTheme(fp: ForgePersonalityProfile, outfitStyle: string): string {
  const era = fp.timePeriod.toLowerCase();
  const vibe = fp.personalityType.toLowerCase();
  const style = outfitStyle.trim();

  const base = `${style} — re-skinned for "${fp.timePeriod}" + "${fp.personalityType}" (still reads as ${style}, not a different garment class).`;

  if (era.includes("medieval") || era.includes("feudal") || era.includes("dark fantasy")) {
    return `${base} Use period materials: leather straps, hammered metal fittings, embroidered wool/linen, subtle rune stitching, cloak brooch — avoid modern elastic, plastic sport mesh, or contemporary mall swimwear.`;
  }
  if (era.includes("cyber") || era.includes("futuristic")) {
    return `${base} Use future materials: fiber panels, holo trim, conductive thread seams, climate mesh underlayers — avoid purely historical peasant cloth unless ironic to the character.`;
  }
  if (era.includes("victorian") || era.includes("gothic")) {
    return `${base} Use corsetry, lace layering, jet buttons, cameo jewelry, structured tailoring — gaslamp romance silhouette.`;
  }
  if (era.includes("ancient greece") || era.includes("egypt") || era.includes("mythology")) {
    return `${base} Use draped linens, bronze jewelry, laurel or ceremonial metal, sandal lacing — mythic glamour, not modern poolside.`;
  }
  if (era.includes("post-apocalyptic")) {
    return `${base} Use scavenged hardware, patched technical fabrics, dust-worn color story, practical strapping — still alluring, survival-chic.`;
  }
  if (era.includes("1980s")) {
    return `${base} Use retro-futurist glam: satin, power shoulders (tasteful), chrome accents, neon edge light — period-coded, not generic 2020s fast fashion.`;
  }
  if (vibe.includes("dominant") || vibe.includes("wild")) {
    return `${base} Push silhouette confidence: sharper lines, heavier metal accents, commanding stance props — still SFW portrait framing.`;
  }
  return `${base} Wardrobe reads premium and cohesive with the chosen world — no genre-breaking anachronisms.`;
}

export function forgeVisualTailoringSeedsProse(v: ForgeVisualTailoring, fp: ForgePersonalityProfile): string {
  const theme = deriveSmartOutfitTheme(fp, v.outfitStyle);
  const feat = v.specialFeatures.length ? v.specialFeatures.join(", ") : "(none selected)";
  return [
    `- **Appearance lab:** ${v.height}; ${v.skinTone} skin; ${v.hairColor} ${v.hairStyle}; ${v.eyeColor} eyes; bust ${v.breastSize}; hips/glutes ${v.assSize}; special surface details: ${feat}.`,
    `- **Outfit & palette:** ${v.outfitStyle} — ${theme}`,
    `- **Color / shoes / extras:** palette ${v.colorPalette}; footwear ${v.footwear}; accessories ${v.accessories}.`,
  ].join("\n");
}

/** Dense single paragraph for Imagine portrait composition. */
export function forgeVisualPortraitAddon(v: ForgeVisualTailoring, fp: ForgePersonalityProfile): string {
  const theme = deriveSmartOutfitTheme(fp, v.outfitStyle);
  const feat = v.specialFeatures.length ? v.specialFeatures.join(", ") : "none";
  return `Wardrobe & figure: ${v.height}; ${v.skinTone} skin; ${v.hairColor} ${v.hairStyle}; ${v.eyeColor} eyes; bust ${v.breastSize}; hips/glutes ${v.assSize}; surface details: ${feat}. Costuming: ${v.outfitStyle} — ${theme} Palette ${v.colorPalette}. Footwear ${v.footwear}. Accessories ${v.accessories}.`;
}
