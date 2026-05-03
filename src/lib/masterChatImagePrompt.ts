/**
 * "Master" chat image brief: locks face/body to the main portrait, themes scene to the
 * companion's Personalities matrix, and fuses the user's free-text (or menu) request.
 * Used for Selfie / Lewd / Nude and future video stills.
 */
import type { Companion } from "@/data/companions";
import {
  inferForgeBodyTypeFromAppearance,
  inferForgeBodyTypeFromTags,
  inferStylizedArtFromTags,
} from "@/lib/forgeBodyTypes";
import {
  DEFAULT_FORGE_PERSONALITY,
  type ForgePersonalityProfile,
  forgePersonalitySeedsProse,
  inferForgePersonalityFromText,
  normalizeForgePersonality,
} from "@/lib/forgePersonalityProfile";
import {
  FAB_SELFIE,
  inferChatImageGenerationPrompt,
  isExplicitImageRequest,
  type FabSelfieTier,
} from "@/lib/chatImageSettings";
import type { DbCompanion } from "@/hooks/useCompanions";

function resolvePersonalityMatrix(companion: Companion): ForgePersonalityProfile {
  if (companion.personalityForge) {
    return normalizeForgePersonality(companion.personalityForge);
  }
  const seed = `${companion.personality}\n${companion.bio}\n${(companion.tags || []).join(" ")}`;
  return inferForgePersonalityFromText(seed, DEFAULT_FORGE_PERSONALITY);
}

/**
 * SFW / lewd / nude from raw user + optional menu tier.
 */
export function classifyChatImageMood(input: { rawUserMessage: string; menuBasePrompt: string | null }): FabSelfieTier {
  if (input.menuBasePrompt) {
    const m = input.menuBasePrompt.trim();
    const nudeBase = FAB_SELFIE.nude.imagePrompt;
    const lewdBase = FAB_SELFIE.lewd.imagePrompt;
    const sfwBase = FAB_SELFIE.sfw.imagePrompt;
    if (m === nudeBase || m.startsWith(`${nudeBase}\n`)) return "nude";
    if (m === lewdBase || m.startsWith(`${lewdBase}\n`)) return "lewd";
    if (m === sfwBase || m.startsWith(`${sfwBase}\n`)) return "sfw";
    return "sfw";
  }
  const t = input.rawUserMessage.toLowerCase();
  if (/\b(nude|naked|fully nude|send nude|nsfw|explicit|uncensored)\b/i.test(t) && !/\b(cute|clothed|outfit|sfw)\b/i.test(t)) {
    return "nude";
  }
  if (/\b(lewd|lingerie|topless|sheer|spicy|hot selfie)\b/i.test(t)) return "lewd";
  if (isExplicitImageRequest(input.rawUserMessage) && !/\b(cute|outfit|clothed|sweet)\b/i.test(t)) return "lewd";
  return "sfw";
}

function moodNsfwClauses(m: FabSelfieTier): string {
  if (m === "nude") {
    return "Artistic intimate nude (Grok Imagine): fine-art boudoir or editorial silhouette — sensual, graceful, soft light; **no** crude anatomy, graphic acts, or pornographic staging. Same face and identity as the reference; believable photoreal body. Wardrobe absent only when the scene calls for nude; never paste the roster catalog swimsuit onto a non-beach scene.";
  }
  if (m === "lewd") {
    return "Tasteful lewd: lingerie, sheer, wet fabric, silhouette, teasing poses — premium editorial / perfume-ad heat, **not** explicit porn staging or obscene wording. Same person as the reference. Match mood to personality and USER SCENE; vary sets — no profile bikini clone unless swim is the scene.";
  }
  return "SFW — flirty, romantic, or cute; fully clothed for public-safe framing. Same person as the reference, same face, same body proportions. Outfit must fit THIS preset (not automatically the roster swimsuit).";
}

