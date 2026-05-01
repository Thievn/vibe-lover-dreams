/**
 * Forge tab → style DNA for Imagine prompts (Edge). Keep tab ids aligned with `nexusForgeThemeMerge.ts` / client `forgeThemeTabs.ts`.
 */

const CANONICAL_FORGE_THEME_TAB_IDS = [
  "anime_temptation",
  "monster_desire",
  "gothic_seduction",
  "realistic_craving",
  "dark_fantasy",
  "furry_den",
  "pet_play_kennel",
  "insectoid_hive",
  "celestial_lust",
  "alien_embrace",
  "demonic_ruin",
  "aquatic_depths",
  "mechanical_seduction",
  "plant_bloom",
  "horror_whore",
  "mythic_beast",
  "hyper_degenerate",
  "latex_rubber",
  "eldritch_brood",
  "grotesque_goddess",
] as const;

const LEGACY_FORGE_TAB_ID_TO_CANONICAL: Record<string, string> = {
  anime: "anime_temptation",
  monster: "monster_desire",
  gothic: "gothic_seduction",
  realistic: "realistic_craving",
  dark_fantasy: "dark_fantasy",
  chaos: "hyper_degenerate",
  cyber_neon_syndicate: "mechanical_seduction",
  starlit_siren_sci_fi: "celestial_lust",
  steampunk_velvet: "mechanical_seduction",
  retro_pinup_heat: "latex_rubber",
  iron_glory_apex: "mythic_beast",
  velvet_romance_soft: "plant_bloom",
  horror_whisper_court: "horror_whore",
  feral_nature_covenant: "mythic_beast",
  royal_sin_palace: "demonic_ruin",
  neon_alley_predator: "horror_whore",
  celestial_fallen_halo: "celestial_lust",
  infernal_high_table: "demonic_ruin",
  abyssal_depth_siren: "aquatic_depths",
  grotesque_goddess_majesty: "grotesque_goddess",
};

function normalizeForgeTabIdForDna(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "";
  const t = raw.trim();
  const migrated = LEGACY_FORGE_TAB_ID_TO_CANONICAL[t] ?? t;
  if ((CANONICAL_FORGE_THEME_TAB_IDS as readonly string[]).includes(migrated)) return migrated;
  return "";
}

