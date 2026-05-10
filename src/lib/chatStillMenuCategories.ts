import type { FabSelfieTier } from "@/lib/chatImageSettings";
import { CHAT_LIKENESS_SUBJECT_FEATURES_INLINE } from "@/lib/chatLikenessAnchors";

/** Chat still picker tiers (no nude tab in the new UI — billing follows `tier`). */
export type ChatStillMenuTier = Exclude<FabSelfieTier, "nude">;

export type ChatStillMenuCategory = {
  id: string;
  label: string;
  imagePrompt: string;
  tier: ChatStillMenuTier;
};

/** Scene line only — global quality / anatomy / likeness rules are appended in `resolveChatImageGenerationPrompt` when a tile is chosen. */
const selfie = (scene: string) =>
  `Natural vertical selfie — **this roster companion only** (not a generic lookalike); lock ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} to CHARACTER APPEARANCE + portrait likeness URL when supplied; gender presentation from CHARACTER APPEARANCE. **No smartphone, screen, or phone case visible** — arm-extended front-camera POV, mirror reflection, tripod/remote, or partner-held frame. ${scene} Outfit, pose, background, and props belong **only** to this scene — do not copy catalog-card wardrobe, backdrop, or packshot pose.`;

const lewd = (scene: string) =>
  `Tasteful editorial-adult shot — **this roster companion only** (not a generic lookalike); lock ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} to CHARACTER APPEARANCE + portrait likeness URL when supplied; gender presentation from CHARACTER APPEARANCE. **Suggestive wardrobe only** (lingerie, sheer, short shorts, tanks, wet fabric with coverage, silk sheets) — **no nudity, no visible genitals, no explicit sexual acts, no phone in hand.** ${scene} Wardrobe, pose, and set follow this line only — not the profile marketing still’s environment or costume.`;

