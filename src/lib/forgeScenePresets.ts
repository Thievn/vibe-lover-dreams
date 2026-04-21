/**
 * Forge scene buckets — flattened list stays backward-compatible with saved companions.
 */

export const FORGE_SCENE_GROUPS: readonly {
  id: string;
  label: string;
  scenes: readonly string[];
}[] = [
  {
    id: "transparent_studio",
    label: "Transparent & studio",
    scenes: [
      "No Background / Transparent",
      "Pure White Cyclorama Studio",
      "Neutral Gray Seamless Backdrop",
      "Black Void Infinity Cove",
      "Soft Paper Roll Backdrop",
      "High-Key Fashion Test Wall",
      "Glass Box Editorial Set",
    ],
  },
  {
    id: "bright_cozy",
    label: "Bright & everyday",
    scenes: [
      "Sunlit Kitchen Morning",
      "Suburban Front Porch Afternoon",
      "Cozy Coffee Shop Window Seat",
      "Sunflower Field Haze",
      "Farmers Market Aisle Bustle",
      "Rooftop Garden Daylight",
      "Picnic Blanket Park",
      "Rainbow After-Storm Street Puddle",
    ],
  },
  {
    id: "urban_day",
    label: "Urban day & travel",
    scenes: [
      "Brooklyn Brownstone Stoop",
      "Food Truck Festival Midday",
      "Tokyo Crossing Day Rain",
      "Paris Café Terrace",
      "Venice Canal Bridge",
      "Art Deco Train Station Hall",
      "Desert Roadside Motel Neon (day)",
      "Mountain Overlook Highway",
    ],
  },
  {
    id: "urban_night",
    label: "Urban night & neon",
    scenes: [
      "Dark Urban Alley",
      "Neon Cyberpunk Street",
      "Rainy Neon Crosswalk Reflection",
      "Underground Neon Club",
      "Moonlit Rooftop",
      "Times Square Bokeh Night",
      "Hong Kong Dense Neon Signs",
      "Gas Station Desert Night Glow",
    ],
  },
  {
    id: "luxury_interior",
    label: "Luxury & interiors",
    scenes: [
      "Luxury Penthouse Bedroom",
      "Soft Sunset Balcony",
      "Sleek Modern Loft",
      "Private Jet Cabin Aisle",
      "Yacht Deck Golden Hour",
      "Marble Spa Steam Room",
      "Elegant Marble Bathroom",
      "Crystal Chandelier Ballroom",
      "Penthouse Infinity Pool Edge",
    ],
  },
  {
    id: "gothic_dark_romantic",
    label: "Gothic & dark romantic",
    scenes: [
      "Gothic Mansion Interior",
      "Vintage Victorian Room",
      "Candlelit Stone Crypt",
      "Foggy Cemetery Iron Gate",
      "Velvet Victorian Séance Parlor",
      "Misty Dark Forest",
      "Abandoned Cathedral Rose Window",
      "Black Roses Greenhouse Night",
    ],
  },
  {
    id: "cyber_scifi",
    label: "Cyber & sci-fi",
    scenes: [
      "Holographic Hangar Bay",
      "Space Station Observation Deck",
      "Mecha Repair Catwalk",
      "Blade Runner Tyrell Atrium Fog",
      "Zero-G Habitat Window Earthrise",
      "Asteroid Mining Control Room",
      "Holographic Fashion Runway Ring",
    ],
  },
  {
    id: "nature_outdoor",
    label: "Nature & wild",
    scenes: [
      "Alpine Meadow Golden Hour",
      "Redwood Cathedral Sunbeams",
      "Tropical Beach Foam Shore",
      "Saguaro Desert Sunset Wind",
      "Arctic Ice Field Aurora",
      "Cherry Orchard Blossom Snow",
      "Bamboo Forest Mist Path",
      "Irish Cliff Grass Ocean Spray",
      "Autumn Maple Forest Floor",
      "Volcanic Black Sand Beach",
    ],
  },
  {
    id: "water_coast",
    label: "Water & coast",
    scenes: [
      "Underwater Sun Ray Shafts",
      "Lakeside Dock Dusk Calm",
      "Frozen Lake Skate Empty",
      "Coral Reef Shallow Snorkel",
      "Waterfall Pool Mist Rainbow",
    ],
  },
  {
    id: "industrial_grit",
    label: "Industrial & gritty",
    scenes: [
      "Abandoned Warehouse",
      "Post-Apocalyptic Ruins",
      "Rust Shipyard Cranes",
      "Steam Factory Catwalk",
      "Subway Tunnel Graffiti Arc",
      "Coal Mine Headlamp Gleam",
    ],
  },
  {
    id: "historical_rustic",
    label: "Historical & rustic",
    scenes: [
      "Wild West Saloon Interior",
      "Medieval Tavern Candlelit",
      "Edo Alley Night Paper Lanterns",
      "Roman Bath Steam Marble",
      "Scottish Moor Fog Ruins",
      "Dusty Silk Road Caravan Tent",
    ],
  },
  {
    id: "whimsical_playful",
    label: "Whimsical & playful",
    scenes: [
      "Cotton Candy Cloud Fairground",
      "Giant Tea Party Garden",
      "Ball Pit Arena Pastel",
      "Miniature Diorama Shelf World",
      "Board Game Table Top Down",
      "Circus Big Top Spotlights",
    ],
  },
  {
    id: "surreal_abstract",
    label: "Surreal & abstract",
    scenes: [
      "Escher Staircase Fog",
      "Floating Islands Sky Sunset",
      "Kaleidoscope Prism Tunnel",
      "Ink Wash Abstract Void",
      "Constellation Skin Dome Sky",
      "M.C. Dream Geometry Corridor",
    ],
  },
  {
    id: "horror_atmos",
    label: "Atmospheric (light horror)",
    scenes: [
      "Mysterious Foggy Library",
      "Dimly Lit Jazz Bar",
      "Foggy Hospital Corridor Night",
      "Abandoned Fairground Rust",
      "Misty Woods Cabin Porch",
    ],
  },
  {
    id: "sports_action",
    label: "Sports & arena",
    scenes: [
      "Empty Gym Mirror Wall",
      "Olympic Pool Underwater Lane",
      "Boxing Ring Corner Spotlights",
      "Empty Ice Rink Surface",
    ],
  },
  {
    id: "academic_domestic",
    label: "Study & home",
    scenes: [
      "Rainy Dorm Room Window",
      "Used Bookstore Warm Aisle",
      "Planetarium Dome Star Projector",
      "Messy Artist Loft North Light",
      "Retro Kitchen Linoleum Morning",
    ],
  },
];

