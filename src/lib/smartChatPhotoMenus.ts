import type { FabSelfieTier } from "@/lib/chatImageSettings";

/**
 * Curated still from chat photo menus. `paletteIndex` rotates faux “preview” art on cards (0–7 per tier).
 */
export type SmartChatPhotoStyleOption = {
  id: string;
  label: string;
  hint: string;
  userLine: string;
  sceneExtension: string;
  paletteIndex: number;
};

export const SMART_SELFIE_STYLES: SmartChatPhotoStyleOption[] = [
  {
    id: "casual_selfie",
    label: "Casual Selfie",
    hint: "Sofa, hoodie, daylight — effortless you",
    userLine: "Casual selfie — effortless daylight you, like you caught me staring.",
    sceneExtension:
      "SFW casual natural selfie: **fresh everyday outfit** (not the roster swimsuit/card costume unless casual beach was requested); coffee shop nook, studio apartment, or tree-lined street per era; soft window light; **arm-extended front-camera POV or tripod** — **no smartphone visible**; shallow depth; fully clothed.",
    paletteIndex: 0,
  },
  {
    id: "mirror_selfie",
    label: "Mirror Selfie",
    hint: "Full fit, eyes in the glass",
    userLine: "Mirror selfie — I want the whole outfit and your reflection.",
    sceneExtension:
      "SFW mirror selfie: mid-distance so head-to-toe outfit reads; bedroom, closet, or studio mirror; eyes connecting with reflection; one hip cocked or jacket half-on; warm practicals — tasteful, not boudoir unless era-appropriate outerwear only; **reflection must not show a phone in hand** — compose as if lens is beside the mirror or remote-triggered.",
    paletteIndex: 1,
  },
  {
    id: "bed_selfie",
    label: "Bed Selfie",
    hint: "Sheets, soft light, sweet energy",
    userLine: "Bed selfie — soft light, flirty-sweet, still SFW.",
    sceneExtension:
      "SFW bed selfie: seated on bed edge or kneeling on linens; knit sweater, sleep shirt, or lounge set appropriate to era; golden sidelight; tousled hair; intimate-cute expression; no cleavage-as-focus unless modest; **modest coverage throughout**; **no phone in frame** — tripod, partner POV, or soft window reflection only.",
    paletteIndex: 2,
  },
  {
    id: "morning_selfie",
    label: "Morning Selfie",
    hint: "Messy hair, mug, golden haze",
    userLine: "Morning selfie — messy hair, steam or sunlight, just woke up cute.",
    sceneExtension:
      "SFW morning selfie: bathroom or kitchen rim light, steam or coffee mug; sleepy smile; robe tied closed or casual tee; fresh skin, believable AM clutter; **slight high-angle POV without a visible phone**; warm color grade — wholesome flirty, not explicit.",
    paletteIndex: 3,
  },
  {
    id: "gym_selfie",
    label: "Gym Selfie",
    hint: "Athletic, confident, post-workout glow",
    userLine: "Gym mirror selfie — athletic, confident, still appropriate.",
    sceneExtension:
      "SFW gym selfie: mirrored wall, tasteful athletic top; healthy glow, light sheen; headphones or towel prop; strong posture; fluorescent + window mix; environment reads real gym — no sexualized angles, no stripping; **no phone visible** in reflection or hands.",
    paletteIndex: 4,
  },
  {
    id: "beach_selfie",
    label: "Beach Selfie",
    hint: "Sun, breeze, swim cover",
    userLine: "Beach selfie — sun, wind, and that smile.",
    sceneExtension:
      "SFW beach/boardwalk selfie: **wardrobe distinct from the roster swim portrait** — wrap dress, linen shirt over suit, rash guard, or sarong; wind, dunes or pier background variety; sun rim and salt hair; ocean bokeh; no repeat of the exact catalog bikini framing unless intentional; **natural selfie POV — no smartphone in hand**.",
    paletteIndex: 5,
  },
  {
    id: "car_selfie",
    label: "Car Selfie",
    hint: "Dash glow, leather, golden hour",
    userLine: "Car selfie — golden hour through the window.",
    sceneExtension:
      "SFW car interior selfie: seatbelt on; dashboard glow + sunset through glass; streetlights bokeh; outfit fits their world (period car if vintage setting); flattering **wide arm-extended POV**; cinematic color — no crash-risk staging, no undressing; **no phone visible**.",
    paletteIndex: 6,
  },
  {
    id: "desk_selfie",
    label: "Desk Selfie",
    hint: "Monitor rim, study lamp, cozy",
    userLine: "Desk selfie — monitor glow, study lamp, you leaning in.",
    sceneExtension:
      "SFW desk / workspace selfie: monitor or candle-lamp rim on face; books, quill, holo-pad, or tools matching time period; cozy intellectual vibe; slight lean-in; shallow DOF; outfit everyday-smart — not office fetish staging; **tripod or webcam POV — no handheld smartphone**.",
    paletteIndex: 7,
  },
  {
    id: "cute_aesthetic",
    label: "Cute Aesthetic",
    hint: "Editorial color, soft bloom",
    userLine: "Cute aesthetic selfie — soft editorial, very you.",
    sceneExtension:
      "SFW cute aesthetic selfie: pastel or jewel color story, gentle bloom, artful negative space; fashion-forward but innocent; tripod or steady POV; props minimal (flowers, ribbon, headphones) matching personality — Pinterest-soft, not lewd; **no phone in hand**.",
    paletteIndex: 0,
  },
  {
    id: "flirty_face",
    label: "Flirty Face",
    hint: "Close crop, smirk, eye contact",
    userLine: "Close-up — flirty face, that look you save for me.",
    sceneExtension:
      "SFW tight portrait selfie: shoulders-up; playful smirk or lip bite (subtle); magnetic eye contact; soft beauty dish or window key; skin texture natural; outfit collar or strap visible but not cleavage-forward — tease in the eyes only; **no smartphone visible**.",
    paletteIndex: 1,
  },
  {
    id: "blowing_kiss",
    label: "Blowing Kiss",
    hint: "Hand to lips, charm",
    userLine: "Blow me a kiss for the camera~",
    sceneExtension:
      "SFW blowing-kiss selfie: hand at lips, cheek puff optional; wink or half-laugh; warm key; slightly wider than flirty-face crop so gesture reads; outfit visible at frame edge; charming rom-com energy — still modest coverage; **no phone in frame**.",
    paletteIndex: 2,
  },
  {
    id: "peace_sign",
    label: "Peace Sign",
    hint: "V by eye or cheek — cute",
    userLine: "Peace sign selfie — extra cute, please.",
    sceneExtension:
      "SFW peace-sign selfie: V fingers near cheek or eye; bright friendly smile; slight head tilt; natural or ring light; casual outfit; playful K-pop / yearbook energy adapted to their era — no rude gestures, no lingerie focus; **no smartphone visible**.",
    paletteIndex: 3,
  },
  {
    id: "tongue_out",
    label: "Tongue Out",
    hint: "Playful, mischievous, still SFW",
    userLine: "Little tongue-out selfie — playful, not crude.",
    sceneExtension:
      "SFW playful selfie: tongue slightly out, mischievous eyes; sporty or casual outfit; crisp shutter; avoid overt sexual tongue framing; keep cute-mischief tone matching personality; bright upbeat background; **no phone in hand**.",
    paletteIndex: 4,
  },
  {
    id: "seductive_stare",
    label: "Seductive Stare",
    hint: "Lower lids, still clothed heat",
    userLine: "Seductive stare into the lens — but keep it SFW.",
    sceneExtension:
      "SFW seductive stare selfie: heavy-lidded eyes, slow smile, unbroken eye contact; clothed neckline modest; moody split lighting; tension through gaze not undressing; noir-romance or editorial fashion — **fully clothed framing**, no explicit gestures; **no smartphone visible**.",
    paletteIndex: 5,
  },
  {
    id: "shy_smile",
    label: "Shy Smile",
    hint: "Glance up through lashes",
    userLine: "Shy smile selfie — a little bashful, a lot pretty.",
    sceneExtension:
      "SFW shy smile selfie: eyes up through lashes or looking away then peeking; soft blush; hands tucked in sleeves or holding strap; diffused light; cozy sweater or modest dress; intimate sweetness without sexual explicitness; **no phone in frame**.",
    paletteIndex: 6,
  },
];

