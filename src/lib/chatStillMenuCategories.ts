import type { FabSelfieTier } from "@/lib/chatImageSettings";

/** Chat still picker tiers (no nude tab in the new UI — billing follows `tier`). */
export type ChatStillMenuTier = Exclude<FabSelfieTier, "nude">;

export type ChatStillMenuCategory = {
  id: string;
  label: string;
  imagePrompt: string;
  tier: ChatStillMenuTier;
};

export const CHAT_SELFIE_STILL_CATEGORIES: readonly ChatStillMenuCategory[] = [
  {
    id: "morning-bed-selfie",
    label: "Morning Bed Selfie",
    tier: "sfw",
    imagePrompt:
      "beautiful woman taking a cute morning selfie in bed, soft natural lighting, messy hair, wearing oversized t-shirt, sleepy seductive smile, highly detailed face",
  },
  {
    id: "bathroom-mirror",
    label: "Bathroom Mirror",
    tier: "sfw",
    imagePrompt: "seductive mirror selfie in bathroom, steamy mirror, wearing only a towel, playful expression",
  },
  {
    id: "steamy-shower",
    label: "Steamy Shower",
    tier: "sfw",
    imagePrompt:
      "beautiful woman taking a selfie in the shower, water running down her body, wet hair, sensual expression",
  },
  {
    id: "golden-hour-park",
    label: "Golden Hour Park",
    tier: "sfw",
    imagePrompt:
      "stunning woman taking a selfie during golden hour in the park, warm sunlight, elegant summer dress",
  },
  {
    id: "gaming-setup",
    label: "Gaming Setup",
    tier: "sfw",
    imagePrompt:
      "beautiful gamer girl taking a selfie at her gaming desk with RGB lights, wearing cute headphones",
  },
  {
    id: "kitchen-counter",
    label: "Kitchen Counter",
    tier: "sfw",
    imagePrompt: "seductive selfie in the kitchen, sitting on counter wearing an apron, flirty expression",
  },
  {
    id: "night-balcony",
    label: "Night Balcony",
    tier: "sfw",
    imagePrompt:
      "beautiful woman taking a selfie on a city balcony at night, city lights in background, elegant dress",
  },
  {
    id: "car-selfie",
    label: "Car Selfie",
    tier: "sfw",
    imagePrompt: "seductive car selfie, sitting in luxury car, sunset lighting through windows",
  },
  {
    id: "cozy-reading",
    label: "Cozy Reading",
    tier: "sfw",
    imagePrompt: "beautiful woman reading a book in bed, soft lighting, comfortable and alluring",
  },
  {
    id: "window-light",
    label: "Window Light",
    tier: "sfw",
    imagePrompt: "gorgeous woman standing in front of a bright window, backlit, soft silhouette",
  },
  {
    id: "bubble-bath",
    label: "Bubble Bath",
    tier: "sfw",
    imagePrompt: "beautiful woman taking a selfie in a luxurious bubble bath, relaxed and sensual",
  },
  {
    id: "rooftop-night",
    label: "Rooftop Night",
    tier: "sfw",
    imagePrompt: "stunning rooftop night selfie with city skyline behind her",
  },
  {
    id: "closet-mirror",
    label: "Closet Mirror",
    tier: "sfw",
    imagePrompt: "trying on clothes mirror selfie, elegant and seductive",
  },
  {
    id: "rainy-window",
    label: "Rainy Window",
    tier: "sfw",
    imagePrompt: "beautiful woman taking a selfie by a rainy window, soft moody lighting",
  },
  {
    id: "vanity-desk",
    label: "Vanity Desk",
    tier: "sfw",
    imagePrompt: "seductive vanity mirror selfie while doing makeup",
  },
  {
    id: "hotel-room",
    label: "Hotel Room",
    tier: "sfw",
    imagePrompt: "luxury hotel room selfie, elegant and alluring",
  },
  {
    id: "sunset-beach",
    label: "Sunset Beach",
    tier: "sfw",
    imagePrompt: "beautiful sunset beach selfie, golden hour lighting",
  },
  {
    id: "library-corner",
    label: "Library Corner",
    tier: "sfw",
    imagePrompt: "seductive library selfie surrounded by books",
  },
  {
    id: "yoga-mat",
    label: "Yoga Mat",
    tier: "sfw",
    imagePrompt:
      "beautiful woman after yoga, taking a selfie on her mat, athletic and sensual",
  },
  {
    id: "candlelit-room",
    label: "Candlelit Room",
    tier: "sfw",
    imagePrompt: "sensual selfie in a dark room lit only by candles",
  },
] as const;