/** Flat list for `<Select>` values and type unions. Order follows groups. */
export const FORGE_SCENE_ATMOSPHERES = FORGE_SCENE_GROUPS.flatMap((g) => [...g.scenes]) as readonly string[];

export type ForgeSceneAtmosphere = (typeof FORGE_SCENE_ATMOSPHERES)[number];

/** Older vault rows → canonical scene string (keep in sync with `normalizeForgeScene`). */
export const FORGE_SCENE_LEGACY_TO_CANONICAL: Record<string, string> = {
  "No Background": "No Background / Transparent",
};

/** Richer overrides for frequently used or legacy-tuned presets. */
const FORGE_SCENE_SPECIFIC_HINTS: Record<string, string> = {
  "No Background / Transparent":
    "True empty backdrop or alpha-friendly treatment — soft cyclorama, flat neutral gradient, or clearly cut-out portrait; zero scenery story; never replace subject with a stock human because the set is simple.",
  "Pure White Cyclorama Studio":
    "Seamless white sweep, high-key beauty lighting, faint floor curve — catalog clarity without environmental narrative.",
  "Black Void Infinity Cove":
    "Pure black wrap with subtle rim; subject reads as hero on void — still life studio discipline.",
  "Dark Urban Alley":
    "Wet asphalt reflections, distant neon bokeh, steam vent haze; subject framed in shallow alcove — street-level camera slightly below eye line for presence.",
  "Luxury Penthouse Bedroom":
    "Floor-to-ceiling glass city glow, silk sheets and low warm lamps — intimate medium shot with depth beyond the window.",
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
    "Silver edge light, wind in hair or cloth, city sprawl bokeh below — three-quarter length against sky gradient.",
  "Vintage Victorian Room":
    "Floral wallpaper, tasseled lampshade glow, brass and mahogany bounce — seated or standing portrait with period props.",
  "Sleek Modern Loft":
    "Concrete and glass minimalism, single statement practical, long shadow geometry — architectural lines leading to the face.",
  "Dimly Lit Jazz Bar":
    "Warm tungsten pools, brass instrument glints, shallow stage depth — bar-top or booth intimacy, subtle smoke optional.",
  "Post-Apocalyptic Ruins":
    "Rust patina, dust storms softening sun, improvised couture — cinematic survival glamour without graphic violence.",
  "Soft Sunset Balcony":
    "Rose-gold rim, gauze curtains in motion, ocean or skyline melt — golden-hour beauty dish in open air.",
  "Mysterious Foggy Library":
    "Floor-to-ceiling tomes, green-shade lamp pool, drifting dust in light cones — scholar seduction tableau.",
};

