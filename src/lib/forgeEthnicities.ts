/**
 * Companion Forge — ancestry / complexion presets for prompts and image pipelines.
 * Includes real-world regional umbrellas, specific heritages, tone-forward options, and fantasy labels.
 */

export const FORGE_ETHNICITY_ANY_LABEL = "Designer choice (any)" as const;

export type ForgeEthnicityGroup = {
  id: string;
  label: string;
  options: readonly string[];
};

export const FORGE_ETHNICITY_GROUPS: readonly ForgeEthnicityGroup[] = [
  {
    id: "open",
    label: "Open",
    options: [FORGE_ETHNICITY_ANY_LABEL],
  },
  {
    id: "umbrella",
    label: "Regional & diaspora (broad)",
    options: [
      "East Asian presentation",
      "South Asian presentation",
      "Southeast Asian presentation",
      "Central Asian presentation",
      "Southwest Asian & North African presentation",
      "Sub-Saharan African presentation",
      "European presentation",
      "Nordic presentation",
      "Mediterranean presentation",
      "Eastern European presentation",
      "Latin American presentation",
      "Caribbean presentation",
      "Indigenous Americas (broad)",
      "Pacific Islander presentation",
      "Australian Aboriginal presentation",
      "Mixed / multiracial presentation",
      "Global majority — unspecified blend",
    ],
  },
  {
    id: "heritage",
    label: "Heritage & culture (examples)",
    options: [
      "Japanese",
      "Korean",
      "Han Chinese",
      "Taiwanese",
      "Hong Kong Cantonese",
      "Filipino",
      "Vietnamese",
      "Thai",
      "Indonesian",
      "Malaysian",
      "Indian",
      "Pakistani",
      "Bangladeshi",
      "Sri Lankan",
      "Nepali",
      "Nigerian",
      "Ethiopian",
      "Kenyan",
      "Ghanaian",
      "South African",
      "Egyptian",
      "Moroccan",
      "Amazigh (Berber)",
      "Levantine Arab",
      "Gulf Arab",
      "Persian (Iranian)",
      "Kurdish",
      "Turkish",
      "Armenian",
      "Greek",
      "Italian",
      "Irish",
      "German",
      "Polish",
      "Ukrainian",
      "Russian",
      "French",
      "British",
      "Spanish",
      "Portuguese",
      "Brazilian",
      "Mexican",
      "Colombian",
      "Dominican",
      "Cuban",
      "Puerto Rican",
      "Peruvian",
      "Venezuelan",
      "Haitian",
      "Jamaican",
      "African American",
      "Afro-Caribbean American",
      "Ashkenazi Jewish",
      "Sephardi & Mizrahi Jewish",
      "Romani",
      "Hmong",
      "Tibetan",
      "Mongolian",
      "Pashtun",
      "Somali",
      "Igbo",
      "Yoruba",
      "Zulu",
      "Maori",
      "Samoan",
      "Native Hawaiian",
      "Navajo / Diné",
      "Ojibwe / Anishinaabe",
      "Lakota / Sioux",
      "Inuit / circumpolar Indigenous",
    ],
  },
  {
    id: "tone",
    label: "Complexion-forward (agnostic)",
    options: [
      "Deep brown skin",
      "Rich dark brown skin",
      "Brown skin",
      "Medium brown skin",
      "Olive skin",
      "Golden tan skin",
      "Light brown skin",
      "Fair skin",
      "Porcelain fair skin",
      "Freckled fair skin",
      "Rich melanin — region-agnostic",
      "Albinism-presenting (respectful)",
    ],
  },
  {
    id: "fantasy",
    label: "Fantasy, sci-fi & game-inspired",
    options: [
      "High elf — moonlit pallor",
      "Wood elf — sun-kissed copper",
      "Drow / dark elf — cool ash-violet",
      "Half-orc — green-gray undertone",
      "Tiefling — ember skin & infernal flush",
      "Dragonborn — metallic scale sheen on skin",
      "Aasimar — soft inner glow",
      "Genasi (water) — aqua undertone",
      "Genasi (fire) — ember-coal skin",
      "Astral elf — star-flecked complexion",
      "Vampire court — marble cool",
      "Fae-touched — iridescent undertone",
      "Merfolk coastal — seafoam highlights",
      "Cybernetic chrome flush on skin",
      "Holographic skin shimmer",
      "Bioluminescent freckle constellations",
      "Crystal-born — faceted light refraction",
      "Void-touched — deep violet-black skin",
      "Sun-scorched desert nomad tone",
      "Moonborn pale with silver undertone",
      "Infernal lineage — warm crimson undertone",
      "Celestial lineage — gold-threaded warmth",
      "Plantkin — soft chlorophyll flush",
      "Construct hybrid — porcelain seams",
      "Pixel-glitch skin (stylized)",
      "Anime-protag universal (stylized)",
    ],
  },
] as const;

/** Every selectable row (deduped order preserved from groups). */
export const ALL_FORGE_ETHNICITY_OPTIONS: readonly string[] = FORGE_ETHNICITY_GROUPS.flatMap((g) => [...g.options]);

export function normalizeForgeEthnicity(input: string): string {
  const t = input.trim();
  if (!t) return FORGE_ETHNICITY_ANY_LABEL;
  if ((ALL_FORGE_ETHNICITY_OPTIONS as readonly string[]).includes(t)) return t;
  const lo = t.toLowerCase();
  const hit = ALL_FORGE_ETHNICITY_OPTIONS.find((o) => o.toLowerCase() === lo);
  return hit ?? FORGE_ETHNICITY_ANY_LABEL;
}

/** Value sent to image APIs that expect `any` for open choice. */
export function ethnicityForImagePipeline(label: string): string {
  const n = normalizeForgeEthnicity(label);
  return n === FORGE_ETHNICITY_ANY_LABEL ? "any" : n;
}

export function isOpenEthnicityChoice(label: string): boolean {
  return normalizeForgeEthnicity(label) === FORGE_ETHNICITY_ANY_LABEL;
}
