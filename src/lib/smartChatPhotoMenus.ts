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
    userLine: "Casual selfie — like you just grabbed your phone mid-day.",
    sceneExtension:
      "SFW casual phone selfie: relaxed at-home or street-casual outfit matching their personality matrix and time period; soft natural window or bounce light; easy smile; arm’s-length or propped phone; shallow depth; cozy believable background — fully clothed, no lingerie framing.",
    paletteIndex: 0,
  },
  {
    id: "mirror_selfie",
    label: "Mirror Selfie",
    hint: "Full fit, eyes in the glass",
    userLine: "Mirror selfie — I want the whole outfit and your reflection.",
    sceneExtension:
      "SFW mirror selfie: mid-distance so head-to-toe outfit reads; bedroom, closet, or studio mirror; eyes connecting with reflection; one hip cocked or jacket half-on; warm practicals — tasteful, not boudoir unless era-appropriate outerwear only.",
    paletteIndex: 1,
  },
  {
    id: "bed_selfie",
    label: "Bed Selfie",
    hint: "Sheets, soft light, sweet energy",
    userLine: "Bed selfie — soft light, flirty-sweet, still SFW.",
    sceneExtension:
      "SFW bed selfie: seated on bed edge or kneeling on linens; knit sweater, sleep shirt, or lounge set appropriate to era; golden sidelight; tousled hair; intimate-cute expression; no cleavage-as-focus unless modest; no nudity.",
    paletteIndex: 2,
  },
  {
    id: "morning_selfie",
    label: "Morning Selfie",
    hint: "Messy hair, mug, golden haze",
    userLine: "Morning selfie — messy hair, steam or sunlight, just woke up cute.",
    sceneExtension:
      "SFW morning selfie: bathroom or kitchen rim light, steam or coffee mug; sleepy smile; robe tied closed or casual tee; fresh skin, believable AM clutter; phone slightly high angle; warm color grade — wholesome flirty, not explicit.",
    paletteIndex: 3,
  },
  {
    id: "gym_selfie",
    label: "Gym Selfie",
    hint: "Athletic, confident, post-workout glow",
    userLine: "Gym mirror selfie — athletic, confident, still appropriate.",
    sceneExtension:
      "SFW gym selfie: mirrored wall, tasteful athletic top; healthy glow, light sheen; headphones or towel prop; strong posture; fluorescent + window mix; environment reads real gym — no sexualized angles, no stripping.",
    paletteIndex: 4,
  },
  {
    id: "beach_selfie",
    label: "Beach Selfie",
    hint: "Sun, breeze, swim cover",
    userLine: "Beach selfie — sun, wind, and that smile.",
    sceneExtension:
      "SFW beach or boardwalk selfie: swim cover-up, rash guard, or modest resort wear per era (no explicit swim nudity); sun rim, salt breeze in hair; ocean bokeh; polarizing sky; sunscreen sheen optional — vacation-cute, catalog-safe.",
    paletteIndex: 5,
  },
  {
    id: "car_selfie",
    label: "Car Selfie",
    hint: "Dash glow, leather, golden hour",
    userLine: "Car selfie — golden hour through the window.",
    sceneExtension:
      "SFW car interior selfie: seatbelt on; dashboard glow + sunset through glass; streetlights bokeh; outfit fits their world (period car if vintage setting); flattering wide selfie arm; cinematic color — no crash-risk staging, no undressing.",
    paletteIndex: 6,
  },
  {
    id: "desk_selfie",
    label: "Desk Selfie",
    hint: "Monitor rim, study lamp, cozy",
    userLine: "Desk selfie — monitor glow, study lamp, you leaning in.",
    sceneExtension:
      "SFW desk / workspace selfie: monitor or candle-lamp rim on face; books, quill, holo-pad, or tools matching time period; cozy intellectual vibe; slight lean-in; shallow DOF; outfit everyday-smart — not office fetish staging.",
    paletteIndex: 7,
  },
  {
    id: "cute_aesthetic",
    label: "Cute Aesthetic",
    hint: "Editorial color, soft bloom",
    userLine: "Cute aesthetic selfie — soft editorial, very you.",
    sceneExtension:
      "SFW cute aesthetic selfie: pastel or jewel color story, gentle bloom, artful negative space; fashion-forward but innocent; tripod or steady hand; props minimal (flowers, ribbon, headphones) matching personality — Pinterest-soft, not lewd.",
    paletteIndex: 0,
  },
  {
    id: "flirty_face",
    label: "Flirty Face",
    hint: "Close crop, smirk, eye contact",
    userLine: "Close-up — flirty face, that look you save for me.",
    sceneExtension:
      "SFW tight portrait selfie: shoulders-up; playful smirk or lip bite (subtle); magnetic eye contact; soft beauty dish or window key; skin texture natural; outfit collar or strap visible but not cleavage-forward — tease in the eyes only.",
    paletteIndex: 1,
  },
  {
    id: "blowing_kiss",
    label: "Blowing Kiss",
    hint: "Hand to lips, charm",
    userLine: "Blow me a kiss for the camera~",
    sceneExtension:
      "SFW blowing-kiss selfie: hand at lips, cheek puff optional; wink or half-laugh; warm key; slightly wider than flirty-face crop so gesture reads; outfit visible at frame edge; charming rom-com energy — still modest coverage.",
    paletteIndex: 2,
  },
  {
    id: "peace_sign",
    label: "Peace Sign",
    hint: "V by eye or cheek — cute",
    userLine: "Peace sign selfie — extra cute, please.",
    sceneExtension:
      "SFW peace-sign selfie: V fingers near cheek or eye; bright friendly smile; slight head tilt; natural or ring light; casual outfit; playful K-pop / yearbook energy adapted to their era — no rude gestures, no lingerie focus.",
    paletteIndex: 3,
  },
  {
    id: "tongue_out",
    label: "Tongue Out",
    hint: "Playful, mischievous, still SFW",
    userLine: "Little tongue-out selfie — playful, not crude.",
    sceneExtension:
      "SFW playful selfie: tongue slightly out, mischievous eyes; sporty or casual outfit; crisp shutter; avoid overt sexual tongue framing; keep cute-mischief tone matching personality; bright upbeat background.",
    paletteIndex: 4,
  },
  {
    id: "seductive_stare",
    label: "Seductive Stare",
    hint: "Lower lids, still clothed heat",
    userLine: "Seductive stare into the lens — but keep it SFW.",
    sceneExtension:
      "SFW seductive stare selfie: heavy-lidded eyes, slow smile, unbroken eye contact; clothed neckline modest; moody split lighting; tension through gaze not undressing; noir-romance or editorial fashion — no nudity, no explicit gestures.",
    paletteIndex: 5,
  },
  {
    id: "shy_smile",
    label: "Shy Smile",
    hint: "Glance up through lashes",
    userLine: "Shy smile selfie — a little bashful, a lot pretty.",
    sceneExtension:
      "SFW shy smile selfie: eyes up through lashes or looking away then peeking; soft blush; hands tucked in sleeves or holding strap; diffused light; cozy sweater or modest dress; intimate sweetness without sexual explicitness.",
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
      "Lewd lingerie tease: set-appropriate lace/silk/garters for their time period; soft bedroom lamp; confident or shy micro-expression per personality; cleavage and legs suggested, not clinical; photoreal skin; same face/body as portrait — no full explicit spread unless personality is wild (still avoid gynecological close-up).",
    paletteIndex: 0,
  },
  {
    id: "topless_tease",
    label: "Topless Tease",
    hint: "Hands, hair, or sheet as cover",
    userLine: "Topless tease — cover just enough to drive me crazy.",
    sceneExtension:
      "Lewd topless tease: breasts partially or fully bare with hands, hair, or sheet artfully placed; heated eye contact; warm sidelight; bedroom or bathroom steam; photoreal; same anatomy as subject; no explicit genital focus.",
    paletteIndex: 1,
  },
  {
    id: "underboob",
    label: "Underboob",
    hint: "Crop lift, shadow under curve",
    userLine: "Underboob tease — that crop lift, slow and deliberate.",
    sceneExtension:
      "Lewd underboob framing: cropped top lifted or hem raised just enough to show under-curve and shadow; torso arch; moody contrast; belly and ribs tasteful; expression confident or bratty per persona; avoid explicit lower nudity.",
    paletteIndex: 2,
  },
  {
    id: "sideboob",
    label: "Sideboob",
    hint: "Profile or three-quarter",
    userLine: "Sideboob angle — profile heat.",
    sceneExtension:
      "Lewd sideboob: three-quarter or profile; open-side dress, loose tank, or unlaced corset; rim light tracing curve; shallow DOF; elegant silhouette; personality-driven pose — same identity lock.",
    paletteIndex: 3,
  },
  {
    id: "ass_focus",
    label: "Ass Focus",
    hint: "Hips, fabric, arch — tasteful thirst",
    userLine: "Focus on your ass — arch, fabric, that slow pose.",
    sceneExtension:
      "Lewd ass-focus still: thong, shorts bite, or skirt lift tastefully framed; back arch; glance over shoulder optional; warm tungsten or neon edge per setting; cellulite/skin texture real; thicc or athletic read matches forge body — not dehumanizing angle.",
    paletteIndex: 4,
  },
  {
    id: "bending_over",
    label: "Bending Over",
    hint: "Counter, bed, or chair lean",
    userLine: "Bend over for the shot — counter or bed, your call.",
    sceneExtension:
      "Lewd bending-over pose: hands on counter/back of chair/bed; lower back curve; skirt or shorts tension; face turned to camera or cheek to shoulder; intimate lamp light; tease level matches personality — avoid vulgar grimace.",
    paletteIndex: 5,
  },
  {
    id: "on_knees",
    label: "On Knees",
    hint: "Rug, bed edge, power dynamic",
    userLine: "On your knees — slow, deliberate, for the camera.",
    sceneExtension:
      "Lewd on-knees: rug or bed edge; thighs together or straddle-lite within lingerie; wrists loose on thighs or clasped; sub/dom flavor per personality matrix; warm fill + rim; fashion-thirst, not gang cliché.",
    paletteIndex: 6,
  },
  {
    id: "spreading_legs",
    label: "Spreading Legs",
    hint: "Reclined, lingerie on",
    userLine: "Legs spread tease — still in lingerie, I want the tension.",
    sceneExtension:
      "Lewd spreading legs: reclining on bed or chaise; thighs apart within panties or harness; arched lower back; moody color grade; emphasis on tension and fabric, not medical close-up; same person throughout.",
    paletteIndex: 7,
  },
  {
    id: "playing_with_self",
    label: "Playing With Self",
    hint: "Hand over fabric or skin",
    userLine: "Touch yourself where I’m staring — tease first.",
    sceneExtension:
      "Lewd self-touch through lingerie or along bare stomach/inner thigh; heavy-lidded eyes; parted lips; shallow DOF; hand placement suggestive but not explicit penetration frame unless user escalates in free text later.",
    paletteIndex: 0,
  },
  {
    id: "nipple_play",
    label: "Nipple Play",
    hint: "Sheer, pinch, ice-tease implied",
    userLine: "Nipple play tease — sheer, pinch, something wicked.",
    sceneExtension:
      "Lewd nipple play tease: sheer fabric, fingers brushing peak, or chain clamp jewelry implied; warm skin highlights; expression lost in sensation; editorial boudoir — explicit areola only if topless already fits tier and personality.",
    paletteIndex: 1,
  },
  {
    id: "wet_tshirt",
    label: "Wet T-Shirt",
    hint: "Cling, silhouette, steam",
    userLine: "Wet shirt cling — shower steam or rain.",
    sceneExtension:
      "Lewd wet T-shirt: fabric clinging to torso; steam or rain backlight; nipple silhouette optional; sports bra under optional; playful or sultry expression; cinematic water droplets — still lewd fashion, not full nude unless tier allows topless.",
    paletteIndex: 2,
  },
  {
    id: "skirt_flip",
    label: "Skirt Flip",
    hint: "Hem lift, cheeky flash",
    userLine: "Skirt flip tease — cheeky, quick, hot.",
    sceneExtension:
      "Lewd skirt flip: hem lifted at hip or back; glimpse of thigh or cheek within underwear; motion blur hint; wind or hand causation; flirty eye contact; school-uniform / pleated / leather per era — tasteful thirst.",
    paletteIndex: 3,
  },
  {
    id: "stockings_heels",
    label: "Stockings & Heels",
    hint: "Leg line, garters, chair pose",
    userLine: "Stockings and heels — leg line for days.",
    sceneExtension:
      "Lewd stockings & heels: seated or standing leg cross; garter straps; stiletto or period heel; sheer denier; chair or velvet settee; low camera hero-leg; dominant or coquette energy per personality; SFW upper framing or matching lingerie top.",
    paletteIndex: 4,
  },
  {
    id: "collar_leash",
    label: "Collar & Leash",
    hint: "Choker, chain, eye contact",
    userLine: "Collar and leash shot — make it ours.",
    sceneExtension:
      "Lewd collar & leash aesthetic: tasteful leather choker or O-ring; chain draped in hand or held toward camera; consensual power-play smirk; lingerie or strappy harness matching era; moody rim — no pet-play dehumanization tropes; adults-only fantasy.",
    paletteIndex: 5,
  },
];