const FORGE_SCENE_GROUP_HINTS: Record<string, string> = {
  transparent_studio:
    "Studio / empty-set discipline — backdrop stays subordinate; lighting motivates skin and silhouette first; no accidental dungeon or alley mood.",
  bright_cozy:
    "Bright or golden-hour everyday warmth — approachable, optimistic, lived-in; not the site default goth palette unless the user chose a dark scene elsewhere.",
  urban_day:
    "Daylight metropolitan storytelling — readable architecture, natural shadows or soft overcast; cosmopolitan without forcing cyber-noir.",
  urban_night:
    "Night city energy — neon, rainfall, bokeh, wet streets; still let the **body-type opening** stay dominant; environment frames, does not erase species/shape choices.",
  luxury_interior:
    "High-end interior polish — specular metals, glass, textiles, calm wealthy palette; aspirational staging.",
  gothic_dark_romantic:
    "Gothic romance staging — stone, velvet, candle haze, ironwork; dramatic but SFW; only when explicitly selected.",
  cyber_scifi:
    "Sci-fi futurist volumes — holograms, hangar scale, cool rim keys; coherent tech read without random brand logos.",
  nature_outdoor:
    "Natural vistas — sunlight, wind, foliage parallax, atmospheric aerial perspective; scale cues for giant/tiny bodies when relevant.",
  water_coast:
    "Water-centric depth — caustics, wet skin/hair interaction, horizon line or pool geometry; buoyancy cues if implied.",
  industrial_grit:
    "Industrial texture — rust, steam, dust, hard shadows; gritty glamour without horror gore.",
  historical_rustic:
    "Period materials — timber, stone, candle smoke, textiles; coherent era read.",
  whimsical_playful:
    "Playful saturated staging — toy scale cues, candy colors, gentle surreal comedy energy.",
  surreal_abstract:
    "Impossible architecture or scale — keep one clear focal silhouette so stylized backgrounds do not collapse the forge body read.",
  horror_atmos:
    "Atmospheric tension — fog, dim practicals, liminal spaces; moody but still SFW portrait discipline.",
  sports_action:
    "Arena/gym geometry — mirrors, lanes, rope corners; athletic context without crowd IP logos.",
  academic_domestic:
    "Cozy interior study energy — rain windows, books, domestic warmth; intimate medium shots.",
};

/** Resolve group id for a canonical scene label. */
export function forgeSceneGroupIdForScene(scene: string): string | undefined {
  for (const g of FORGE_SCENE_GROUPS) {
    if ((g.scenes as readonly string[]).includes(scene)) return g.id;
  }
  return undefined;
}

export function normalizeForgeSceneInput(input: string): ForgeSceneAtmosphere {
  const raw = input.trim();
  const legacy = FORGE_SCENE_LEGACY_TO_CANONICAL[raw];
  const t = legacy ?? raw;
  if ((FORGE_SCENE_ATMOSPHERES as readonly string[]).includes(t)) return t as ForgeSceneAtmosphere;
  const hit = FORGE_SCENE_ATMOSPHERES.find((s) => s.toLowerCase() === t.toLowerCase());
  return (hit ?? "No Background / Transparent") as ForgeSceneAtmosphere;
}

export function forgeSceneAtmosphereHint(scene: string): string {
  const s = normalizeForgeSceneInput(scene);
  const specific = FORGE_SCENE_SPECIFIC_HINTS[s];
  if (specific) return specific;
  const gid = forgeSceneGroupIdForScene(s);
  const gHint = gid ? FORGE_SCENE_GROUP_HINTS[gid] : undefined;
  if (gHint) return `${gHint} Scene name anchor: ${s}.`;
  return `Environment: ${s} — motivated light, clear depth separation, portrait lens; scene must not override or erase the body-type opening line.`;
}