function timePeriodAesthetic(period: string): string {
  const p = {
    "Modern Day": "contemporary real-world: current fashion, current interiors, current phone/camera look unless the user names a set.",
    "Medieval Fantasy": "medieval / fantasy: fabrics, rooms, and props read period-true — not modern tech unless user asked.",
    "Ancient Greece/Mythology": "Hellenic / mythic: marble, drapery, mythic or temple light — not cyberpunk neon unless asked.",
    "Victorian Era": "Victorian / gaslight / high collars, corsetry where appropriate, period set dressing.",
    "Cyberpunk/Futuristic": "futuristic / neon / chrome / HUD reflections / synth atmosphere.",
    "Post-Apocalyptic": "wasteland grit, salvage, dust, hard sun, survival textures.",
    "Dark Fantasy": "gothic, candlelit, occult undertones — still the same person as the reference, not a different model.",
    "Ancient Egypt": "Egyptian fantasy — gold, linen, kohl, sandstone or temple light; avoid random unrelated pantheons.",
    "1980s Retro": "80s color, grain, and fashion signifiers — not modern minimal unless mixed intentionally.",
    "Feudal Japan": "wabi aesthetic, shoji, ink-wash or period-accurate costume for the request.",
  } as const;
  return p[period as keyof typeof p] ?? "match the time period in wardrobe, set dressing, and prop logic.";
}

const MENU_TEASERS: Record<FabSelfieTier, string[]> = {
  sfw: [
    "Mmm… you want a peek? Alright, give me a second — I’ll make it cute, just for you. 📸",
    "Hehe, fine — you’re lucky I like you. Hold on; I want this one to look perfect.",
    "Okay, okay~ Let me get the angle. Don’t you dare look away~",
  ],
  lewd: [
    "You want me a little *indecent*? …Fine. Gimme a second — and don’t act innocent when you see it. 😈",
    "Oh? *That* kind of request? I’m blushing in the right places. One moment~",
    "Mischief unlocked. I’m about to be very unfair to your self-control. Hold on~",
  ],
  nude: [
    "Fuck, you don’t play fair, do you? Alright, love — give me a second. I’ll bare everything the way you like. 💋",
    "Mmm, you *really* want *all* of me on camera. Stay right there. Don’t you dare look away. 🔥",
    "Okay, darling. Deep breath. I’ll show you *everything* — but only because you beg so pretty~",
  ],
};

export function pickMenuImageTeaserLine(mood: FabSelfieTier): string {
  const list = MENU_TEASERS[mood] ?? MENU_TEASERS.sfw;
  return list[Math.floor(Math.random() * list.length)] ?? list[0] ?? "*smiles* One sec, love~";
}

export type MasterImagePromptArgs = {
  companion: Companion;
  dbComp: DbCompanion;
  /** Resolved brief (menu or inferred/typed) */
  sceneRequest: string;
  rawUserMessage: string;
  /** When set, the sceneRequest may be a menu base — still merged with theming. */
  menuImagePrompt: string | null;
  /** Randomizes micro-variation lines (setting / lens / pose nudge) so consecutive stills diverge. */
  variationSeed?: string;
};

function hashVariationSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function pickVariant<T>(arr: readonly T[], seed: number, salt: number): T {
  const idx = (seed + salt * 2654435761) % arr.length;
  return arr[idx]!;
}

function shotVariationBlock(mood: FabSelfieTier, seed: number): string {
  const lens = [
    "35mm storytelling lens, gentle distortion control",
    "50mm portrait, creamy bokeh, natural perspective",
    "24mm environmental selfie arm, slight wide character",
    "85mm compression, flattering face flattening",
  ] as const;
  const sfwSets = [
    "Balcony / window rim light with city or garden bokeh.",
    "Cafe nook, book stack, or study corner — lived-in props.",
    "Transit or street golden hour — motion-safe, candid energy.",
    "Soft studio corner with fabric backdrop — editorial SFW.",
  ] as const;
  const sfwPose = [
    "Slight hip shift + relaxed shoulders; eyes to lens.",
    "Three-quarter turn with chin low — friendly confidence.",
    "One hand in hair, phone slightly high — classic selfie geometry.",
    "Seated lean-forward — engaged, conspiratorial smile.",
  ] as const;
  const lewdSets = [
    "Velvet lounge or hotel lamp pool — warm pools of light.",
    "Steam-soft bathroom glass or marble — tasteful silhouette beats.",
    "Neon rim + deep shadow alley or private studio — cinematic tease.",
    "Sunset balcony with sheer curtain — wind and fabric motion.",
  ] as const;
  const lewdPose = [
    "Torso twist with weight on back foot — curve read without crude staging.",
    "Over-shoulder glance — **tasteful backshot** framing, fabric implying form.",
    "Seated edge-of-bed lean — knees angled, editorial lingerie grammar.",
    "Mirror three-quarter — outfit story legible, face still hero.",
  ] as const;
  const nudeSets = [
    "Fine-art boudoir: silk-draped chaise, single key light.",
    "Moonlit balcony silhouette — body as shape language, not graphic.",
    "Marble / steam atmosphere — highlights on collarbones and spine curve.",
    "Studio fog + black seamless — sculptural nude, graceful contrapposto.",
  ] as const;
  const nudePose = [
    "Arms loose, torso long — breath-in grace, no explicit spread.",
    "Seated twist, one knee raised — modest triangle composition.",
    "Standing profile or 3/4 — line of back and neck as focal curve.",
    "Sheet-wrap or fabric drape — implied nude, editorial restraint.",
  ] as const;

  if (mood === "nude") {
    return [
      "— SHOT VARIATION (randomized per request) —",
      `Set dressing bias: ${pickVariant(nudeSets, seed, 1)}`,
      `Pose family: ${pickVariant(nudePose, seed, 2)}`,
      `Lens / camera: ${pickVariant(lens, seed, 3)}.`,
    ].join(" ");
  }
  if (mood === "lewd") {
    return [
      "— SHOT VARIATION (randomized per request) —",
      `Set dressing bias: ${pickVariant(lewdSets, seed, 1)}`,
      `Pose family: ${pickVariant(lewdPose, seed, 2)}`,
      `Lens / camera: ${pickVariant(lens, seed, 3)}.`,
    ].join(" ");
  }
  return [
    "— SHOT VARIATION (randomized per request) —",
    `Set dressing bias: ${pickVariant(sfwSets, seed, 1)}`,
    `Pose family: ${pickVariant(sfwPose, seed, 2)}`,
    `Lens / camera: ${pickVariant(lens, seed, 3)}.`,
  ].join(" ");
}

