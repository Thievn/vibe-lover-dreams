/** Forge UI body types — grouped for Companion Creator; keep substrings aligned with `anatomyImageRules.ts` (Edge). */

const HUMANOID_REALISTIC = [
  "Average Build",
  "Tall & Statuesque",
  "Petite & Delicate",
  "Curvy & Voluptuous",
  "Muscular & Athletic",
  "Slim & Toned",
  "Plus-Size & Soft",
  "Androgynous",
] as const;

const STATURE_SCALE = [
  "Little Person / Midget",
  "Short Stature",
  "Tiny & Doll-like",
  "Pixie-Sized",
  "Giantess",
  "Micro / Tiny Body",
  "Giant Body",
  "Kaiju-Scale Humanoid",
] as const;

const MOBILITY_MOD = [
  "Amputee / Wheelchair User",
  "One-Legged",
  "One-Armed",
  "Double Amputee",
  "Cybernetic Limb Replacement",
  "Prosthetic Beauty",
] as const;

const ANTHRO_ANIMAL = [
  "Furry / Anthro",
  "Wolf-Anthro",
  "Feline-Anthro",
  "Monster Girl / Boy",
  "Werewolf Hybrid",
] as const;

const FANTASY_SPECIES = [
  "Elf-Eared & Slender",
  "Orc-Built & Powerful",
  "Orc / Goblinoid",
  "Troll",
  "Ogre-Sized",
  "Demon-Tailed",
  "Angel-Winged",
  "Succubus Curves",
  "Incubus Physique",
  "Satyr / Faun",
  "Minotaur-Inspired",
  "Dragon-Scaled",
] as const;

const HYBRID_FORMS = [
  "Tentacle Hybrid",
  "Mermaid Lower Body",
  "Centaur Lower Body",
  "Avian / Harpy",
  "Serpent / Naga",
  "Insectoid",
  "Arachnid",
  "Reverse Centaur",
] as const;

const OTHERWORLDLY = [
  "Living Doll",
  "Inflatable / Squishy",
  "Goo / Slime Body",
  "Crystal / Gemstone Skin",
  "Ghostly Translucent",
  "Latex / Shiny Skin",
  "Melting Wax Figure",
  "Shadow Creature",
  "Plant-Based / Vine-Covered",
  "Floating Levitating Body",
  "Mechanical Cyborg",
  "Holographic / Glitch Body",
  "Stone / Marble Statue",
  "Fire Elemental Glow",
  "Ice Elemental Frost",
  "Neon Wireframe",
  "Skeleton-kin (Stylized)",
  "Wraith / Specter",
  "Golem / Warforged",
  "Clockwork Automaton",
  "Ash / Ember Skin",
  "Lightning-Touched",
  "Water-Formed",
] as const;

const HYPER_SHAPE = [
  "Hyper-Feminine",
  "Hyper-Masculine",
  "Hyper-Breasted",
  "Hyper-Ass",
  "Hyper-Thicc",
  "Hourglass Extreme",
] as const;

/** Flat list (union source for `ForgeBodyType`). */
export const FORGE_BODY_TYPES = [
  ...HUMANOID_REALISTIC,
  ...STATURE_SCALE,
  ...MOBILITY_MOD,
  ...ANTHRO_ANIMAL,
  ...FANTASY_SPECIES,
  ...HYBRID_FORMS,
  ...OTHERWORLDLY,
  ...HYPER_SHAPE,
] as const;

export type ForgeBodyType = (typeof FORGE_BODY_TYPES)[number];

/** UI: category id, label, ordered body types in that bucket. */
export const FORGE_BODY_GROUPS: readonly {
  id: string;
  label: string;
  types: readonly ForgeBodyType[];
}[] = [
  { id: "humanoid", label: "Humanoid & realistic", types: HUMANOID_REALISTIC },
  { id: "stature", label: "Stature & scale", types: STATURE_SCALE },
  { id: "mobility", label: "Mobility & prosthetics", types: MOBILITY_MOD },
  { id: "anthro", label: "Anthro & monster-person", types: ANTHRO_ANIMAL },
  { id: "fantasy", label: "Fantasy species", types: FANTASY_SPECIES },
  { id: "hybrid", label: "Hybrid & multi-form", types: HYBRID_FORMS },
  { id: "otherworldly", label: "Elemental, construct & surreal", types: OTHERWORLDLY },
  { id: "hyper", label: "Hyper shape", types: HYPER_SHAPE },
];

