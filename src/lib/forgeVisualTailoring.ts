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
  "Bioluminescent markings",
  "Runic sigils",
  "Crystalline inlays",
  "Solar shimmer",
  "Galaxy freckles",
  "Arcane halo",
] as const;

/** Pick this so prompts don’t lock clothing to a fixed duo — the image model infers hues from era, personality, scene, and art style. */
export const FORGE_PALETTE_FORGE_DECIDES = "Let the forge choose (open palette)" as const;

export const FORGE_OUTFIT_STYLES = [
  "Bikini",
  "Lingerie",
  "Evening gown",
  "Cocktail dress",
  "Casual streetwear",
  "Y2K / early-2000s glam",
  "Coastal linen resort",
  "Fantasy robes",
  "Battle armor",
  "Leather harness couture",
  "Cyberwear",
  "Synthwave clubwear",
  "Gothic corsetry",
  "Victorian bustle silhouette",
  "Athleisure",
  "Ballet-core wrap layers",
  "Royal court attire",
  "Military dress uniform",
  "Desert wanderer wraps",
  "Nomad layered scarves",
  "Swim cover-up",
  "Sheer overlay + structured underlayer",
  "Kimono-inspired drape",
  "Sari-inspired drape",
  "Tuxedo / androgynous formal",
  "Punk patched denim",
  "Grunge oversized knits",
  "Cottagecore floral layers",
  "Dark academia knit + pleats",
  "Art-deco beaded column",
  "Film-noir trench + slip",
  "Circus / show costume",
  "Rave mesh + UV accents",
  "Boho fringe + coins",
  "Preppy pleated skirt set",
  "Western fringe + suede",
  "Tactical techwear",
  "Latex-look structured panels",
  "Velvet evening separates",
  "Chain-mail accent fashion",
  "Priestess ceremonial layers",
  "Space-opera uniform",
  "Steampunk brass + leather",
  "Fairy-core petal petals",
  "Mermaid-scale iridescent",
  "Ice-queen crystalline trims",
  "Jungle explorer utility",
  "Minimalist architectural cut",
  /* Theme-tab / premium seeds (must stay in pool so normalize + stash preserve them) */
  "Primitive luxe wraps",
  "Silk slip and collar-chain fashion",
  "Chitin-gloss couture",
  "Tarnished celestial silks",
  "Flowing zero-g silks",
  "Infernal couture",
  "Pearl net and scales",
  "Tech harness streetwear",
  "Botanical couture vines",
  "Victorian mourning chic",
  "Athletic compression + tape",
  "Structured latex-look couture",
  "Crown regalia with tentacle-motif jewelry",
  "Grotesque crown regalia",
  "Evening dress",
] as const;

export const FORGE_COLOR_PALETTES = [
  FORGE_PALETTE_FORGE_DECIDES,
  "Noir + crimson accent",
  "Charcoal + blood red",
  "Teal + rose gold",
  "Peacock teal + antique brass",
  "Ivory + champagne",
  "Cream + soft cocoa",
  "Ultraviolet + black",
  "Electric violet + graphite",
  "Forest green + copper",
  "Moss + rust",
  "Neon magenta + cyan",
  "Hot pink + electric blue",
  "Muted earth tones",
  "Sand + terracotta",
  "Monochrome silver",
  "Pearl grey + steel",
  "Sapphire + silver",
  "Ruby + onyx",
  "Emerald + gold filigree",
  "Amber + espresso",
  "Lilac + smoke grey",
  "Dusty rose + mauve",
  "Blush + champagne gold",
  "Butter yellow + sage",
  "Mint + sea glass",
  "Turquoise + coral",
  "Indigo + wheat",
  "Wine + dusty pink",
  "Plum + antique gold",
  "Oxblood + bone",
  "Ice blue + white",
  "Glacier blue + navy",
  "Sunset orange + plum",
  "Tangerine + chocolate",
  "Lemon + slate",
  "Lime zest + charcoal",
  "Kelly green + cream",
  "Jade + blush",
  "Fuchsia + black",
  "Bubblegum + lavender",
  "Periwinkle + buttercream",
  "Powder blue + rose",
  "Sky blue + camel",
  "Denim blue + rust",
  "Navy + copper rivet",
  "Slate + copper",
  "Stone + olive",
  "Taupe + burgundy",
  "Greige + soft black",
  "White + single bold accent (pick hue from scene)",
  "Triad: cyan + magenta + deep violet (clothing only)",
  "Triad: amber + teal + wine (rich, not neon)",
  "Metallic gold + matte black",
  "Chrome + white",
  "Bronze + midnight blue",
  "Gunmetal + wine",
  "Copper patina + cream",
  "Iridescent oil-slick (subtle, fashion)",
  "Holographic trim + neutral base",
  "Biolume aqua + abyss purple",
  "UV-reactive accents + black base",
  "Pastel cloud (lavender, mint, peach — soft)",
  "Candy gradient (two hues, tasteful)",
  "Jewel-tone clash (emerald + amethyst — editorial)",
  "Winter frost (ice, silver birch, pale blue)",
  "Autumn leaf (rust, mustard, plum)",
  "Spring garden (soft green, petal pink, butter)",
  "Desert dusk (dusty rose, sand, bruised plum)",
  "High-contrast editorial (one neutral + one shock accent)",
  "Low-contrast tonal (single hue, three shades)",
  "Sepia + ink (vintage print)",
  "Newsprint + red accent",
  "Forest green + amber",
  "Rose smoke + gold",
  "Teal biolume + abyss blue",
  "Pale gold + bruised violet",
  "Silver + deep violet",
  "Crimson + soot",
  "Cyan + magenta + black",
  "Emerald + pollen gold",
  "Bone white + dried blood",
  "Sweat sheen + steel blue",
  "Onyx + chrome highlight",
  "Sickly pearl + void black",
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
  "Mary Janes / ballet flats",
  "Platform boots",
  "Wedge sandals",
  "Riding boots",
  "Tabi / split-toe boots",
  "Crystal heels (fantasy)",
  "Wrapped ankle ties",
  "Mud boots / utilitarian",
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
  "Opera gloves",
  "Body chain",
  "Nose chain / bridge jewelry",
  "Arm cuffs",
  "Anklet stack",
  "Brooch at sternum",
  "Single dramatic ear cuff",
  "Silk scarf at throat",
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
  outfitStyle: FORGE_OUTFIT_STYLES[4]!,
  /** Concrete default so new sessions still get a clear wardrobe anchor; use “Let the forge choose” in UI for open hues. */
  colorPalette: FORGE_COLOR_PALETTES[1]!,
  footwear: FORGE_FOOTWEAR[1]!,
  accessories: FORGE_ACCESSORIES[8]!,
};

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Palettes excluding the open option — random spin + curated dropdown group. */
export const FORGE_COLOR_PALETTES_CURATED = FORGE_COLOR_PALETTES.filter((p) => p !== FORGE_PALETTE_FORGE_DECIDES);

