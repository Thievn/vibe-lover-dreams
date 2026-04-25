/**
 * Companion Forge — art style & scene presets for Grok Imagine portrait prompts.
 * Keep server `supabase/functions/_shared/forgePortraitAugmentation.ts` in sync (scene keys + hints).
 */

import {
  FORGE_SCENE_ATMOSPHERES,
  FORGE_SCENE_GROUPS,
  forgeSceneAtmosphereHint,
  normalizeForgeSceneInput,
  type ForgeSceneAtmosphere,
} from "@/lib/forgeScenePresets";
import { forgePortraitBodyTypeContract } from "@/lib/forgeBodyTypes";

export { FORGE_SCENE_ATMOSPHERES, FORGE_SCENE_GROUPS, type ForgeSceneAtmosphere };

export const FORGE_ART_STYLES = [
  "Photorealistic",
  "Hyper-Realistic",
  "Cinematic Photography",
  "Moody Cinematic",
  "Studio Portrait Photography",
  "Dark Moody Realism",
  "Soft Glamour",
  "Neon Cyberpunk",
  "Dark Fantasy Art",
  "Anime Style",
  "Digital Oil Painting",
  "Watercolor Painting",
  "Dramatic Baroque",
  "Gothic Victorian",
  "Surreal Dreamscape",
  "Film Noir",
  "High Fashion Editorial",
  "Grunge Aesthetic",
] as const;

export type ForgeArtStyle = (typeof FORGE_ART_STYLES)[number];

const LEGACY_ART_MAP: Record<string, ForgeArtStyle> = {
  Photorealistic: "Photorealistic",
  Anime: "Anime Style",
  "3D render": "Hyper-Realistic",
  "Comic / graphic novel": "Dramatic Baroque",
  "Oil painting": "Digital Oil Painting",
  "Cyber-goth digital": "Neon Cyberpunk",
  Watercolor: "Watercolor Painting",
  "Neon airbrush": "Neon Cyberpunk",
  "Low-poly stylized": "Surreal Dreamscape",
  "Baroque portrait": "Dramatic Baroque",
};

/** Art-direction micro-briefs: lens, surface treatment, and rendering intent (SFW portrait card). */
const ART_DIRECTION_HINTS: Record<string, string> = {
  Photorealistic:
    "Natural skin micro-texture, believable fabric falloff, 50–85mm portrait lens, shallow depth of field, soft key with gentle fill — editorial realism without plastic HDR.",
  "Hyper-Realistic":
    "Ultra-crisp detail and controlled specular highlights, medium telephoto compression, clinical clarity — still fully photographic, not uncanny wax.",
  "Cinematic Photography":
    "Anamorphic-style flares (subtle), widescreen mood, motivated practicals, color-graded cinematic contrast, hero framing with environmental storytelling.",
  "Moody Cinematic":
    "Low-key lighting, deep shadows with selective rim, slow-fall haze, restrained palette — emotional tension through light, not horror gore.",
  "Studio Portrait Photography":
    "Clean seamless or textured backdrop, controlled key/fill/rim trio, catchlights shaped for allure, fashion-test clarity and flattering falloff.",
  "Dark Moody Realism":
    "Chiaroscuro realism, wet-street or dim interior bounce, grain-accurate texture, weight in the blacks — seductive noir realism, still SFW.",
  "Soft Glamour":
    "Diffused beauty lighting, pearlescent skin sheen, pastel or champagne palette, gentle bloom — romantic luxury gloss without explicit nudity.",
  "Neon Cyberpunk":
    "RGB edge lights, holographic spill, rain-slick reflections, high-contrast futurist wardrobe — stylized but anatomically coherent unless anime path.",
  "Dark Fantasy Art":
    "Painterly fantasy realism, occult jewelry and fabrics, moonlit or ember fill, subtle particle haze — epic cover art energy, no gore.",
  "Anime Style":
    "Clean line weight, cel shading or soft-gradient anime paint, expressive eyes, dynamic hair silhouette — readable as premium anime key visual.",
  "Digital Oil Painting":
    "Visible brush energy, impasto highlights, rich glazes, museum portrait composition — sensual through pose and drape, not exposure.",
  "Watercolor Painting":
    "Paper grain, wet-on-wet blooms, feathered edges, luminous washes — dreamy romance illustration with clear focal silhouette.",
  "Dramatic Baroque":
    "Tenebrism spotlight, velvet and metal textures, theatrical diagonal composition — Caravaggio-adjacent drama, modern subject.",
  "Gothic Victorian":
    "Ornate moldings, lace and brocade, candelabra warmth vs cool window spill, narrow vertical framing — decadent period romance.",
  "Surreal Dreamscape":
    "Impossible but elegant scale shifts, soft volumetric fog, iridescent accents — one clear subject anchor so the portrait stays legible.",
  "Film Noir":
    "Hard venetian blind shadows, venetian-blind slat light, smoke curl, fedora-era glamour translated to modern wardrobe — high-contrast monochrome or desaturated.",
  "High Fashion Editorial":
    "Razor-sharp wardrobe construction, avant-garde silhouette, beauty-dish key, minimal set — runway campaign polish.",
  "Grunge Aesthetic":
    "Gritty texture layers, distressed denim/leather, mixed tungsten and sodium vapor, handheld intimacy — raw but composed.",
};

