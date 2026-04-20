/**
 * Companion Forge — art style & scene presets for Grok Imagine portrait prompts.
 * Keep in sync with server `supabase/functions/_shared/forgePortraitAugmentation.ts` (duplicate for Deno).
 */

import { forgePortraitBodyTypeContract } from "@/lib/forgeBodyTypes";

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

export const FORGE_SCENE_ATMOSPHERES = [
  "No Background",
  "Dark Urban Alley",
  "Luxury Penthouse Bedroom",
  "Neon Cyberpunk Street",
  "Gothic Mansion Interior",
  "Abandoned Warehouse",
  "Misty Dark Forest",
  "Elegant Marble Bathroom",
  "Underground Neon Club",
  "Moonlit Rooftop",
  "Vintage Victorian Room",
  "Sleek Modern Loft",
  "Dimly Lit Jazz Bar",
  "Post-Apocalyptic Ruins",
  "Soft Sunset Balcony",
  "Mysterious Foggy Library",
] as const;

export type ForgeSceneAtmosphere = (typeof FORGE_SCENE_ATMOSPHERES)[number];

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

/** Scene blocks: environment, atmosphere, and default camera relationship to subject. */
const SCENE_ATMOSPHERE_HINTS: Record<string, string> = {
  "Dark Urban Alley":
    "Wet asphalt reflections, distant neon bokeh, steam vent haze, subject framed in a shallow alcove — street-level camera slightly below eye line for presence.",
  "Luxury Penthouse Bedroom":
    "Floor-to-ceiling glass city glow, silk sheets and low warm lamps, champagne speculars — intimate medium shot with implied depth beyond the window.",
  "Neon Cyberpunk Street":
    "Vertical signage glow (abstract shapes, no readable brand text), puddle mirrors, crowd silhouette depth — mid-shot with layered parallax.",
  "Gothic Mansion Interior":
    "Carved stone, stained glass chroma cast, candle haze, long corridor perspective — portrait with architectural framing columns.",
  "Abandoned Warehouse":
    "God-rays through broken roof panels, dust motes, industrial texture — wide environmental portrait with subject as luminous anchor.",
  "Misty Dark Forest":
    "Volumetric moon shafts, wet bark sheen, ferns in soft foreground blur — slightly low angle for mythic scale.",
  "Elegant Marble Bathroom":
    "Steam-softened highlights, veined stone reflections, porcelain speculars — tasteful steam and towel drape, spa editorial framing.",
  "Underground Neon Club":
    "Laser haze slices, bass-rig silhouette bokeh, wet skin micro-contrast — club portrait with colored rim keys.",
  "Moonlit Rooftop":
    "Silver edge light, wind in hair/cloth, city sprawl bokeh below — three-quarter length against sky gradient.",
  "Vintage Victorian Room":
    "Floral wallpaper, tasseled lampshade glow, brass and mahogany bounce — seated or standing portrait with period props.",
  "Sleek Modern Loft":
    "Concrete and glass minimalism, single statement practical, long shadow geometry — architectural lines leading to the face.",
  "Dimly Lit Jazz Bar":
    "Warm tungsten pools, brass instrument glints, shallow stage depth — bar-top or booth intimacy, smoke optional subtle.",
  "Post-Apocalyptic Ruins":
    "Rust patina, dust storms softening sun, improvised couture — cinematic survival glamour without graphic violence.",
  "Soft Sunset Balcony":
    "Rose-gold rim, gauze curtains in motion, ocean or skyline melt — golden-hour beauty dish in open air.",
  "Mysterious Foggy Library":
    "Floor-to-ceiling tomes, green-shade lamp pool, drifting dust in light cones — scholar seduction tableau.",
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
  const t = input.trim();
  if ((FORGE_SCENE_ATMOSPHERES as readonly string[]).includes(t)) return t as ForgeSceneAtmosphere;
  const hit = FORGE_SCENE_ATMOSPHERES.find((s) => s.toLowerCase() === t.toLowerCase());
  return hit ?? "No Background";
}

export function forgeArtDirectionHint(artStyle: string): string {
  return ART_DIRECTION_HINTS[artStyle] ?? `Cohesive ${artStyle} rendering with clear focal hierarchy and premium portrait finish.`;
}

export function forgeSceneAtmosphereHint(scene: string): string {
  return SCENE_ATMOSPHERE_HINTS[scene] ?? `Environment: ${scene} — integrate subject with motivated light and atmospheric depth.`;
}

export type ForgePortraitPromptArgs = {
  name: string;
  /** Forge body type label (authoritative for silhouette / species / stature). */
  bodyType: string;
  portraitAppearanceText: string;
  personalityLabel: string;
  vibeThemeLabel: string;
  artStyle: string;
  sceneAtmosphere: string;
  extraNotes: string;
  referenceNotes: string;
};

/**
 * Single string sent to Imagine (via packshot prompt or composed default).
 * Weaves appearance + personality + optional mood tags + explicit art & scene direction.
 */
export function composeForgePortraitPrompt(a: ForgePortraitPromptArgs): string {
  const art = normalizeForgeArtStyle(a.artStyle);
  const scene = normalizeForgeScene(a.sceneAtmosphere);
  const artHint = forgeArtDirectionHint(art);
  const sceneHint = forgeSceneAtmosphereHint(scene);
  const bt = a.bodyType?.trim() || "Average Build";
  const bodyContract = forgePortraitBodyTypeContract(bt);
  const appearance = (a.portraitAppearanceText || "").trim();

  return [
    bodyContract,
    `Primary art direction — ${art}: ${artHint}`,
    `Primary environment — ${scene}: ${sceneHint}`,
    "Composition: vertical 3:4 card, single clear focal plane, flattering portrait lens discipline, SFW pin-up / romance cover quality.",
    appearance
      ? `Character appearance prose (secondary — must conform to the BODY TYPE LOCK above; do not replace silhouette with a generic human that contradicts "${bt}"): Portrait of ${a.name || "an original companion"}: ${appearance}`
      : `Portrait of ${a.name || "an original companion"} — no extra appearance paragraph; infer wardrobe and species only from the BODY TYPE LOCK and art/scene lines.`,
    `Personality blend (weave subtly into pose/expression — do not override species or body type): ${a.personalityLabel}.`,
    a.vibeThemeLabel.trim()
      ? `Secondary mood & genre tags (do not fight body type or art style): ${a.vibeThemeLabel}.`
      : "",
    a.extraNotes.trim() ? `Additional notes: ${a.extraNotes.trim()}` : "",
    a.referenceNotes.trim() ? `Reference direction (palette / mood, not likeness): ${a.referenceNotes.trim()}` : "",
    `Silhouette reminder — body type "${bt}" must remain the dominant physical read in the final image.`,
  ]
    .filter(Boolean)
    .join(" ");
}