export const SMART_LEWD_STYLES: SmartChatPhotoStyleOption[] = [
  {
    id: "lingerie_tease",
    label: "Lingerie Tease",
    hint: "Lace, straps, era-true set",
    userLine: "Lingerie tease — lace and straps that fit your world.",
    sceneExtension:
      "Lewd lingerie tease: **new lingerie set invented for this shot** (era-appropriate lace/silk/garters); boudoir or hotel suite with warm lamp — *not* the roster swimsuit; confident or shy expression per personality; cleavage and legs suggested; photoreal skin; identity = face/hair/body only; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 0,
  },
  {
    id: "topless_tease",
    label: "Sheer / Sheet Tease",
    hint: "Coverage that still kills — hands, lace, steam",
    userLine: "Sheer tease — fabric and shadow, barely enough coverage.",
    sceneExtension:
      "Lewd sheer / sheet tease: **no bare breasts or nipples** — lace, open blouse, satin sheet, or wet fabric **with coverage**; heated eye contact; **steam bathroom OR velvet-drape lounge OR rain-kissed balcony** (pick one vivid backdrop); warm sidelight; photoreal; same anatomy as subject; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**; **no bikini top from profile card.**",
    paletteIndex: 1,
  },
  {
    id: "underboob",
    label: "Underboob",
    hint: "Crop lift, shadow under curve",
    userLine: "Underboob tease — that crop lift, slow and deliberate.",
    sceneExtension:
      "Lewd underboob: cropped tee or athletic crop **different from roster swimwear** — lifted hem shows under-curve; torso arch; **neon alley, gym locker, or sun-drenched loft** as backdrop; moody contrast; confident or bratty expression; avoid explicit lower-body exposure; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 2,
  },
  {
    id: "sideboob",
    label: "Sideboob",
    hint: "Profile or three-quarter",
    userLine: "Sideboob angle — profile heat.",
    sceneExtension:
      "Lewd sideboob: three-quarter or profile; open-side dress, loose tank, silk wrap, or unlaced corset (**not default bikini from card**); candlelit hall, velvet booth, or marble bath steam; rim light on curve; shallow DOF; elegant silhouette; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 3,
  },
  {
    id: "tasteful_backshot",
    label: "Tasteful Backshot",
    hint: "Fabric, curve, glance — editorial",
    userLine: "Tasteful backshot — fabric and curve, still classy.",
    sceneExtension:
      "Lewd editorial backshot: subject turned three-quarter away; **wardrobe tells the story** (slip, open-back dress, robe gap, or athletic crop) — **not** hardcore rear exposure; glance over shoulder or hair sweep; **new interior or dusk balcony**; warm rim on shoulders; same identity as portrait; **negative:** no gratuitous spread, no catalog swimsuit clone unless swim scene; **no bare genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 3,
  },
  {
    id: "ass_focus",
    label: "Ass Focus",
    hint: "Hips, fabric, arch — tasteful thirst",
    userLine: "Focus on your ass — arch, fabric, that slow pose.",
    sceneExtension:
      "Lewd ass-focus: thong, cheeky shorts, or skirt lift — **fresh bottoms/pose**, not catalog swimsuit rear clone; back arch; glance over shoulder optional; **penthouse night city glow OR candlelit bedroom OR locker-room steam**; warm tungsten or neon rim; real skin texture; tasteful adult framing; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 4,
  },
  {
    id: "bending_over",
    label: "Bending Over",
    hint: "Counter, bed, or chair lean",
    userLine: "Bend over for the shot — counter or bed, your call.",
    sceneExtension:
      "Lewd bend-over: hands on kitchen island, vanity, or chair back — **scene-specific outfit** (skirt, shorts, athleisure), not profile swimsuit; lower back curve; face to camera or cheek to shoulder; **cozy apartment, dressing room, or patio dusk**; intimate lamp light; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 5,
  },
  {
    id: "on_knees",
    label: "On Knees",
    hint: "Rug, bed edge, power dynamic",
    userLine: "On your knees — slow, deliberate, for the camera.",
    sceneExtension:
      "Lewd on-knees: plush rug, silk sheets, or tatami — pick a **new interior** from their era; lingerie or slip dress **designed for this shot**; thighs together or modest kneel; wrists on thighs; sub/dom flavor per personality; warm fill + rim; fashion-thirst; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 6,
  },
  {
    id: "spreading_legs",
    label: "Spreading Legs",
    hint: "Reclined, lingerie on",
    userLine: "Legs spread tease — still in lingerie, I want the tension.",
    sceneExtension:
      "Lewd legs-apart tease: chaise, velvet sofa, or silk-draped bed — **varied set**; thighs apart **only with lingerie / shorts / skirt still on** — suggestive tension through fabric and pose, not graphic spread or clinical close-up; arched lower back; moody color grade; identity consistent; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 7,
  },
  {
    id: "playing_with_self",
    label: "Playing With Self",
    hint: "Hand over fabric or skin",
    userLine: "Touch yourself where I’m staring — tease first.",
    sceneExtension:
      "Lewd self-touch: fingers **over lingerie or fabric** at waist, ribs, or outer thigh — **no explicit genital contact**; heavy-lidded eyes; **soft spotlight bedroom OR moonlit window seat OR steamy bath edge**; shallow DOF; lingerie invented for scene, not roster swim; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 0,
  },
  {
    id: "nipple_play",
    label: "Nipple Play",
    hint: "Sheer, pinch, ice-tease implied",
    userLine: "Nipple play tease — sheer, pinch, something wicked.",
    sceneExtension:
      "Lewd nipple tease: sheer robe, camisole, or lace **with nipples covered by fabric or hands** — **not repeating bikini hardware from profile**; chain or silk detail optional; warm skin highlights; **private lounge or curtained alcove**; editorial boudoir heat; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 1,
  },
  {
    id: "wet_tshirt",
    label: "Wet T-Shirt",
    hint: "Soaked tee, no bra — steam or rain",
    userLine: "Wet shirt cling — shower steam or rain.",
    sceneExtension:
      "Lewd wet-shirt beat: thin tee or tank **with bra or neutral lining** — fabric clings suggestively but **stays SFW** (no bare nipples, no see-through skin); steam shower, warm summer rain on terrace, or pool-house dusk; cinematic droplets and backlight; sultry playful expression; adults-only editorial thirst — **not** the catalog swimsuit under a tee; **no bare genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 2,
  },
  {
    id: "skirt_flip",
    label: "Skirt Flip",
    hint: "Hem lift, cheeky flash",
    userLine: "Skirt flip tease — cheeky, quick, hot.",
    sceneExtension:
      "Lewd skirt flip: pleated, leather, or flowing skirt per era — hem lifted by wind or hand; thigh/cheek glimpse; **cobblestone alley, palace steps, or rooftop golden hour** — distinct backdrop; flirty eye contact; tasteful thirst; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 3,
  },
  {
    id: "stockings_heels",
    label: "Stockings & Heels",
    hint: "Leg line, garters, chair pose",
    userLine: "Stockings and heels — leg line for days.",
    sceneExtension:
      "Lewd stockings & heels: garters, sheer denier, period or stiletto heel; **velvet chair, opera balcony, or noir hotel corridor**; seated leg-cross or standing pose; dominant or coquette energy; matching lingerie top — **no swimsuit legs-from-catalog paste.** **No bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand.**",
    paletteIndex: 4,
  },
  {
    id: "collar_leash",
    label: "Collar & Leash",
    hint: "Choker, chain, eye contact",
    userLine: "Collar and leash shot — make it ours.",
    sceneExtension:
      "Lewd collar & leash: leather choker or O-ring; chain toward camera; lingerie or harness **styled for this set**; **dungeon-soft candlelit OR cyber neon suite OR Victorian chamber** per era; consensual smirk; moody rim; adults-only fantasy — unique scene, not beach-card repeat; **no bare skin below tasteful coverage, no visible genitals, no explicit sexual acts, no phone in hand**.",
    paletteIndex: 5,
  },
];