/**
 * Produces the full `prompt` string and stronger `portraitConsistencyLock` for `invokeGenerateImage` / characterData.
 */
export function buildMasterChatImagePrompt(args: MasterImagePromptArgs): { prompt: string; portraitConsistencyLock: string } {
  const { companion, dbComp, sceneRequest, rawUserMessage, menuImagePrompt, variationSeed } = args;
  const profile = resolvePersonalityMatrix(companion);
  const seeds = forgePersonalitySeedsProse(profile).split("\n").map((l) => `  ${l}`).join("\n");
  const bodyType =
    inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
    inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
    "Average Build";
  const art = inferStylizedArtFromTags(dbComp.tags ?? []) ?? "Photorealistic";
  const pack = (dbComp.image_prompt || "").trim().slice(0, 900);
  const mood = classifyChatImageMood({ rawUserMessage, menuBasePrompt: menuImagePrompt });
  const seedStr =
    (variationSeed ?? "").trim() ||
    `${companion.id}:${sceneRequest.length}:${rawUserMessage.length}:${menuImagePrompt?.length ?? 0}`;
  const variationHash = hashVariationSeed(seedStr);
  const shotVariation = shotVariationBlock(mood, variationHash);
  const explicit = isExplicitImageRequest(rawUserMessage) || isExplicitImageRequest(sceneRequest);
  const tierLine = explicit
    ? "Provider-safe adult tone: strong tease and artistic nude are fine — stay in **editorial / fine-art boudoir** language; avoid hardcore acts, graphic anatomy, or degrading angles. User crude phrasing will be rewritten server-side; your job is scene fidelity + identity lock."
    : "Keep framing tasteful and story-led; default flattering portrait or boudoir tease unless the user clearly escalated.";

  const identity = [
    "— IDENTITY (ABSOLUTE, NON-NEGOTIABLE) —",
    "This must be the SAME person as the roster portrait: same face geometry, same eyes, nose, lips, jaw, skin or fur, hairline and hair style/color, same recognizable identity as the main profile image and appearance text.",
    "— STYLIZED / CHIBI / EXAGGERATED CARD ART —",
    "If the reference is chibi, super-deformed, caricature, giant-head/skinny-limbs, or otherwise non-photoreal: **do not** reproduce that broken anatomy. Translate into a **photoreal adult human** with believable head-to-body ratio and limbs while keeping the **same face character** (marks, eye shape, hair, vibe). The user wants them to look like a real person *resembling* the character, not a duplicate of warped card proportions unless they explicitly asked for stylized output.",
    "Treat the reference image as a face+identity lock: the output is a new pose/outfit/setting, NOT a new model, NOT a 'similar' influencer, NOT a reskin.",
    "Forbidden: swapping ethnic appearance, face shape, or body type. Forbidden: de-aging, aging, or turning them into a different character.",
    "If the user asks for a new outfit or location, only wardrobe, background, light, and pose may change; identity must remain identical.",
    "— WARDROBE & SET INDEPENDENCE (critical for chat stills) —",
    "Do NOT copy the roster portrait's clothing, swimsuit, bikini, armor, or catalog costume onto every generation. That card art is one marketing frame — each still gets a **fresh outfit and environment** that fits the USER SCENE below and this companion's time period / personality.",
    "When the scene implies wet fabric, lingerie, gym wear, etc., **design wardrobe for that scene** — e.g. a wet-shirt beat means thin soaked cotton clinging to skin (no default sports bra under unless the scene explicitly calls for one); do not snap back to the profile swimsuit because it was visible on the card.",
    "Vary backgrounds across presets: different rooms, outdoor locations, weather, and props — avoid repeating the same beach/pool backdrop unless the user asked for it.",
  ].join(" ");

  const theming = [
    "— PERSONALITY + WORLD (theme every prop, line, and vibe) —",
    `Time period & world: ${profile.timePeriod}. ${timePeriodAesthetic(profile.timePeriod)}`,
    "Five-axis voice (all must flavor the image — wardrobe, micro-expression, and set):",
    seeds,
    "Translate these into: fabric choices, set dressing, what they'd plausibly wear in-scene, how they hold the phone/camera, how bold or shy the expression is, and the emotional temperature of the light.",
  ].join("\n");

  const scene = [
    "— USER SCENE (creative freedom inside identity lock) —",
    sceneRequest.trim() || "Flattering portrait-appropriate key art matching the matrix above.",
    "Honor specific user asks (shower, beach, bed, etc.) with accurate environment — still the same person.",
    shotVariation,
    moodNsfwClauses(mood),
    tierLine,
  ]
    .filter(Boolean)
    .join(" ");

  const tech = [
    "— CAPTURE / FRAMING —",
    "Single-subject, vertical 2:3 card-style phone / mirror / tripod selfie or POV, matching the time period; premium lens, coherent depth of field.",
    "Photographic realism; match art direction:" + ` ${art}. Body-type anchor: ${bodyType}.`,
    "No duplicate faces, no collage, no watermark, no app UI, no on-image text, no disembodied parts unless the user explicitly asked.",
  ].join(" ");

  const charBlock = `Character: ${companion.name}, ${companion.gender}. ${(companion.appearance || "").trim().slice(0, 2000)}`;

  const prompt = [
    "LUSTFORGE MASTER BRIEF — in-session generative still",
    identity,
    theming,
    scene,
    tech,
    pack
      ? `— CATALOG CARD METADATA (palette & vibe hints only — NOT mandatory wardrobe): ${pack} Do not treat swimsuit/bikini/outfit wording here as the outfit lock for this shot unless USER SCENE explicitly matches it.`
      : "",
    charBlock,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12_000);

  const portraitConsistencyLock = [
    `ABSOLUTE IDENTITY: same individual as ${companion.name} — the reference still is the source of face and body. Do not invent a new person.`,
    `Body-type lock: ${bodyType} — all limbs, torso scale, and species read must match; gender presentation follows profile; only pose/outfit/setting/lighting vary per user request.`,
    `Art & era: ${art} · time/world: ${profile.timePeriod} — props, wardrobe, and set must plausibly belong in that world.`,
    pack
      ? `Catalog card flavor (colors/mood only; do not clone catalog garment onto every shot): ${pack.slice(0, 500)}`
      : "",
    "Outfit lock OFF for chat stills: mirror face/hair/body from reference — invent scene-appropriate wardrobe; never default every image to the same swimsuit/clothes shown on the roster card.",
    "Face lock: same eyes, nose, mouth, cheekbones, brows, and hair root as the reference. No race-swap, no 'similar model'. If the roster was stylized/chibi, photoreal output must still read as **this** face — normalize body to coherent human anatomy.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 8_000);

  return { prompt, portraitConsistencyLock };
}

/**
 * Infers a concrete scene from casual chat when we did not get a menu preset.
 */
export function buildSceneRequestForChatImage(rawUserMessage: string): string {
  const fromInfer = inferChatImageGenerationPrompt(rawUserMessage);
  if (fromInfer) return `${fromInfer}\n\nUser framing (verbatim lean): ${rawUserMessage.trim().slice(0, 2_000)}`;
  return rawUserMessage.trim().slice(0, 6_000);
}