export const CHAT_SELFIE_STILL_CATEGORIES: readonly ChatStillMenuCategory[] = [
  {
    id: "sunset-pier-selfie",
    label: "Sunset Pier Selfie",
    tier: "sfw",
    imagePrompt: selfie(
      "Golden hour on a wooden pier, ocean behind them, fresh elegant summer outfit, warm rim light, relaxed camera-aware smile.",
    ),
  },
  {
    id: "cozy-coffee-shop",
    label: "Cozy Coffee Shop",
    tier: "sfw",
    imagePrompt: selfie(
      "Inside a cozy coffee shop, warm practical lights, soft smile, casual chic outfit, shallow depth of field with steam and cups in the background.",
    ),
  },
  {
    id: "luxury-hotel-balcony",
    label: "Luxury Hotel Balcony",
    tier: "sfw",
    imagePrompt: selfie(
      "Night on a luxury hotel balcony, city bokeh behind them, evening dress or tailored look, cool breeze, cinematic city glow.",
    ),
  },
  {
    id: "vintage-bookstore",
    label: "Vintage Bookstore",
    tier: "sfw",
    imagePrompt: selfie(
      "Aisle of a vintage bookstore, shelves of worn spines, reading glasses or tote, intellectual-cute styling, dust-mote window light.",
    ),
  },
  {
    id: "snowy-cabin-window",
    label: "Snowy Cabin Window",
    tier: "sfw",
    imagePrompt: selfie(
      "By a snowy cabin window, soft winter daylight on their face, knit sweater or layered look, pine and frost outside the glass.",
    ),
  },
  {
    id: "neon-city-street",
    label: "Neon City Street",
    tier: "sfw",
    imagePrompt: selfie(
      "On a neon-lit city street at night, reflective wet pavement, urban streetwear or sleek coat, cyber-noir color accents.",
    ),
  },
  {
    id: "wildflower-field",
    label: "Wildflower Field",
    tier: "sfw",
    imagePrompt: selfie(
      "In a wildflower meadow, golden sunlight, wind in hair, sun dress or light layers, open sky and soft hills.",
    ),
  },
  {
    id: "private-jet-cabin",
    label: "Private Jet Cabin",
    tier: "sfw",
    imagePrompt: selfie(
      "Inside a private jet cabin, cream leather seats, window strip of clouds, travel-luxe outfit, calm confident expression.",
    ),
  },
  {
    id: "candlelit-dinner-table",
    label: "Candlelit Dinner Table",
    tier: "sfw",
    imagePrompt: selfie(
      "At a romantic candlelit dinner table, warm tapers, wine glass, date-night outfit, intimate but fully clothed framing.",
    ),
  },
  {
    id: "underwater-pool",
    label: "Underwater Pool",
    tier: "sfw",
    imagePrompt: selfie(
      "Underwater in a clear resort pool, caustic light ripples, tasteful swimwear, eyes open toward camera, bubbles and turquoise water.",
    ),
  },
  {
    id: "artist-studio",
    label: "Artist Studio",
    tier: "sfw",
    imagePrompt: selfie(
      "In an artist studio with canvases and easels, paint-splatter floor, creative casual outfit, north-light windows.",
    ),
  },
  {
    id: "luxury-spa",
    label: "Luxury Spa",
    tier: "sfw",
    imagePrompt: selfie(
      "In a luxury spa lounge, white robes or spa wrap, orchids and stone textures, serene smile, soft diffused lighting.",
    ),
  },
  {
    id: "train-window",
    label: "Train Window",
    tier: "sfw",
    imagePrompt: selfie(
      "By a train window with scenery streaking past, cozy travel layers, contemplative look, cinematic motion blur outside.",
    ),
  },
  {
    id: "mountain-overlook",
    label: "Mountain Overlook",
    tier: "sfw",
    imagePrompt: selfie(
      "At a mountain overlook railing, crisp air, windbreaker or trail-chic look, sweeping valley vista, midday sun.",
    ),
  },
  {
    id: "vintage-car",
    label: "Vintage Car",
    tier: "sfw",
    imagePrompt: selfie(
      "Inside a vintage car bench seat, chrome and leather details, retro sunglasses optional, golden hour through glass.",
    ),
  },
  {
    id: "rooftop-pool",
    label: "Rooftop Pool",
    tier: "sfw",
    imagePrompt: selfie(
      "At a rooftop infinity pool deck, skyline behind, tasteful resort cover-up or swim look appropriate to SFW band, sunglasses.",
    ),
  },
  {
    id: "library-balcony",
    label: "Library Balcony",
    tier: "sfw",
    imagePrompt: selfie(
      "On a grand library balcony overlooking stacks below, academic-glam outfit, carved railings, soft window light.",
    ),
  },
  {
    id: "greenhouse",
    label: "Greenhouse",
    tier: "sfw",
    imagePrompt: selfie(
      "Inside a lush greenhouse, humid glass panels, tropical plants, linen or light botanical styling, dappled green light.",
    ),
  },
  {
    id: "yacht-deck",
    label: "Yacht Deck",
    tier: "sfw",
    imagePrompt: selfie(
      "On a yacht deck at sea, teak and rigging, nautical breeze, resort-casual outfit, sun and salt sparkle.",
    ),
  },
  {
    id: "festival-crowd",
    label: "Festival Crowd",
    tier: "sfw",
    imagePrompt: selfie(
      "In a vibrant festival crowd, colored flags and string lights, playful festival fashion, motion and confetti hints, dusk sky.",
    ),
  },
] as const;

