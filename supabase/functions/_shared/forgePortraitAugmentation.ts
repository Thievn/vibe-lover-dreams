/**
 * Optional append for `generate-image` when older clients omit woven art/scene prose.
 * Idempotent: skips if the raw prompt already contains the forge scene marker from `composeForgePortraitPrompt`.
 */

const MARKER = "Primary environment —";

function artHint(art: string): string {
  const a: Record<string, string> = {
    Photorealistic:
      "Natural skin micro-texture, 50–85mm portrait lens, shallow depth of field, soft key + gentle fill.",
    "Hyper-Realistic": "Ultra-crisp detail, controlled speculars, telephoto compression, photographic clarity.",
    "Cinematic Photography": "Motivated practicals, subtle anamorphic flare, graded contrast, environmental storytelling.",
    "Moody Cinematic": "Low-key light, selective rim, restrained palette, emotional tension through shadow.",
    "Studio Portrait Photography": "Controlled key/fill/rim, backdrop falloff, beauty-dish catchlights.",
    "Dark Moody Realism": "Chiaroscuro, grain-accurate texture, weight in blacks — seductive noir realism.",
    "Soft Glamour": "Diffused beauty light, pearlescent sheen, pastel/champagne palette, gentle bloom.",
    "Neon Cyberpunk": "RGB rim, holographic spill, rain reflections — futurist wardrobe, coherent anatomy.",
    "Dark Fantasy Art": "Painterly fantasy realism, moonlit or ember fill, occult accessories — cover art energy.",
    "Anime Style": "Cel or soft-gradient anime paint, expressive eyes, clean silhouette — key visual polish.",
    "Digital Oil Painting": "Brush energy, impasto highlights, rich glazes — sensual through drape and pose.",
    "Watercolor Painting": "Paper grain, wet blooms, luminous washes — dreamy romance illustration.",
    "Dramatic Baroque": "Tenebrism spotlight, velvet/metal textures, theatrical diagonal composition.",
    "Gothic Victorian": "Ornate interior, lace/brocade, candle vs window spill — decadent period romance.",
    "Surreal Dreamscape": "Soft volumetric fog, iridescent accents — one clear subject anchor.",
    "Film Noir": "Venetian-blind shadows, smoke curl, desaturated or monochrome glamour.",
    "High Fashion Editorial": "Razor wardrobe silhouette, beauty-dish key, minimal set — campaign polish.",
    "Grunge Aesthetic": "Gritty textures, mixed sodium/tungsten, handheld intimacy — raw but composed.",
  };
  return a[art] ?? `Premium ${art} portrait finish with clear focal hierarchy.`;
}

const LEGACY_SCENE: Record<string, string> = {
  "No Background": "No Background / Transparent",
};

const SCENE_SPECIFIC: Record<string, string> = {
  "No Background / Transparent":
    "True empty backdrop or alpha-friendly treatment — soft cyclorama, flat neutral gradient, or clearly cut-out portrait; zero scenery story.",
  "Pure White Cyclorama Studio":
    "Seamless white sweep, high-key beauty lighting — catalog clarity without environmental narrative.",
  "Neutral Gray Seamless Backdrop": "Mid-gray roll, calibrated light — product portrait discipline.",
  "Black Void Infinity Cove": "Pure black wrap with subtle rim — hero-on-void studio framing.",
  "Soft Paper Roll Backdrop": "Warm paper texture edge — painterly studio simplicity.",
  "High-Key Fashion Test Wall": "Bright even wall — fashion-campaign clarity.",
  "Glass Box Editorial Set": "Reflective glass edges — high-gloss editorial volume.",
  "Dark Urban Alley": "Wet asphalt reflections, neon bokeh, steam haze; street-level slightly low angle.",
  "Luxury Penthouse Bedroom": "City glow through glass, warm lamps, silk sheen; intimate medium shot.",
  "Neon Cyberpunk Street": "Vertical abstract glow, puddle mirrors, layered depth; mid-shot parallax.",
  "Gothic Mansion Interior": "Carved stone, stained-glass chroma, candle haze; architectural framing.",
  "Abandoned Warehouse": "God-rays, dust motes, industrial texture; wide portrait with luminous subject.",
  "Misty Dark Forest": "Moon shafts, wet bark, foreground ferns blur; low angle mythic scale.",
  "Elegant Marble Bathroom": "Steam-soft highlights, veined reflections; spa editorial tasteful coverage.",
  "Underground Neon Club": "Laser haze, bass-rig bokeh, colored rim keys; club portrait energy.",
  "Moonlit Rooftop": "Silver rim, wind in cloth, city bokeh below; three-quarter against sky.",
  "Vintage Victorian Room": "Floral wallpaper, tasseled lamp, brass bounce; seated or standing period tableau.",
  "Sleek Modern Loft": "Concrete/glass minimalism, long shadow lines; architectural lead-in to face.",
  "Dimly Lit Jazz Bar": "Tungsten pools, brass glints, shallow stage depth; booth intimacy.",
  "Post-Apocalyptic Ruins": "Rust patina, dust-soft sun, improvised couture; survival glamour.",
  "Soft Sunset Balcony": "Rose-gold rim, gauze motion, skyline melt; golden-hour beauty.",
  "Mysterious Foggy Library": "Tall shelves, green-shade lamp, dust in light cones; scholar romance.",
};

function normalizeSceneLabel(scene: string): string {
  const s = scene.trim();
  return LEGACY_SCENE[s] ?? s;
}

function sceneHint(scene: string): string {
  const s = normalizeSceneLabel(scene);
  const hit = SCENE_SPECIFIC[s];
  if (hit) return hit;
  return `Environment ${s}: motivated light, atmospheric depth, portrait lens discipline — frame the subject without erasing forge body type.`;
}

export function maybeAppendForgeStyleSceneBlock(
  rawPrompt: string,
  characterData: Record<string, unknown>,
): string {
  const raw = String(rawPrompt ?? "").trim();
  if (!raw || raw.includes(MARKER)) return raw;

  const art = String(characterData.artStyleLabel ?? characterData.art_style_label ?? "").trim();
  const sceneRaw = String(
    characterData.sceneAtmosphere ?? characterData.scene_atmosphere ?? "",
  ).trim();
  const scene = normalizeSceneLabel(sceneRaw);
  if (!art || !sceneRaw) return raw;

  const block = [
    `Primary art direction — ${art}: ${artHint(art)}`,
    `Primary environment — ${scene}: ${sceneHint(scene)}`,
    "Composition: vertical 2:3 card portrait, single focal plane, SFW romance-cover quality — no printed titles or typographic footers.",
  ].join(" ");

  return `${raw}\n\n${block}`;
}
