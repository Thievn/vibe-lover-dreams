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

/**
 * Infer forge body type from tags. Matches partial phrases (e.g. "little person" alone)
 * so we still resolve stature when the full UI label was not copied into tags.
 */
export function inferForgeBodyTypeFromTags(tags: string[]): ForgeBodyType | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  if (
    /\blittle person\b|\bmidget\b|\bshort stature\b|\bshort-stature\b|\bachondroplasia\b/i.test(blob) ||
    (/\bdwarf\b/i.test(blob) && !/\bdragon\b/i.test(blob) && !/\b(dwarven|dwarf\s+lord)\b/i.test(blob))
  ) {
    return "Little Person / Midget";
  }
  if (/\bwheelchair\b|\bamputee\b|\bone-legged\b|\bone-armed\b|\bdouble amputee\b/i.test(blob)) {
    const hit = FORGE_BODY_TYPES.find((b) => /amputee|wheelchair|one-legged|one-armed|double amputee/i.test(b));
    if (hit) return hit;
  }
  for (const b of FORGE_BODY_TYPES) {
    const bl = b.toLowerCase();
    if (blob.includes(bl)) return b;
  }
  return undefined;
}

/** Same heuristics as tags, for chat image gen when tags omit the forge label. */
export function inferForgeBodyTypeFromAppearance(appearance: string | null | undefined): ForgeBodyType | undefined {
  if (!appearance?.trim()) return undefined;
  return inferForgeBodyTypeFromTags([appearance]);
}

export function inferStylizedArtFromTags(tags: string[]): string | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  for (const s of STYLIZED_ART_STYLES_FOR_ANATOMY) {
    if (blob.includes(s.toLowerCase())) return s;
  }
  return undefined;
}

/**
 * Forge labels where **scale / stature** must be the dominant physical read — not a detail tacked on after a generic body.
 * Everything else (species, fashion, scene) themes around this.
 */
const COMPACT_STATURE_FORGE_TYPES: readonly string[] = [
  "Little Person / Midget",
  "Short Stature",
  "Tiny & Doll-like",
  "Pixie-Sized",
  "Micro / Tiny Body",
];

export function isCompactStatureForgeBodyType(bodyType: string): boolean {
  const t = normalizeForgeBodyType(bodyType);
  return (COMPACT_STATURE_FORGE_TYPES as readonly string[]).includes(t);
}

/** True when the UI label or free text implies compact / short-stature emphasis (includes forge picks + loose phrases). */
export function bodyTypeNeedsCompactStatureEmphasis(bodyType: string): boolean {
  if (isCompactStatureForgeBodyType(bodyType)) return true;
  const t = bodyType.trim().toLowerCase();
  return (
    t.includes("little person") ||
    t.includes("midget") ||
    (t.includes("dwarf") && !t.includes("dragon")) ||
    t.includes("short stature") ||
    t.includes("pixie-sized") ||
    t.includes("doll-like") ||
    t.includes("micro / tiny")
  );
}

/**
 * Paragraph for Grok forge prompts (design lab / roulette). Empty when not compact stature.
 */
export function forgeCompactStatureInstruction(bodyType: string): string {
  if (!isCompactStatureForgeBodyType(bodyType)) return "";
  return `BODY TYPE IS THE MAIN CHARACTER (read first — non-negotiable):
The forge choice "${bodyType}" is the **primary physical identity** — not a flavor tag. Lead appearance, image_prompt, and any scene with **scale first**: limb length vs torso, head-to-body ratio, how hands and shoulders read against chairs, bars, door frames, clothing drape, or another figure. Personality, species, kinks, and aesthetic **orbit this body**; they must never steer the reader toward a default average-height human or runway proportions. Forbidden: a "beautiful stranger" description that could be any tall adult with one line about height. Required: unmistakable **adult** compact / short-stature proportions (respectful wording) so the silhouette cannot be mistaken for generic unnamed human build.

`;
}