/** Extra sensual-tier editorial beats (merged into lewd list) — covered framing, no bare-genital focus; prompt copy avoids `nude` / `naked` substrings for Moments routing. */
export const SMART_SENSUAL_EDITORIAL_EXTRA: SmartChatPhotoStyleOption[] = [
  {
    id: "editorial_standing_silhouette",
    label: "Editorial Standing",
    hint: "Full-length, honest light, tasteful coverage",
    userLine: "Standing shot — every line of you, tasteful and editorial.",
    sceneExtension:
      "Sensual editorial standing: contrapposto in **distinct interior or landscape** matching time period (not the same pool deck as catalog unless asked); sheer robe, slip, or artful fabric drape — **always tasteful coverage**; soft key + fill; face/body lock to portrait — **no swimsuit pasted from catalog**.",
    paletteIndex: 0,
  },
  {
    id: "bed_linen_editorial",
    label: "Bed Linens",
    hint: "Sheets, sprawl or curl",
    userLine: "On the bed — sprawled or curled in the sheets.",
    sceneExtension:
      "Sensual bed editorial: tangled linens; languid sprawl or fetal curl; **strategic sheet drape** on hips and torso; warm tungsten or moonlight; eye contact or profile; hands may grip sheets; same identity lock; **no bare skin below tasteful coverage, no visible genitals.**",
    paletteIndex: 1,
  },
  {
    id: "steam_shower_editorial",
    label: "Steam Shower",
    hint: "Steam, tiles, water trails",
    userLine: "Shower steam — slow, close, suggestive.",
    sceneExtension:
      "Sensual steam-shower editorial: frosted glass or heavy steam; tiled walls; hand on wall or hair slicked; wet highlights on **covered** shoulders; sheer wrap or silhouette through fog — **no graphic anatomy**; cinematic lens flare optional.",
    paletteIndex: 2,
  },
  {
    id: "rear_glance_editorial",
    label: "Rear Glance",
    hint: "Glance over shoulder",
    userLine: "From behind — look back at me.",
    sceneExtension:
      "Sensual rear three-quarter: fabric drape or high-cut bottom; glance over shoulder; hair cascade; moody rim; optional mirror for face lock; **no bare glute or spread framing**; same person — no duplicate limbs.",
    paletteIndex: 3,
  },
  {
    id: "reclining_shadow_editorial",
    label: "Reclining Shadow",
    hint: "Silk sheets, rim light",
    userLine: "Reclining — shadows doing the talking.",
    sceneExtension:
      "Tasteful reclining editorial: relaxed pose on silk sheets; thighs and torso in **soft shadow and rim** — **implied** intimacy, art-directed silhouette; no graphic genital close-up; flushed skin; eye contact; anatomy consistent with portrait; premium boudoir tone.",
    paletteIndex: 4,
  },
  {
    id: "touching_herself_sensual",
    label: "Touching Herself",
    hint: "Self-touch through fabric",
    userLine: "Touching yourself — I want to watch every second.",
    sceneExtension:
      "Tasteful intimate self-touch still: hand at breast or along inner thigh through sheet or shadow — heavy-lidded eyes, arched back; **cinematic light**; **no** explicit penetration or clinical close-up; portrait identity lock; editorial sensuality.",
    paletteIndex: 5,
  },
  {
    id: "on_all_fours_sensual",
    label: "On All Fours",
    hint: "Bed or rug, arch, glance",
    userLine: "On all fours for me — slow arch, eyes up.",
    sceneExtension:
      "Tasteful all-fours silhouette on bed or rug: back arch, hair fall, moody side light — **strategic sheet or lingerie** so curves read without graphic spread; glance to camera; sensual not grotesque; photoreal human proportions matching reference identity.",
    paletteIndex: 6,
  },
  {
    id: "sitting_on_desk",
    label: "Sitting on Desk",
    hint: "After-hours, papers, lamp",
    userLine: "On the desk — after-hours, risky.",
    sceneExtension:
      "Sensual desk-edge editorial: papers, lamp, skyline or stone wall per era; **unbuttoned blouse and skirt or slip**; legs dangling or one foot on chair; power-play smirk; warm practicals — match time period props; **tasteful coverage throughout.**",
    paletteIndex: 7,
  },
  {
    id: "bathtub_bubbles_editorial",
    label: "Bathtub Bubbles",
    hint: "Bubbles, candles, waterline",
    userLine: "Bathtub — candles, bubbles, collarbone above water.",
    sceneExtension:
      "Sensual soak editorial: clawfoot or modern tub; candles; **dense bubbles** on skin; collarbones and shoulders above waterline; wet hair; steam; **waterline conceals below**; romantic soak mood.",
    paletteIndex: 0,
  },
  {
    id: "window_rim_editorial",
    label: "Window Rim",
    hint: "Silhouette, rim, city or night",
    userLine: "By the window — silhouette and rim on you.",
    sceneExtension:
      "Sensual window editorial: cool exterior bokeh; warm interior bounce; **sheer curtain or slip** with selective rim; half-turn toward camera; glass condensation optional; **no bare skin below tasteful coverage.**",
    paletteIndex: 1,
  },
  {
    id: "against_wall_editorial",
    label: "Against Wall",
    hint: "Pressed back, hips forward",
    userLine: "Against the wall — pressed, waiting.",
    sceneExtension:
      "Sensual wall lean: shoulder blades and palms contact; **silk or blazer half-open**; hips slightly forward; parted lips; narrow shaft of light across form; cinematic intimacy; brick, stone, or wallpaper per setting.",
    paletteIndex: 2,
  },
  {
    id: "mirror_boudoir_editorial",
    label: "Mirror Boudoir",
    hint: "Reflection doubles the mood",
    userLine: "Mirror shot — show me front and reflection.",
    sceneExtension:
      "Sensual mirror editorial: full-length or three-quarter; reflection matches pose; **no smartphone visible** in hands or reflection; **wrap or lingerie** with artistic boudoir framing; warm tungsten mix; verify face consistency in mirror — same identity.",
    paletteIndex: 3,
  },
  {
    id: "oiled_body_editorial",
    label: "Oiled Sheen",
    hint: "Sheen, specular skin",
    userLine: "Oil-sheen shot — every highlight on you.",
    sceneExtension:
      "Sensual body-oil editorial: fine sheen on **covered or partially draped** shoulders and legs; specular highlights; neutral or dark backdrop; slow sensual pose; **tasteful coverage**; premium skin rendering; same person.",
    paletteIndex: 4,
  },
  {
    id: "post_intimacy_glow",
    label: "Afterglow",
    hint: "Flushed, messy hair, bliss",
    userLine: "That after-glow look — flushed, messy, satisfied.",
    sceneExtension:
      "Sensual afterglow portrait: flushed cheeks and chest; messy damp hair; half-lidded bliss; tangled sheets or thigh touch under fabric; **relaxed editorial lingerie or sheet-wrap**; tender aftercare energy; no partner visible unless silhouette implied — focus on subject.",
    paletteIndex: 5,
  },
];

