/** Forge UI Body Types — MASSIVE & WILD Edition */
export const FORGE_BODY_TYPES = [
  // Standard / Realistic
  "Average Build", "Tall & Statuesque", "Petite & Delicate", "Curvy & Voluptuous",
  "Muscular & Athletic", "Slim & Toned", "Plus-Size & Soft", "Androgynous",

  // Height & Stature Variants
  "Little Person / Midget", "Short Stature", "Tiny & Doll-like", "Giantess",

  // Disability & Modification
  "Amputee / Wheelchair User", "One-Legged", "One-Armed", "Double Amputee",
  "Cybernetic Limb Replacement", "Prosthetic Beauty",

  // Fantasy & Mythical
  "Elf-Eared & Slender", "Orc-Built & Powerful", "Demon-Tailed", "Angel-Winged",
  "Succubus Curves", "Incubus Physique", "Furry / Anthro", "Monster Girl / Boy",
  "Tentacle Hybrid", "Mermaid Lower Body", "Centaur Lower Body", "Dragon-Scaled",

  // Extreme & Out-of-Pocket
  "Living Doll", "Inflatable / Squishy", "Goo / Slime Body", "Crystal / Gemstone Skin",
  "Ghostly Translucent", "Latex / Shiny Skin", "Melting Wax Figure", "Shadow Creature",
  "Plant-Based / Vine-Covered", "Reverse Centaur", "Floating Levitating Body",
  "Mechanical Cyborg", "Holographic / Glitch Body", "Stone / Marble Statue",
  "Fire Elemental Glow", "Ice Elemental Frost", "Neon Wireframe",

  // Hyper & Fetish
  "Hyper-Feminine", "Hyper-Masculine", "Hyper-Breasted", "Hyper-Ass",
  "Hyper-Thicc", "Micro / Tiny Body", "Giant Body", "Hourglass Extreme",
] as const;

export type ForgeBodyType = (typeof FORGE_BODY_TYPES)[number];

/** MASSIVE Art Styles List */
export const STYLIZED_ART_STYLES_FOR_ANATOMY = [
  // Realistic / Cinematic
  "Photorealistic", "Hyper-Realistic", "Cinematic Photography", "Moody Cinematic",
  "Studio Portrait Photography", "Dark Moody Realism", "Film Noir", "High Fashion Editorial",

  // Fantasy & Artistic
  "Dark Fantasy Art", "Gothic Victorian", "Dramatic Baroque", "Baroque Portrait",
  "Fantasy Illustration", "Oil Painting", "Digital Oil Painting", "Watercolor Painting",
  "Surreal Dreamscape", "Grunge Aesthetic", "Neon Noir",

  // Anime / Stylized
  "Anime", "Anime Style", "Manga Style", "Cyber-goth Anime", "Pixel Art",
  "Low-poly Stylized", "Chibi", "Ghibli Style",

  // Digital & Modern
  "Neon Cyberpunk", "Neon Airbrush", "Digital Painting", "Glitch Art",
  "Vaporwave", "Synthwave", "Cyberpunk 2077 Style", "Retro 80s",

  // Extreme / Wild
  "Latex Fetish Style", "Body Horror", "Erotic Horror", "Dark Erotic Art",
  "Pinup Art", "Boudoir Photography", "Sensual Fantasy", "Erotic Comic Book",
  "Hentai Style", "Yaoi Style", "Yuri Style", "Goth Lolita",
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