export const SMART_NUDE_STYLES: SmartChatPhotoStyleOption[] = [
  {
    id: "fully_nude_standing",
    label: "Fully Nude Standing",
    hint: "Full body, honest light",
    userLine: "Fully nude standing — every line of you.",
    sceneExtension:
      "NSFW fully nude standing: contrapposto or neutral stance; full body in frame; natural skin texture and body hair if any; soft key + gentle fill; uncensored adult anatomy matching subject sex; same face and proportions as roster portrait.",
    paletteIndex: 0,
  },
  {
    id: "nude_on_bed",
    label: "Nude on Bed",
    hint: "Sheets, sprawl or curl",
    userLine: "Nude on the bed — sprawled or curled, I want all of it.",
    sceneExtension:
      "NSFW nude on bed: tangled linens; languid sprawl or fetal curl; hips and torso readable; warm tungsten or moonlight; eye contact or profile; explicit nudity; hands may grip sheets; same identity lock.",
    paletteIndex: 1,
  },
  {
    id: "nude_in_shower",
    label: "Nude in Shower",
    hint: "Steam, tiles, water trails",
    userLine: "Nude in the shower — steam, water, slow.",
    sceneExtension:
      "NSFW shower nude: steam-soft skin; water trails; tiled walls; glass fog partial; hand on wall or hair slicked; wet highlights on shoulders, breasts, hips; explicit nudity; cinematic lens flare optional.",
    paletteIndex: 2,
  },
  {
    id: "nude_from_behind",
    label: "Nude From Behind",
    hint: "Glance over shoulder",
    userLine: "From behind nude — look back at me.",
    sceneExtension:
      "NSFW rear three-quarter nude: glute and back muscle read; glance over shoulder; hair cascade; moody rim; optional mirror for face lock; explicit nudity from behind; same person — no duplicate limbs.",
    paletteIndex: 3,
  },
  {
    id: "legs_spread",
    label: "Legs Spread",
    hint: "Reclining explicit framing",
    userLine: "Legs spread — don’t hold back.",
    sceneExtension:
      "NSFW reclining nude legs spread: clear explicit genital framing as user requested; soft fill to reduce harsh shadow; flushed skin; gripping sheets; intimate eye contact; adult product tone; anatomy consistent with portrait.",
    paletteIndex: 4,
  },
  {
    id: "touching_herself",
    label: "Touching Herself",
    hint: "Self-pleasure, eye contact",
    userLine: "Touching yourself — I want to watch every second.",
    sceneExtension:
      "NSFW masturbation still: self-touch with explicit detail appropriate to anatomy; parted lips; arched back; cinematic light; maintain portrait identity; no extra hands; coherent pose.",
    paletteIndex: 5,
  },
  {
    id: "on_all_fours",
    label: "On All Fours",
    hint: "Bed or rug, arch, glance",
    userLine: "On all fours for me — slow arch, eyes up.",
    sceneExtension:
      "NSFW all-fours nude on bed or rug: back arch; knees and hands placement clear; glance to camera or forward; hair fall; explicit nudity; sensual not grotesque; same body type as reference.",
    paletteIndex: 6,
  },
  {
    id: "sitting_on_desk",
    label: "Sitting on Desk",
    hint: "After-hours, papers, lamp",
    userLine: "Nude on the desk — after-hours, risky.",
    sceneExtension:
      "NSFW nude seated on desk edge: papers, lamp, skyline or stone wall per era; legs dangling or one foot on chair; explicit nudity; power-play smirk; warm practicals — match time period props.",
    paletteIndex: 7,
  },
  {
    id: "bathtub_nude",
    label: "Bathtub Nude",
    hint: "Bubbles, candles, waterline",
    userLine: "Bathtub nude — candles, bubbles, skin above water.",
    sceneExtension:
      "NSFW bathtub nude: clawfoot or modern tub; candles; bubbles on skin; collarbones and thighs above waterline; wet hair; steam; explicit nudity where water reveals; romantic soak mood.",
    paletteIndex: 0,
  },
  {
    id: "window_nude",
    label: "Window Nude",
    hint: "Silhouette, rim, city or night",
    userLine: "Nude by the window — silhouette and rim on your skin.",
    sceneExtension:
      "NSFW window nude: cool exterior bokeh; warm interior bounce; silhouette with selective rim on curves; half-turn toward camera; explicit nudity when light reveals; glass condensation optional.",
    paletteIndex: 1,
  },
  {
    id: "against_wall",
    label: "Against Wall",
    hint: "Pressed back, hips forward",
    userLine: "Nude against the wall — pressed, waiting.",
    sceneExtension:
      "NSFW standing nude against wall: shoulder blades and palms contact; hips slightly forward; parted lips; narrow shaft of light across torso; explicit nudity; cinematic intimacy; brick, stone, or wallpaper per setting.",
    paletteIndex: 2,
  },
  {
    id: "mirror_nude",
    label: "Mirror Nude",
    hint: "Reflection doubles the heat",
    userLine: "Mirror nude — show me front and reflection.",
    sceneExtension:
      "NSFW mirror nude: full-length or three-quarter; reflection matches pose; phone visible optional; explicit nudity; warm tungsten mix; verify face consistency in mirror — same identity.",
    paletteIndex: 3,
  },
  {
    id: "oiled_body",
    label: "Oiled Body",
    hint: "Sheen, specular skin",
    userLine: "Oiled body shot — every highlight on you.",
    sceneExtension:
      "NSFW oiled nude: fine oil sheen on shoulders, chest, abs, thighs; specular highlights; neutral or dark backdrop; slow sensual pose; explicit nudity; premium skin rendering; same person.",
    paletteIndex: 4,
  },
  {
    id: "post_orgasm_glow",
    label: "Post-Orgasm Glow",
    hint: "Flushed, messy hair, bliss",
    userLine: "That after-glow look — flushed, messy, satisfied.",
    sceneExtension:
      "NSFW post-orgasm glow portrait: flushed cheeks and chest; messy damp hair; half-lidded bliss; tangled sheets or thigh touch; explicit relaxed nudity; tender aftercare energy; no partner visible unless silhouette implied — focus on subject.",
    paletteIndex: 5,
  },
];

export function smartPhotoStylesForTier(tier: FabSelfieTier): SmartChatPhotoStyleOption[] {
  if (tier === "nude") return SMART_NUDE_STYLES;
  if (tier === "lewd") return SMART_LEWD_STYLES;
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
  ],
  nude: [
    "from-purple-500/30 via-violet-950/85 to-black",
    "from-fuchsia-600/25 via-purple-950/90 to-black",
    "from-indigo-500/25 via-slate-950/90 to-black",
    "from-rose-600/30 via-purple-950/85 to-black",
    "from-violet-600/35 via-black to-fuchsia-950/80",
    "from-pink-500/25 via-rose-950/80 to-black",
    "from-blue-500/20 via-indigo-950/85 to-black",
    "from-red-900/40 via-purple-950/90 to-black",
  ],
} as const;

export function cardGradientForOption(tier: FabSelfieTier, paletteIndex: number): string {
  const list = SMART_MENU_CARD_GRADIENTS[tier];
  const cls = list[paletteIndex % list.length] ?? list[0];
  return `bg-gradient-to-br ${cls}`;
}
