/**
 * Deduped "Anime Body & Design" picks for ForgeAnimeFeatures.designPickIds (max 6 in UI).
 */

export type ForgeAnimeDesignOption = {
  id: string;
  label: string;
  /** Short English fragment for Imagine prompts. */
  prompt: string;
};

export const FORGE_ANIME_BODY_DESIGN_OPTIONS = [
  { id: "large_expressive_eyes", label: "Large expressive anime eyes", prompt: "large expressive anime eyes with detailed highlights" },
  { id: "small_delicate_nose", label: "Small delicate nose", prompt: "small delicate anime nose" },
  { id: "tiny_mouth_glossy_lips", label: "Tiny mouth with glossy lips", prompt: "tiny mouth with glossy anime lips" },
  { id: "little_fang", label: "Little fang / tsundere fang", prompt: "cute little fang peeking when smiling" },
  { id: "sharp_chin_soft_jaw", label: "Sharp chin and soft jawline", prompt: "sharp chin and soft anime jawline" },
  { id: "blush_lines", label: "Blush lines / anime blush", prompt: "anime blush stripe lines on cheeks" },
  { id: "sweat_drop_lines", label: "Sweat drop expression lines", prompt: "classic anime sweat-drop or stress comedic lines" },
  { id: "sparkling_star_eyes", label: "Sparkling eyes with star highlights", prompt: "sparkling anime eyes with star-shaped highlights" },
  { id: "heterochromia", label: "Heterochromia (different colored eyes)", prompt: "heterochromia — two different iris colors" },
  { id: "ahoge", label: "Ahoge (single antenna hair)", prompt: "single ahoge antenna hair strand sticking up" },
  { id: "spiky_gravity_hair", label: "Gravity-defying spiky hair", prompt: "gravity-defying spiky anime hair" },
  { id: "long_flowing_hair", label: "Long flowing hair with dramatic highlights", prompt: "long flowing anime hair with dramatic highlight and lowlight ribbons" },
  { id: "twin_tails_odango", label: "Twin tails / odango buns", prompt: "twin tails or odango bun hairstyle" },
  { id: "hime_cut", label: "Hime cut (princess cut)", prompt: "hime cut princess bangs and side locks" },
  { id: "side_bangs_one_eye", label: "Side-swept bangs covering one eye", prompt: "side-swept bangs partly covering one eye" },
  { id: "drill_curls", label: "Massive drill curls", prompt: "massive drill curl ringlets" },
  { id: "pastel_hair", label: "Pastel-colored hair", prompt: "pastel-colored hair (pink, mint, lavender, etc.)" },
  { id: "reactive_hair", label: "Hair that moves on its own", prompt: "reactive hair with playful motion strands" },
  { id: "shiny_hair_streaks", label: "Shiny hair with lighting streaks", prompt: "high-gloss anime hair with dramatic lighting streaks" },
  { id: "hourglass_exaggerated", label: "Exaggerated hourglass figure", prompt: "stylized exaggerated hourglass anime silhouette" },
  { id: "extreme_slim_waist", label: "Extremely slim waist", prompt: "extremely slim anime waist" },
  { id: "long_legs_stylized", label: "Long legs (stylized)", prompt: "long stylized anime legs" },
  { id: "petite_frame", label: "Petite delicate frame", prompt: "petite delicate anime frame" },
  { id: "chibi_sdf", label: "Chibi / super deformed proportions", prompt: "chibi super-deformed proportions (still clear portrait)" },
  { id: "soft_squishy", label: "Soft squishy body aesthetic", prompt: "soft squishy moe anime body aesthetic" },
  { id: "thicc_thighs_thighhighs", label: "Thicc thighs with thigh-highs", prompt: "thicc thighs with thigh-high stockings" },
  { id: "perfect_anime_proportions", label: "Perfect anime proportions", prompt: "perfect unrealistic-but-stylized anime proportions" },
  { id: "neko_ears_tail", label: "Cat ears and tail (neko)", prompt: "neko cat ears and tail" },
  { id: "small_demon_horns", label: "Small demon horns", prompt: "small cute demon horns" },
  { id: "angel_halo", label: "Angel halo", prompt: "floating angel halo accessory" },
  { id: "magical_particles", label: "Floating magical particles", prompt: "floating magical sparkle particles" },
  { id: "glowing_magical_eyes", label: "Glowing magical eyes", prompt: "softly glowing magical eyes" },
  { id: "hair_highlight_dramatic", label: "Dramatic hair highlights and lowlights", prompt: "dramatic hair highlights and lowlights" },
  { id: "screentones_halftone", label: "Anime screentones / halftone shading", prompt: "anime screentone halftone shading accents" },
  { id: "thick_lineart_cel", label: "Clean thick lineart with cel shading", prompt: "clean thick anime lineart with cel shading" },
  { id: "sailor_uniform", label: "Sailor school uniform", prompt: "classic sailor school uniform" },
  { id: "magical_girl_outfit", label: "Magical girl transformation outfit", prompt: "magical girl transformation costume with ribbons and gems" },
  { id: "frilly_maid", label: "Frilly maid outfit", prompt: "frilly anime maid dress" },
  { id: "battle_bikini_stylized", label: "Stylized battle bikini armor", prompt: "stylized fantasy battle bikini armor (tasteful coverage)" },
  { id: "oversized_hoodie_thighhighs", label: "Oversized hoodie + thigh-highs", prompt: "oversized hoodie with thigh-high stockings" },
  { id: "seifuku_variants", label: "Seifuku variations", prompt: "Japanese seifuku school uniform variations" },
  { id: "kimono_modern", label: "Kimono with modern twist", prompt: "kimono fused with modern street fashion" },
  { id: "hoodie_pleated_skirt", label: "Hoodie + pleated skirt", prompt: "oversized hoodie with pleated mini skirt" },
] as const satisfies readonly ForgeAnimeDesignOption[];

export const FORGE_ANIME_DESIGN_OPTION_IDS = new Set(FORGE_ANIME_BODY_DESIGN_OPTIONS.map((o) => o.id));

const PROMPT_BY_ID = Object.fromEntries(FORGE_ANIME_BODY_DESIGN_OPTIONS.map((o) => [o.id, o.prompt])) as Record<
  string,
  string
>;

export const FORGE_ANIME_DESIGN_PICK_MAX = 6;

export function normalizeAnimeDesignPickIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== "string") continue;
    const id = x.trim();
    if (!id || !FORGE_ANIME_DESIGN_OPTION_IDS.has(id)) continue;
    if (!out.includes(id)) out.push(id);
    if (out.length >= FORGE_ANIME_DESIGN_PICK_MAX) break;
  }
  return out;
}

export function randomAnimeDesignPickIds(count: number): string[] {
  const n = Math.max(1, Math.min(FORGE_ANIME_DESIGN_PICK_MAX, Math.floor(count)));
  const pool = [...FORGE_ANIME_BODY_DESIGN_OPTIONS];
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    const pick = pool.splice(i, 1)[0]!;
    out.push(pick.id);
  }
  return out;
}

export function animeDesignPromptFromIds(ids: string[]): string {
  const parts = ids.map((id) => PROMPT_BY_ID[id]).filter(Boolean);
  if (!parts.length) return "";
  return `Anime design picks: ${parts.join("; ")}.`;
}