export function randomForgeVisualTailoring(): ForgeVisualTailoring {
  const n = 1 + Math.floor(Math.random() * 3);
  const feats = [...FORGE_SPECIAL_FEATURES].sort(() => Math.random() - 0.5).slice(0, n);
  const colorPalette =
    Math.random() < 0.16 ? FORGE_PALETTE_FORGE_DECIDES : pick(FORGE_COLOR_PALETTES_CURATED);
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
    colorPalette,
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

export function isForgePaletteOpen(palette: string): boolean {
  return palette.trim() === FORGE_PALETTE_FORGE_DECIDES;
}

function paletteInstructionForPrompt(palette: string): string {
  if (isForgePaletteOpen(palette)) {
    return "clothing colors: **open** — invent a harmonious scheme from era, personality, scene, art style, and skin/hair; do not force a rigid two-color formula unless the set demands it";
  }
  return `palette **${palette}** for garments and major accessories`;
}

export function forgeVisualTailoringSeedsProse(v: ForgeVisualTailoring, fp: ForgePersonalityProfile): string {
  const theme = deriveSmartOutfitTheme(fp, v.outfitStyle);
  const feat = v.specialFeatures.length ? v.specialFeatures.join(", ") : "(none selected)";
  const pal = paletteInstructionForPrompt(v.colorPalette);
  return [
    `- **Appearance lab:** ${v.height}; ${v.skinTone} skin; ${v.hairColor} ${v.hairStyle}; ${v.eyeColor} eyes; bust ${v.breastSize}; hips/glutes ${v.assSize}; special surface details: ${feat}.`,
    `- **Outfit & palette:** ${v.outfitStyle} — ${theme}`,
    `- **Color / shoes / extras:** ${pal}; footwear ${v.footwear}; accessories ${v.accessories}.`,
  ].join("\n");
}

/** Dense single paragraph for Imagine portrait composition. */
export function forgeVisualPortraitAddon(v: ForgeVisualTailoring, fp: ForgePersonalityProfile): string {
  const theme = deriveSmartOutfitTheme(fp, v.outfitStyle);
  const feat = v.specialFeatures.length ? v.specialFeatures.join(", ") : "none";
  const pal = paletteInstructionForPrompt(v.colorPalette);
  return `Wardrobe & figure: ${v.height}; ${v.skinTone} skin; ${v.hairColor} ${v.hairStyle}; ${v.eyeColor} eyes; bust ${v.breastSize}; hips/glutes ${v.assSize}; surface details: ${feat}. Costuming: ${v.outfitStyle} — ${theme}. ${pal.charAt(0).toUpperCase() + pal.slice(1)}. Footwear ${v.footwear}. Accessories ${v.accessories}.`;
}