/**
 * Extra language for Imagine portrait prompts — single authoritative line extension.
 */
export function forgePortraitStatureEmphasis(bodyType: string): string {
  if (!bodyTypeNeedsCompactStatureEmphasis(bodyType)) return "";
  return " Stature is the hero of this image: three-quarter or full-body framing so scale is obvious (furniture, counter height, door rail, another figure, or handheld object for hand-size read). Adult with compact proportions per forge body type — not a child, not average-height model legs; wardrobe and pose reinforce short-stature / little-person read; do not render a generic tall-human silhouette.";
}

const BODY_TYPE_LOCK_HEAD =
  'EXTREMELY IMPORTANT — BODY TYPE LOCK: The character MUST match the forge body type below for silhouette, species, limb count, and proportions. Do NOT default to a generic tall human runway model, stock "beautiful stranger," or unrelated build. If any other prose in this prompt conflicts with the body type label, the body type wins.';

/**
 * Dense, Imagine-oriented contract for portrait / packshot prompts (Forge + edge `generate-image`).
 * Keep in sync with `supabase/functions/_shared/forgeBodyTypeContract.ts`.
 */
export function forgePortraitBodyTypeContract(bodyType: string): string {
  const bt = normalizeForgeBodyType(bodyType);
  const cat = forgeBodyCategoryIdForType(bt);
  const statureExtra = forgePortraitStatureEmphasis(bt).trim();

  const tailHumanoid = `Humanoid adult build matching "${bt}" — height, shoulder/hip ratio, musculature or softness must read as this label, not a different stock body.`;

  const tailStature = (() => {
    let s = `Scale and proportion are the dominant read for "${bt}" — use in-frame scale cues (furniture, doorway, bar, handheld prop, horizon, another figure) so the viewer cannot read this as an average-height default human.`;
    if (statureExtra) s += ` ${statureExtra}`;
    else if (/\b(Giantess|Giant Body|Kaiju)/i.test(bt)) {
      s += ` Show massive scale vs environment — limbs and mass clearly oversized; not a normal human with a wide-angle trick only.`;
    }
    return s;
  })();

  const tailMobility = `Respect "${bt}" with coherent adaptive anatomy — wheelchair, limb difference, or prosthetics as the label implies; dignified, accurate, not erased into a generic able-bodied silhouette.`;

  const tailAnthro = `Non-human anthropomorphic body for "${bt}" — species-appropriate skull/face, ears, fur/feathers/scales, tail placement, digitigrade or plantigrade stance as fits the label; limb count correct. Forbidden: a human cosplayer with minimal ears/tail only.`;

  const tailFantasy = `Fantasy-species anatomy for "${bt}" — horns, wings, tail, skin texture, ears, and silhouette must match the archetype, not a plain human with jewelry.`;

  const tailHybrid = `Hybrid / multi-region body for "${bt}" — correct junction between regions (e.g. centaur, naga, harpy, arachnid); all named segments visible and anatomically consistent; never collapse to human-only.`;

  const tailOther = `Non-standard or stylized body for "${bt}" — slime/gel mass, crystal planes, stone, wireframe, doll joints, elemental glow, etc.; keep a readable character silhouette without reverting to generic human skin unless the label is humanoid glam.`;

  const tailHyper = `Exaggerated proportions for "${bt}" — push the named exaggeration clearly and consistently; do not swap in a different trope (e.g. unrelated weight or species).`;

  const body =
    cat === "humanoid"
      ? tailHumanoid
      : cat === "stature"
        ? tailStature
        : cat === "mobility"
          ? tailMobility
          : cat === "anthro"
            ? tailAnthro
            : cat === "fantasy"
              ? tailFantasy
              : cat === "hybrid"
                ? tailHybrid
                : cat === "otherworldly"
                  ? tailOther
                  : cat === "hyper"
                    ? tailHyper
                    : tailHumanoid;

  return `${BODY_TYPE_LOCK_HEAD} Body type label: "${bt}". ${body}`;
}
