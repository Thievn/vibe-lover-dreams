/** Forge UI body types — must stay in sync with `resolveAnatomyVariant` expectations server-side. */
export const FORGE_BODY_TYPES = [
  "Average",
  "Tall",
  "Petite",
  "Curvy",
  "Muscular",
  "Little Person / Midget",
  "Amputee / Wheelchair User",
] as const;

export type ForgeBodyType = (typeof FORGE_BODY_TYPES)[number];

const LEGACY_BODY_TO_FORGE: Record<string, string> = {
  slim: "Average",
  athletic: "Muscular",
  curvy: "Curvy",
  thick: "Curvy",
  petite: "Petite",
  "tall & statuesque": "Tall",
  muscular: "Muscular",
  "plus-size": "Curvy",
  "plus size": "Curvy",
  soft: "Average",
  androgynous: "Average",
  "hyper-feminine": "Curvy",
  "hyper-masculine": "Muscular",
};

export function normalizeForgeBodyType(input: string): ForgeBodyType {
  const t = input.trim();
  if ((FORGE_BODY_TYPES as readonly string[]).includes(t)) return t as ForgeBodyType;
  const key = t.toLowerCase();
  if (LEGACY_BODY_TO_FORGE[key]) return normalizeForgeBodyType(LEGACY_BODY_TO_FORGE[key]);
  for (const f of FORGE_BODY_TYPES) {
    if (f.toLowerCase() === key) return f;
  }
  return "Average";
}

/** Infer forge body type label from companion tags (custom characters). */
export function inferForgeBodyTypeFromTags(tags: string[]): ForgeBodyType | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  for (const b of FORGE_BODY_TYPES) {
    const bl = b.toLowerCase();
    if (blob.includes(bl)) return b;
  }
  return undefined;
}

/** Matches server `STYLIZED_ART_STYLE_LABELS` for anatomy policy. */
export const STYLIZED_ART_STYLES_FOR_ANATOMY = [
  "Anime",
  "Anime Style",
  "Comic / graphic novel",
  "Low-poly stylized",
  "Watercolor",
  "Watercolor Painting",
  "Neon airbrush",
  "Neon Cyberpunk",
  "Baroque portrait",
  "Dramatic Baroque",
  "Oil painting",
  "Digital Oil Painting",
  "Cyber-goth digital",
  "Dark Fantasy Art",
  "Gothic Victorian",
  "Surreal Dreamscape",
  "Film Noir",
  "Grunge Aesthetic",
] as const;

export function inferStylizedArtFromTags(tags: string[]): string | undefined {
  const blob = tags.map((x) => x.toLowerCase()).join(" | ");
  for (const s of STYLIZED_ART_STYLES_FOR_ANATOMY) {
    if (blob.includes(s.toLowerCase())) return s;
  }
  return undefined;
}