/** MASSIVE Art Styles List */
export const STYLIZED_ART_STYLES_FOR_ANATOMY = [
  // Realistic / Cinematic
  "Photorealistic",
  "Hyper-Realistic",
  "Cinematic Photography",
  "Moody Cinematic",
  "Studio Portrait Photography",
  "Dark Moody Realism",
  "Film Noir",
  "High Fashion Editorial",

  // Fantasy & Artistic
  "Dark Fantasy Art",
  "Gothic Victorian",
  "Dramatic Baroque",
  "Baroque Portrait",
  "Fantasy Illustration",
  "Oil Painting",
  "Digital Oil Painting",
  "Watercolor Painting",
  "Surreal Dreamscape",
  "Grunge Aesthetic",
  "Neon Noir",

  // Anime / Stylized
  "Anime",
  "Anime Style",
  "Manga Style",
  "Cyber-goth Anime",
  "Pixel Art",
  "Low-poly Stylized",
  "Chibi",
  "Ghibli Style",

  // Digital & Modern
  "Neon Cyberpunk",
  "Neon Airbrush",
  "Digital Painting",
  "Glitch Art",
  "Vaporwave",
  "Synthwave",
  "Cyberpunk 2077 Style",
  "Retro 80s",

  // Extreme / Wild
  "Latex Fetish Style",
  "Body Horror",
  "Erotic Horror",
  "Dark Erotic Art",
  "Pinup Art",
  "Boudoir Photography",
  "Sensual Fantasy",
  "Erotic Comic Book",
  "Hentai Style",
  "Yaoi Style",
  "Yuri Style",
  "Goth Lolita",
] as const;

export type StylizedArtStyle = (typeof STYLIZED_ART_STYLES_FOR_ANATOMY)[number];

// Legacy mapping for backward compatibility
const LEGACY_BODY_TO_FORGE: Record<string, ForgeBodyType> = {
  slim: "Slim & Toned",
  athletic: "Muscular & Athletic",
  curvy: "Curvy & Voluptuous",
  thick: "Plus-Size & Soft",
  petite: "Petite & Delicate",
  tall: "Tall & Statuesque",
  muscular: "Muscular & Athletic",
  "plus-size": "Plus-Size & Soft",
  soft: "Plus-Size & Soft",
  androgynous: "Androgynous",
  "hyper-feminine": "Hyper-Feminine",
  "hyper-masculine": "Hyper-Masculine",
};

export function normalizeForgeBodyType(input: string): ForgeBodyType {
  const t = input.trim();
  if ((FORGE_BODY_TYPES as readonly string[]).includes(t)) return t as ForgeBodyType;

  const key = t.toLowerCase();
  if (LEGACY_BODY_TO_FORGE[key]) return LEGACY_BODY_TO_FORGE[key];

  for (const f of FORGE_BODY_TYPES) {
    if (f.toLowerCase().includes(key) || key.includes(f.toLowerCase())) {
      return f;
    }
  }
  return "Average Build";
}

/** Default category id for a body type (for grouped picker). */
export function forgeBodyCategoryIdForType(bodyType: string): string {
  const t = normalizeForgeBodyType(bodyType);
  for (const g of FORGE_BODY_GROUPS) {
    if ((g.types as readonly string[]).includes(t)) return g.id;
  }
  return "humanoid";
}

export function inferForgeBodyTypeFromTags(tags: string[]): ForgeBodyType | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  for (const b of FORGE_BODY_TYPES) {
    const bl = b.toLowerCase();
    if (blob.includes(bl)) return b;
  }
  return undefined;
}

export function inferStylizedArtFromTags(tags: string[]): string | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  for (const s of STYLIZED_ART_STYLES_FOR_ANATOMY) {
    if (blob.includes(s.toLowerCase())) return s;
  }
  return undefined;
}