const STYLE_DNA: Record<string, { full: string; preview: string }> = {
  anime_temptation: {
    full: "Anime temptation: 2D cel / soft-gradient anime key visual, expressive eyes, stylized hair, fashion-forward otaku glam.",
    preview: "Stylized 2D anime portrait: expressive eyes, clean line art, modest fashion — tasteful pin-up, SFW.",
  },
  monster_desire: {
    full: "Monster desire: coherent creature anatomy, horns/tail/wings, textured skin, seductive beast-royalty mood.",
    preview: "Fantasy creature portrait: tasteful hybrid hints, dramatic light — heroic monster glam, SFW.",
  },
  gothic_seduction: {
    full: "Gothic seduction: corsetry, lace veils, candlelit pallor, jewelry filigree, tragic-beauty romance.",
    preview: "Gothic romance: lace, corsetry silhouette, soft candlelight — moody alluring portrait, SFW.",
  },
  realistic_craving: {
    full: "Realistic craving: photographic skin storytelling, believable weight, shallow depth of field, moody editorial realism.",
    preview: "Photoreal editorial: natural skin texture, soft cinematic light, clothed glamour — SFW.",
  },
  dark_fantasy: {
    full: "Dark fantasy: runic markings, corruption glow, ritual scars, mana aura, occult archetype drama.",
    preview: "Dark fantasy: subtle runes or soft magical glow, moody shadows, regal wardrobe — SFW.",
  },
  furry_den: {
    full: "Furry den: expressive anthro features, plush fur, warm den lounge, playful predator-cozy intimacy.",
    preview: "Anthro fantasy: soft fur styling, cozy wardrobe, warm light — friendly charisma, SFW.",
  },
  pet_play_kennel: {
    full: "Pet-play kennel: collar/leash fashion language, padded luxury kennel aesthetic, stylized roleplay glam.",
    preview: "Fashion portrait with subtle collar accessory cues — playful glam, SFW.",
  },
  insectoid_hive: {
    full: "Insectoid hive: chitin sheen, hive geometry, alien elegance, sleek biomech seduction.",
    preview: "Stylized insectoid fantasy: glossy hints, geometric light — alien couture, SFW.",
  },
  celestial_lust: {
    full: "Celestial lust: tarnished gold, broken halo motifs, starfield shimmer, fallen-angel tableau.",
    preview: "Celestial fantasy: soft gold rim, ethereal fabrics — divine glamour, SFW.",
  },
  alien_embrace: {
    full: "Alien embrace: biolume accents, elegant non-human cues, ship-window rim, sci-fi seduction.",
    preview: "Soft sci-fi: subtle alien markings, futuristic wardrobe, cool rim light — SFW.",
  },
  demonic_ruin: {
    full: "Demonic ruin: obsidian textures, infernal couture, ember underlight, sovereign corruption glam.",
    preview: "Infernal fantasy: deep reds/blacks, subtle glow hints — dramatic, SFW.",
  },
  aquatic_depths: {
    full: "Aquatic depths: pressure-haze, pearl and scale accents, biolume teal/violet, siren couture.",
    preview: "Aquatic fantasy: soft caustics, pearlescent fabrics — serene aquatic glam, SFW.",
  },
  mechanical_seduction: {
    full: "Mechanical seduction: chrome highlights, harness lines, synth-noir rain, HUD reflections.",
    preview: "Cyberpunk fashion: metallic accents, neon rim, techwear — sleek future noir, SFW.",
  },
  plant_bloom: {
    full: "Plant & bloom: vine jewelry, pollen haze, petal textures, greenhouse golden hour.",
    preview: "Botanical fantasy: floral accessories, soft green-gold light — romantic nature glam, SFW.",
  },
  horror_whore: {
    full: "Horror whore: elegant dread, porcelain stillness, marble gallery shadows — horror as high fashion.",
    preview: "Gothic horror glam: pale tones, dramatic shadows — unsettling mood without gore, SFW.",
  },
  mythic_beast: {
    full: "Mythic beast: legendary creature regalia, storm-lit mane, ancient gold.",
    preview: "Mythic fantasy: subtle beast-feature accessories, heroic light — epic tasteful portrait, SFW.",
  },
  hyper_degenerate: {
    full: "Hyper degenerate: maximal genre mash, prop storm, palette sabotage, asymmetry — eclectic chaos energy.",
    preview: "Eclectic fashion: playful mismatched styling, bold color — energetic SFW composition.",
  },
  latex_rubber: {
    full: "Latex & rubber: high-gloss speculars, seam discipline, fetish-couture silhouette.",
    preview: "High-gloss fashion: structured latex-look outfit with full coverage — SFW studio portrait.",
  },
  eldritch_brood: {
    full: "Eldritch brood: wrong-geometry ambience, sickly biolume, tentacle-motif jewelry as couture.",
    preview: "Cosmic fantasy: subtle surreal background, moody biolume accents — mysterious, SFW.",
  },
  grotesque_goddess: {
    full: "Grotesque goddess: monstrous glam, crowned weird, sculptural wrong-beauty.",
    preview: "Avant-garde fantasy: sculptural wardrobe and crown props, dramatic light — SFW.",
  },
};

/** Non-empty prefix when `selectedForgeTab` / `selected_forge_tab` is set. */
export function buildForgeStyleDnaPrefix(characterData: Record<string, unknown>, tier: "full" | "preview"): string {
  const raw =
    characterData.selectedForgeTab ?? characterData.selected_forge_tab ?? characterData.activeForgeTab ?? "";
  const tab = normalizeForgeTabIdForDna(raw);
  if (!tab) return "";
  const row = STYLE_DNA[tab];
  if (!row) return "";
  const body = tier === "preview" ? row.preview : row.full;
  return `THEME_STYLE_DNA (highest priority — ${tab}): ${body}`;
}