export const CHAT_LEWD_STILL_CATEGORIES: readonly ChatStillMenuCategory[] = [
  {
    id: "wet-white-tshirt",
    label: "Wet White T-Shirt",
    tier: "lewd",
    imagePrompt: lewd(
      "Wet white tee clinging to curves, fabric texture readable, artistic sensual lighting, perfume-ad heat not explicit porn staging.",
    ),
  },
  {
    id: "silk-sheets-seduction",
    label: "Silk Sheets Seduction",
    tier: "lewd",
    imagePrompt: lewd("Lying on black silk sheets, elegant sensual pose, moody bedroom key light."),
  },
  {
    id: "elegant-lace-lingerie",
    label: "Elegant Lace Lingerie",
    tier: "lewd",
    imagePrompt: lewd("Black lace lingerie set, confident bedroom pose, soft shadow sculpting."),
  },
  {
    id: "sensual-bubble-bath",
    label: "Sensual Bubble Bath",
    tier: "lewd",
    imagePrompt: lewd("Luxurious bubble bath, strategically covered by foam and angles, steam, candle glow."),
  },
  {
    id: "bent-over-desk",
    label: "Bent Over Desk",
    tier: "lewd",
    imagePrompt: lewd("Bent over a desk from behind, tight dress silhouette, office-noir lighting, tasteful tease."),
  },
  {
    id: "against-the-wall",
    label: "Against the Wall",
    tier: "lewd",
    imagePrompt: lewd("Pressed against a wall, intense eye contact, lingerie or slip dress, dramatic side light."),
  },
  {
    id: "sheer-nightdress",
    label: "Sheer Nightdress",
    tier: "lewd",
    imagePrompt: lewd("Sheer black nightdress, silhouette and fabric transparency, elegant sensual lighting."),
  },
  {
    id: "beach-bikini",
    label: "Beach Bikini",
    tier: "lewd",
    imagePrompt: lewd("Tiny bikini on the beach, wet skin, golden hour, editorial swim glamour."),
  },
  {
    id: "sweaty-workout",
    label: "Sweaty Workout",
    tier: "lewd",
    imagePrompt: lewd("Post-workout glow, sports bra and shorts, glistening skin, gym mirror energy."),
  },
  {
    id: "legs-up",
    label: "Legs Up",
    tier: "lewd",
    imagePrompt: lewd("On a couch with legs up, suggestive but composed pose, living-room lamp light."),
  },
  {
    id: "backless-dress",
    label: "Backless Dress",
    tier: "lewd",
    imagePrompt: lewd("Backless evening dress, full elegant back line, gala staircase or balcony hint."),
  },
  {
    id: "topless-back-view",
    label: "Topless Back View",
    tier: "lewd",
    imagePrompt: lewd("Artistic topless back view, tasteful shadow and hair coverage, fine-art boudoir tone."),
  },
  {
    id: "sitting-in-lace",
    label: "Sitting in Lace",
    tier: "lewd",
    imagePrompt: lewd("Seated in lace lingerie, sultry expression, velvet chair or bed edge."),
  },
  {
    id: "open-shirt",
    label: "Open Shirt",
    tier: "lewd",
    imagePrompt: lewd("Oversized unbuttoned shirt, implied nude beneath, bedroom morning light."),
  },
  {
    id: "thigh-highs",
    label: "Thigh Highs",
    tier: "lewd",
    imagePrompt: lewd("Thigh-high stockings and minimal coverage, tasteful seated pose, moody lamp."),
  },
  {
    id: "bathtub-arch",
    label: "Bathtub Arch",
    tier: "lewd",
    imagePrompt: lewd("Arching back in tub, artistic nude-adjacent framing, candles and steam."),
  },
  {
    id: "window-silhouette",
    label: "Window Silhouette",
    tier: "lewd",
    imagePrompt: lewd("Nude silhouette against tall window, elegant curve read, city glow outside."),
  },
  {
    id: "red-lingerie",
    label: "Red Lingerie",
    tier: "lewd",
    imagePrompt: lewd("Red lingerie set, bedroom practicals, warm seductive key light."),
  },
  {
    id: "on-all-fours",
    label: "On All Fours",
    tier: "lewd",
    imagePrompt: lewd("On all fours on bed, artistic sensual pose, sheets and shadow, editorial not graphic."),
  },
  {
    id: "neck-bite-pose",
    label: "Neck Bite Pose",
    tier: "lewd",
    imagePrompt: lewd("Head tilt exposing neck line, hungry-soft expression, intimate close portrait."),
  },
  {
    id: "nipple-peek",
    label: "Nipple Peek",
    tier: "lewd",
    imagePrompt: lewd(
      "Teasingly adjusting top, barely-there peek, highly suggestive, controlled editorial framing — no explicit graphic close-up.",
    ),
  },
  {
    id: "barely-covered",
    label: "Barely Covered",
    tier: "lewd",
    imagePrompt: lewd("Strategic hand placement and fabric, provocative but composed, soft studio light."),
  },
  {
    id: "sideboob-tease",
    label: "Sideboob Tease",
    tier: "lewd",
    imagePrompt: lewd("Extreme sideboob silhouette in a cutout top, seductive posture, moody contrast."),
  },
  {
    id: "underboob",
    label: "Underboob",
    tier: "lewd",
    imagePrompt: lewd("Tiny crop showing maximum underboob line, confident stance, urban night color."),
  },
  {
    id: "sheer-wet-fabric",
    label: "Sheer Wet Fabric",
    tier: "lewd",
    imagePrompt: lewd("Sheer fabric soaked clingy, body readable through material, artistic sensual lighting."),
  },
  {
    id: "hands-between-thighs",
    label: "Hands Between Thighs",
    tier: "lewd",
    imagePrompt: lewd("Seated with hands between thighs, aroused expression, shadowed implied framing."),
  },
  {
    id: "arching-back-nude",
    label: "Arching Back Nude",
    tier: "lewd",
    imagePrompt: lewd("Full arch nude pose, fine-art silhouette and rim light, graceful not pornographic."),
  },
  {
    id: "kneeling-pose",
    label: "Kneeling Pose",
    tier: "lewd",
    imagePrompt: lewd("On knees looking up toward camera, submissive-flirt energy, soft spotlight."),
  },
  {
    id: "spread-legs-tease",
    label: "Spread Legs Tease",
    tier: "lewd",
    imagePrompt: lewd("Lying back with legs slightly parted tease, sheet and shadow coverage, editorial heat."),
  },
  {
    id: "ass-focus",
    label: "Ass Focus",
    tier: "lewd",
    imagePrompt: lewd("From-behind emphasis on curves in lingerie or slip, tasteful bedroom set, no explicit spread."),
  },
  {
    id: "mirror-nude",
    label: "Mirror Nude",
    tier: "lewd",
    imagePrompt: lewd("Nude mirror selfie vibe, phone in frame optional, artistic sensual reflections."),
  },
  {
    id: "bed-straddle",
    label: "Bed Straddle",
    tier: "lewd",
    imagePrompt: lewd("Straddling pillow on bed, lewd-adjacent tease, sheets and warm lamp only."),
  },
  {
    id: "collar-leash",
    label: "Collar & Leash",
    tier: "lewd",
    imagePrompt: lewd("Collar and leash accessory, submissive bedroom pose, consenting fantasy tone."),
  },
  {
    id: "body-oil",
    label: "Body Oil",
    tier: "lewd",
    imagePrompt: lewd("Glistening body oil on skin, highlight rolls, dark backdrop, sensual not messy."),
  },
  {
    id: "crotch-grab",
    label: "Crotch Grab",
    tier: "lewd",
    imagePrompt: lewd("Teasing hand at inner thigh / over fabric, intense eye contact, chiaroscuro."),
  },
  {
    id: "from-below",
    label: "From Below",
    tier: "lewd",
    imagePrompt: lewd("Low angle looking up, powerful legs-and-torso read, dramatic ceiling light."),
  },
  {
    id: "bite-lip-nude",
    label: "Bite Lip Nude",
    tier: "lewd",
    imagePrompt: lewd("Lip bite while nude-framed, fine-art crop, aroused expression, soft fill."),
  },
  {
    id: "shower-glass-press",
    label: "Shower Glass Press",
    tier: "lewd",
    imagePrompt: lewd("Body pressed to wet shower glass, silhouette and steam, tasteful obscuring streaks."),
  },
  {
    id: "thong-pull",
    label: "Thong Pull",
    tier: "lewd",
    imagePrompt: lewd("Teasing thong strap adjustment, hip close-up with shadow, editorial lingerie ad."),
  },
  {
    id: "breast-press",
    label: "Breast Press",
    tier: "lewd",
    imagePrompt: lewd("Arms pressing curves together, cleavage-forward tasteful framing, warm key light."),
  },
] as const;

const ALL_AFFECTION_PRESETS: readonly ChatStillMenuCategory[] = [
  ...CHAT_SELFIE_STILL_CATEGORIES,
  ...CHAT_LEWD_STILL_CATEGORIES,
];

/** Bond reward: any chat still preset, weighted uniformly. */
export function pickRandomAffectionStillPreset(): ChatStillMenuCategory {
  const i = Math.floor(Math.random() * ALL_AFFECTION_PRESETS.length);
  return ALL_AFFECTION_PRESETS[i] ?? ALL_AFFECTION_PRESETS[0]!;
}
