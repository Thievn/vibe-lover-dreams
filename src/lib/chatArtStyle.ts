import type { CompanionRarity } from "@/lib/companionRarity";
import { inferStylizedArtFromTags } from "@/lib/forgeBodyTypes";

/** DB fields used to lock chat Imagine to the same visual lane as the card / forge. */
export type ChatArtStyleDbInput = {
  tags?: string[] | null;
  image_prompt?: string | null;
  appearance?: string | null;
};

const APPEARANCE_STYLE_HINTS: { re: RegExp; label: string }[] = [
  { re: /\banime\b|\banime[-\s]?style\b|\bcel[-\s]?shade/i, label: "Anime / cel-shaded illustration" },
  { re: /\b3d\b|\bcg render\b|\bunreal\b|\bblender\b/i, label: "3D / CG render" },
  { re: /\bcomic\b|\bcartoon\b|\bgraphic novel\b/i, label: "Comic / graphic illustration" },
  { re: /\bwatercolor\b|\boil paint/i, label: "Painterly illustration" },
  { re: /\bpixel art\b/i, label: "Pixel art" },
];

function inferFromImagePromptOrAppearance(imagePrompt: string | null | undefined, appearance: string | null | undefined): string | undefined {
  const blob = `${imagePrompt ?? ""} ${appearance ?? ""}`.toLowerCase();
  if (!blob.trim()) return undefined;
  for (const { re, label } of APPEARANCE_STYLE_HINTS) {
    if (re.test(blob)) return label;
  }
  return undefined;
}

/**
 * Single label for chat image prompts and `characterData.artStyleLabel` — tags first, then render pipeline, then text heuristics.
 */
export function resolveChatArtStyleLabel(db: ChatArtStyleDbInput | null | undefined): string {
  const tags = db?.tags ?? [];
  const fromTags = inferStylizedArtFromTags(Array.isArray(tags) ? tags : []);
  if (fromTags) return fromTags;

  const fromText = inferFromImagePromptOrAppearance(db?.image_prompt ?? null, db?.appearance ?? null);
  if (fromText) return fromText;

  return "Photorealistic";
}

/** Kept for API symmetry / future rarity-aware tuning. */
export function resolveChatArtStyleLabelWithRarity(
  db: ChatArtStyleDbInput | null | undefined,
  _rarity?: CompanionRarity | string | null,
): string {
  return resolveChatArtStyleLabel(db);
}