export function normalizeForgeArtStyle(input: string): ForgeArtStyle {
  const t = input.trim();
  if ((FORGE_ART_STYLES as readonly string[]).includes(t)) return t as ForgeArtStyle;
  const legacy = LEGACY_ART_MAP[t];
  if (legacy) return legacy;
  const key = Object.keys(LEGACY_ART_MAP).find((k) => k.toLowerCase() === t.toLowerCase());
  if (key) return LEGACY_ART_MAP[key]!;
  const hit = FORGE_ART_STYLES.find((a) => a.toLowerCase() === t.toLowerCase());
  return hit ?? "Photorealistic";
}

export function normalizeForgeScene(input: string): ForgeSceneAtmosphere {
  return normalizeForgeSceneInput(input);
}

export function forgeArtDirectionHint(artStyle: string): string {
  return ART_DIRECTION_HINTS[artStyle] ?? `Cohesive ${artStyle} rendering with clear focal hierarchy and premium portrait finish.`;
}

export { forgeSceneAtmosphereHint };

export type ForgePortraitPromptArgs = {
  name: string;
  /** Forge body type label (authoritative for silhouette / species / stature / material). */
  bodyType: string;
  /**
   * Gender / identity from UI — **face, voice, presentation cues only**; must not imply a different base body than `bodyType`.
   */
  genderPresentation?: string;
  /**
   * Ancestry / complexion seed from forge UI — face, skin tone, hair texture; must not override `bodyType` species or silhouette.
   */
  ethnicitySeed?: string;
  portraitAppearanceText: string;
  personalityLabel: string;
  vibeThemeLabel: string;
  artStyle: string;
  sceneAtmosphere: string;
  extraNotes: string;
  referenceNotes: string;
  /** Wardrobe / figure micro-brief from forge Appearance & Outfit sections. */
  wardrobeBrief?: string;
};

const GENDER_SCOPE_LINE = (label: string) =>
  `Gender & identity presentation (${label}): applies to facial styling (within the allowed species for the locked body type), hairstyle/hairline framing, makeup or markings, implied vocal character, and attitude — NOT to overall height scale, limb count, skeleton, species silhouette, or body material; those come **only** from the body-type opening above.`;

/**
 * Single string sent to Imagine (via packshot prompt or composed default).
 * Body contract already opens with `A character, …`; scene does not impose a site-wide dark theme unless chosen.
 */
export function composeForgePortraitPrompt(a: ForgePortraitPromptArgs): string {
  const art = normalizeForgeArtStyle(a.artStyle);
  const scene = normalizeForgeScene(a.sceneAtmosphere);
  const artHint = forgeArtDirectionHint(art);
  const sceneHint = forgeSceneAtmosphereHint(scene);
  const bt = a.bodyType?.trim() || "Average Build";
  const bodyContract = forgePortraitBodyTypeContract(bt);
  const appearance = (a.portraitAppearanceText || "").trim();
  const genderLabel = (a.genderPresentation ?? "").trim();
  const eth = (a.ethnicitySeed ?? "").trim();

  return [
    bodyContract,
    genderLabel ? GENDER_SCOPE_LINE(genderLabel) : "",
    eth
      ? `Ancestry & complexion seed (${eth}): inform skin tone, facial structure cues, and hair texture **within** the body-type and species lock above; treat fantasy or game-inspired labels as literal visual cues, not metaphors. Do not replace silhouette with a default human that contradicts the forge body type.`
      : "",
    `Primary art direction — ${art}: ${artHint}`,
    `Primary environment — ${scene}: ${sceneHint}`,
    "Composition: vertical 3:4 or 9:16 portrait, single clear focal plane, flattering portrait lens discipline, SFW pin-up / romance cover quality — no typographic footer, category slug, or printed type line on the artwork. Scene and wardrobe **frame** the forge body — they never replace or erase it.",
    appearance
      ? `Character appearance prose (secondary — must conform to the BODY TYPE LOCK above; do not replace silhouette with a generic human that contradicts "${bt}"): Portrait of ${a.name || "an original companion"}: ${appearance}`
      : `Portrait of ${a.name || "an original companion"} — no extra appearance paragraph; infer wardrobe and texture only from the body-type opening, gender scope, and art/scene lines.`,
    `Personality blend (weave subtly into pose/expression — does not override species, material, or body type): ${a.personalityLabel}.`,
    a.vibeThemeLabel.trim()
      ? `Secondary mood & genre tags (do not fight body type or art style): ${a.vibeThemeLabel}.`
      : "",
    a.extraNotes.trim() ? `Additional notes: ${a.extraNotes.trim()}` : "",
    a.referenceNotes.trim() ? `Reference direction (palette / mood, not likeness): ${a.referenceNotes.trim()}` : "",
    (a.wardrobeBrief ?? "").trim()
      ? `Forge wardrobe & figure direction (must read clearly in clothing, accessories, and body read — still SFW): ${(a.wardrobeBrief ?? "").trim()}`
      : "",
    `Silhouette reminder — body type "${bt}" must remain the dominant physical read in the final image.`,
  ]
    .filter(Boolean)
    .join(" ");
}