export const CHAT_LEWD_STILL_CATEGORIES: readonly ChatStillMenuCategory[] = [
  {
    id: "wet-white-tshirt",
    label: "Wet White T-Shirt",
    tier: "lewd",
    imagePrompt:
      "beautiful woman in wet white t-shirt, water soaked through fabric, highly suggestive, artistic sensual lighting",
  },
  {
    id: "silk-sheets",
    label: "Silk Sheets",
    tier: "lewd",
    imagePrompt: "gorgeous woman lying seductively on black silk sheets, elegant sensual pose",
  },
  {
    id: "lace-lingerie",
    label: "Lace Lingerie",
    tier: "lewd",
    imagePrompt: "beautiful woman in elegant black lace lingerie, seductive pose on bed",
  },
  {
    id: "bubble-bath-tease",
    label: "Bubble Bath Tease",
    tier: "lewd",
    imagePrompt: "sensual woman in bubble bath, strategically covered, very suggestive",
  },
  {
    id: "bent-over-desk",
    label: "Bent Over Desk",
    tier: "lewd",
    imagePrompt: "beautiful woman bent over a desk from behind, wearing tight dress, artistic lighting",
  },
  {
    id: "against-the-wall",
    label: "Against the Wall",
    tier: "lewd",
    imagePrompt: "seductive woman pressed against a wall, intense eye contact, very alluring",
  },
  {
    id: "sheer-nightdress",
    label: "Sheer Nightdress",
    tier: "lewd",
    imagePrompt: "beautiful woman in sheer black nightdress, elegant sensual lighting",
  },
  {
    id: "beach-bikini",
    label: "Beach Bikini",
    tier: "lewd",
    imagePrompt: "stunning woman in tiny bikini on the beach, wet skin, golden hour lighting",
  },
  {
    id: "sweaty-workout",
    label: "Sweaty Workout",
    tier: "lewd",
    imagePrompt:
      "beautiful woman after intense workout, sweaty glistening skin, sports bra and shorts",
  },
  {
    id: "legs-up",
    label: "Legs Up",
    tier: "lewd",
    imagePrompt: "gorgeous woman lying on couch with legs up, very suggestive pose, artistic",
  },
  {
    id: "backless-dress",
    label: "Backless Dress",
    tier: "lewd",
    imagePrompt: "beautiful woman in backless dress showing her entire back, elegant and seductive",
  },
  {
    id: "topless-back-view",
    label: "Topless Back View",
    tier: "lewd",
    imagePrompt: "artistic topless back view of a beautiful woman, tasteful sensual lighting",
  },
  {
    id: "sitting-in-lace",
    label: "Sitting in Lace",
    tier: "lewd",
    imagePrompt: "beautiful woman sitting in elegant lace lingerie, seductive expression",
  },
  {
    id: "open-shirt",
    label: "Open Shirt",
    tier: "lewd",
    imagePrompt: "woman wearing an oversized unbuttoned shirt and nothing else, very suggestive",
  },
  {
    id: "thigh-highs",
    label: "Thigh Highs",
    tier: "lewd",
    imagePrompt: "beautiful woman wearing only thigh high stockings, tasteful sensual pose",
  },
  {
    id: "bathtub-arch",
    label: "Bathtub Arch",
    tier: "lewd",
    imagePrompt: "sensual woman arching her back in the bathtub, artistic nude style",
  },
  {
    id: "window-silhouette",
    label: "Window Silhouette",
    tier: "lewd",
    imagePrompt: "beautiful nude silhouette against a large window, artistic and elegant",
  },
  {
    id: "red-lingerie",
    label: "Red Lingerie",
    tier: "lewd",
    imagePrompt: "stunning woman in red lingerie, seductive bedroom lighting",
  },
  {
    id: "on-all-fours",
    label: "On All Fours",
    tier: "lewd",
    imagePrompt: "beautiful woman on all fours on the bed, artistic and sensual pose",
  },
  {
    id: "neck-bite-pose",
    label: "Neck Bite Pose",
    tier: "lewd",
    imagePrompt: "seductive woman tilting her head showing her neck, very sensual expression",
  },
] as const;

const ALL_AFFECTION_PRESETS: readonly ChatStillMenuCategory[] = [
  ...CHAT_SELFIE_STILL_CATEGORIES,
  ...CHAT_LEWD_STILL_CATEGORIES,
];

/** Bond reward: any of the 40 chat still presets, weighted uniformly. */
export function pickRandomAffectionStillPreset(): ChatStillMenuCategory {
  const i = Math.floor(Math.random() * ALL_AFFECTION_PRESETS.length);
  return ALL_AFFECTION_PRESETS[i] ?? ALL_AFFECTION_PRESETS[0]!;
}
