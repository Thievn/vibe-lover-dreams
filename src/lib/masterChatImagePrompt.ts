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
    return "NSFW / adults-only. Full nudity allowed when it matches the user's request. Uncensored. Same real face and body as the reference — never a different person.";
  }
  if (m === "lewd") {
    return "Suggestive / lingerie / tease — lewd boudoir energy, not corporate headshot. Same person as the reference. Push heat that fits the personality matrix, not generic stock glamour.";
  }
  return "SFW — flirty, romantic, or cute; fully clothed for public-safe framing. Same person as the reference, same face, same body proportions.";
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
};

/**
 * Produces the full `prompt` string and stronger `portraitConsistencyLock` for `invokeGenerateImage` / characterData.
 */
export function buildMasterChatImagePrompt(args: MasterImagePromptArgs): { prompt: string; portraitConsistencyLock: string } {
  const { companion, dbComp, sceneRequest, rawUserMessage, menuImagePrompt } = args;
  const profile = resolvePersonalityMatrix(companion);
  const seeds = forgePersonalitySeedsProse(profile).split("\n").map((l) => `  ${l}`).join("\n");
  const bodyType =
    inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
    inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
    "Average Build";
  const art = inferStylizedArtFromTags(dbComp.tags ?? []) ?? "Photorealistic";
  const pack = (dbComp.image_prompt || "").trim().slice(0, 900);
  const mood = classifyChatImageMood({ rawUserMessage, menuBasePrompt: menuImagePrompt });
  const explicit = isExplicitImageRequest(rawUserMessage) || isExplicitImageRequest(sceneRequest);
  const tierLine = explicit ? "Explicit tone allowed for this scene when it matches the user's request and mood." : "Keep framing tasteful and story-led unless the user clearly asked for explicit nudity.";

  const identity = [
    "— IDENTITY (ABSOLUTE, NON-NEGOTIABLE) —",
    "This must be the SAME person as the roster portrait: same face geometry, same eyes, nose, lips, jaw, skin or fur, hairline and hair style/color, same body proportions, height scale, and species silhouette as the main profile image and appearance text.",
    "Treat the reference image as a face+body lock: the output is a new pose/outfit/setting, NOT a new model, NOT a 'similar' influencer, NOT a reskin.",
    "Forbidden: swapping ethnic appearance, face shape, or body type. Forbidden: de-aging, aging, or turning them into a different character.",
    "If the user asks for a new outfit or location, only wardrobe, background, light, and pose may change; identity must remain identical.",
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
    moodNsfwClauses(mood),
    tierLine,
  ]
    .filter(Boolean)
    .join(" ");

  const tech = [
    "— CAPTURE / FRAMING —",
    "Single-subject, vertical 9:16 or 2:3 phone / mirror / tripod selfie or POV, matching the time period; premium lens, coherent depth of field.",
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
    pack ? `— ORIGINAL CATALOG / PACKSHOT INTENT (light continuity): ${pack}` : "",
    charBlock,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12_000);

  const portraitConsistencyLock = [
    `ABSOLUTE IDENTITY: same individual as ${companion.name} — the reference still is the source of face and body. Do not invent a new person.`,
    `Body-type lock: ${bodyType} — all limbs, torso scale, and species read must match; gender presentation follows profile; only pose/outfit/setting/lighting vary per user request.`,
    `Art & era: ${art} · time/world: ${profile.timePeriod} — props, wardrobe, and set must plausibly belong in that world.`,
    pack ? `Design continuity with catalog packshot: ${pack.slice(0, 500)}` : "",
    "Face lock: same eyes, nose, mouth, cheekbones, brows, and hair root as the reference. No race-swap, no 'similar model', no art-style drift that would change identity (e.g. new face in photoreal).",
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