export function smartPhotoStylesForTier(tier: FabSelfieTier): SmartChatPhotoStyleOption[] {
  if (tier === "lewd") return [...SMART_LEWD_STYLES, ...SMART_SENSUAL_EDITORIAL_EXTRA];
  return SMART_SELFIE_STYLES;
}

/** Gradient “preview” strips for cards — index modulo length per tier. */
export const SMART_MENU_CARD_GRADIENTS: Record<FabSelfieTier, readonly string[]> = {
  sfw: [
    "from-slate-600/90 via-indigo-950/70 to-black",
    "from-amber-200/25 via-rose-900/40 to-black",
    "from-emerald-900/50 via-teal-950/60 to-black",
    "from-violet-400/20 via-purple-950/70 to-black",
    "from-sky-400/15 via-blue-950/65 to-black",
    "from-orange-300/20 via-red-950/50 to-black",
    "from-fuchsia-400/15 via-fuchsia-950/60 to-black",
    "from-cyan-300/15 via-slate-900/80 to-black",
  ],
  lewd: [
    "from-rose-500/30 via-rose-950/80 to-black",
    "from-fuchsia-500/25 via-purple-950/85 to-black",
    "from-red-500/20 via-rose-950/75 to-black",
    "from-pink-400/20 via-fuchsia-950/80 to-black",
    "from-orange-400/15 via-red-950/70 to-black",
    "from-violet-500/25 via-violet-950/80 to-black",
    "from-amber-400/15 via-rose-950/75 to-black",
    "from-pink-500/30 via-black to-purple-950/90",
    "from-purple-500/30 via-violet-950/85 to-black",
    "from-indigo-500/25 via-slate-950/90 to-black",
  ],
} as const;

export function cardGradientForOption(tier: FabSelfieTier, paletteIndex: number): string {
  const list = SMART_MENU_CARD_GRADIENTS[tier];
  const cls = list[paletteIndex % list.length] ?? list[0];
  return `bg-gradient-to-br ${cls}`;
}
