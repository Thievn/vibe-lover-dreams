/**
 * Master chat image brief: **text-only** character bible (appearance + forge anchors) + scene.
 * No reference image is sent — instruct the model not to “copy” a profile JPEG; render from prose.
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
    return "Artistic intimate nude (Grok Imagine): fine-art boudoir or editorial silhouette — sensual, graceful, soft light; **no** crude anatomy, graphic acts, or pornographic staging. **One** consistent individual per the written Character appearance; believable photoreal body. Wardrobe absent only when the scene calls for nude; do not default to swimwear unless USER SCENE is beach/pool.";
  }
  if (m === "lewd") {
    return "Tasteful lewd: lingerie, sheer, wet fabric, silhouette, teasing poses — premium editorial / perfume-ad heat, **not** explicit porn staging or obscene wording. Same **identity** (face, hair, skin, build) as CHARACTER APPEARANCE — **wardrobe, pose, and room** only from USER SCENE / menu framing, not from any implied catalog photo. No generic bikini unless the scene calls for it.";
  }
  return "SFW — flirty, romantic, or cute; fully clothed for public-safe framing. Same individual as the **written** character description (face + body type). Outfit must fit THIS preset and USER SCENE.";
}

function timePeriodAesthetic(period: string): string {
  const p = {
    "Modern Day": "contemporary real-world: current fashion, current interiors, current phone/camera look unless the user names a set.",
    "Medieval Fantasy": "medieval / fantasy: fabrics, rooms, and props read period-true — not modern tech unless user asked.",
    "Ancient Greece/Mythology": "Hellenic / mythic: marble, drapery, mythic or temple light — not cyberpunk neon unless asked.",
    "Victorian Era": "Victorian / gaslight / high collars, corsetry where appropriate, period set dressing.",
    "Cyberpunk/Futuristic": "futuristic / neon / chrome / HUD reflections / synth atmosphere.",
    "Post-Apocalyptic": "wasteland grit, salvage, dust, hard sun, survival textures.",
    "Dark Fantasy": "gothic, candlelit, occult undertones — still the same character from the written profile, not a different model.",
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
  /**
   * User picked a concrete selfie/lewd preset (styled scene). Do not add competing random set/pose lines
   * or forge packshot anchors that read like the catalog portrait.
   */
  lockSceneToMenuPreset?: boolean;
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
  const { companion, dbComp, sceneRequest, rawUserMessage, menuImagePrompt, variationSeed, lockSceneToMenuPreset } = args;
  const menuSceneLock = lockSceneToMenuPreset === true;
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
  const shotVariation = menuSceneLock
    ? ""
    : shotVariationBlock(mood, variationHash);
  const explicit = isExplicitImageRequest(rawUserMessage) || isExplicitImageRequest(sceneRequest);
  const tierLine = explicit
    ? "Provider-safe adult tone: strong tease and artistic nude are fine — stay in **editorial / fine-art boudoir** language; avoid hardcore acts, graphic anatomy, or degrading angles. User crude phrasing will be rewritten server-side; your job is scene fidelity + staying faithful to the **written** character."
    : "Keep framing tasteful and story-led; default flattering portrait or boudoir tease unless the user clearly escalated.";

  const identity = [
    "— IDENTITY (TEXT BIBLE — NO REFERENCE PHOTO) —",
    "**No profile or roster image is supplied.** Do not try to duplicate, remaster, or “match pixels” to a card JPEG. Build **one** believable person who fits the **CHARACTER APPEARANCE** paragraph and forge metadata below — hair, skin, face shape, age read, species, and body type must read consistently with that prose.",
    menuSceneLock
      ? "— MENU PRESET LOCK — The **Requested framing (from menu)** section is the **sole** authority for **environment, wardrobe, pose, props, lighting, and camera**. Use the written profile **only** for **face, hair, skin, species, and body proportions** — not for background, outfit, or pose from any implied catalog/portrait shot."
      : "",
    "— SCENE-FIRST —",
    menuSceneLock
      ? "Ignore generic “vary the backdrop” or random alternate-set suggestions for this request — the menu preset already fixed the world. Tier/exposure lines are **tone band only**, not a second scene."
      : "USER SCENE / menu framing decides **location, outfit, pose, props, lighting, and camera**. The appearance text is **who** they are, not **which photograph** to recreate. Each still should feel like a **new** shoot, not a reskin of a catalog frame.",
    "— STYLIZED / CHIBI LORE —",
    "If the written profile or tags imply chibi, caricature, or non-photoreal marketing art, translate into **coherent photoreal** anatomy for this render unless USER SCENE explicitly asks for stylized output. Keep distinctive marks, hair, and vibe from the **words**.",
    "Likeness = continuity of **described** traits (face, hair, skin, build, species). Not a new random model, not a generic influencer — but also **not** “copy the card photo.”",
    "Forbidden: swapping ethnic appearance, face shape, or body type away from the written profile. Forbidden: de-aging, aging, or turning them into a different character.",
    menuSceneLock
      ? "The **same** described person stars in the shot; **wardrobe, background, light, and pose** follow the menu preset text, not any catalog frame."
      : "When the user or menu asks for a new outfit or location, **wardrobe, background, light, and pose must change** to match the scene; the **same** described person stars in each shot.",
    "— WARDROBE & SET —",
    menuSceneLock
      ? "Wardrobe, set, and props **only** as required by **Requested framing (from menu)** and USER SCENE — flavored by personality/time-period where the preset leaves room; never import a swimsuit/catalog outfit unless the preset implies it."
      : "Derive wardrobe only from USER SCENE + personality/time-period — not from guessing a swimsuit on an unseen card. When the scene implies wet fabric, lingerie, gym wear, etc., **design for that beat**.",
    menuSceneLock
      ? "Do not swap in a generic alternate backdrop (beach, pool, bedroom template) — stay faithful to the preset environment."
      : "Vary backgrounds across presets: different rooms, outdoor locations, weather, and props — avoid repeating the same beach/pool backdrop unless the user asked for it.",
  ].join(" ");

  const theming = [
    "— PERSONALITY + WORLD (theme every prop, line, and vibe) —",
    `Time period & world: ${profile.timePeriod}. ${timePeriodAesthetic(profile.timePeriod)}`,
    menuSceneLock
      ? "Five-axis voice — flavor **micro-expression, attitude, accessory taste, and how they wear the outfit**; **do not** replace the preset’s location or premise with a different set."
      : "Five-axis voice (all must flavor the image — wardrobe, micro-expression, and set):",
    seeds,
    menuSceneLock
      ? "Where the preset is silent on a detail, infer one tasteful fill-in that still matches that exact scene (not a genre switch)."
      : "Translate these into: fabric choices, set dressing, what they'd plausibly wear in-scene, how they hold the phone/camera, how bold or shy the expression is, and the emotional temperature of the light.",
  ].join("\n");

  const scene = [
    menuSceneLock
      ? "— USER-CHOSEN SCENE (EXECUTION PRIORITY #1 — NOT A PORTRAIT REMASTER) —"
      : "— USER SCENE (creative freedom inside identity lock) —",
    sceneRequest.trim() || "Flattering portrait-appropriate key art matching the matrix above.",
    menuSceneLock
      ? "Implement **Requested framing (from menu)** literally for **place, props, wardrobe, pose, camera distance, and light**. CHARACTER APPEARANCE (below) is **face, hair, skin, build, species only** — it must **not** pull pose, outfit, crop, or backdrop from any catalog/profile mental model."
      : "Honor specific user asks (shower, beach, bed, etc.) with accurate environment — same described person.",
    shotVariation,
    moodNsfwClauses(mood),
    tierLine,
  ]
    .filter(Boolean)
    .join(" ");

  const antiProfileRemaster = menuSceneLock
    ? "— HARD: NEW PHOTOSHOOT — This is **not** an edit, reskin, or “same shot different filter” of the roster portrait. You must change **composition, subject-to-environment relationship, and silhouette** vs a default glam bust-up unless the menu text explicitly demands that framing."
    : "";

  const tech = [
    "— CAPTURE / FRAMING —",
    menuSceneLock
      ? "Single-subject, vertical 2:3; match camera grammar implied by **Requested framing (from menu)** (phone selfie, mirror, tripod, environmental shot, etc.) and the time period; premium lens, coherent depth of field."
      : "Single-subject, vertical 2:3 card-style phone / mirror / tripod selfie or POV, matching the time period; premium lens, coherent depth of field.",
    "Photographic realism; match art direction:" + ` ${art}. Body-type anchor: ${bodyType}.`,
    "No duplicate faces, no collage, no watermark, no app UI, no on-image text, no disembodied parts unless the user explicitly asked.",
  ].join(" ");

  const charBlock = `CHARACTER APPEARANCE (primary likeness — text only): ${companion.name}, ${companion.gender}. ${(companion.appearance || "").trim().slice(0, 2000)}`;

  const appearanceStripForMenu =
    "**APPEARANCE-TEXT STRIP (gallery preset):** The CHARACTER APPEARANCE paragraph may repeat how she looks on a **roster / profile card**. For **this** render, mine it **only** for face shape, eyes, brows, nose, mouth, hair, skin, species markers, and body proportions. **Discard** any sentences about catalog outfit, cape, swimsuit, jewelry, throne room, studio backdrop, or “icon pose” if they disagree with **Requested framing (from menu)** — the menu wins 100% on clothes, location, pose, props, and camera.";

  const prompt = (
    menuSceneLock
      ? [
          "LUSTFORGE MASTER BRIEF — in-session gallery-preset still (scene-first; likeness from text only)",
          antiProfileRemaster,
          scene,
          identity,
          theming,
          tech,
          charBlock,
          appearanceStripForMenu,
        ]
      : [
          "LUSTFORGE MASTER BRIEF — in-session generative still (no reference image)",
          identity,
          theming,
          scene,
          tech,
          pack
            ? `— FORGE ORIGINAL IMAGE PROMPT (anchors: palette, vibe, era — NOT a shot to copy; wardrobe still follows USER SCENE): ${pack} Do not treat swimsuit/bikini/outfit wording here as the outfit lock unless USER SCENE explicitly matches swim/beach.`
            : "",
          charBlock,
        ]
  )
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 12_000);

  const portraitConsistencyLock = [
    `TEXT-ONLY CHARACTER LOCK for ${companion.name}: keep **face, hair, skin, species markers, and ${bodyType}** consistent with the written CHARACTER APPEARANCE block — do not invent a different person.`,
    menuSceneLock
      ? `Menu preset lock: **pose, outfit, background, props, and lighting** come only from PRIMARY SCENE / the **Requested framing (from menu)** block — not from forge packshots, packshot prose, or roster/profile portraits. **Ignore** any mental image of the stored card photo.`
      : `Body-type lock: ${bodyType} — limbs, torso scale, and species read must match the prose. **Pose, outfit, location, lens, and lighting** follow USER SCENE / PRIMARY SCENE.`,
    `Art & era: ${art} · time/world: ${profile.timePeriod} — props and set must plausibly belong in that world.`,
    !menuSceneLock && pack
      ? `Forge prompt anchors (mood/color/style hints only — not a framing mandate): ${pack.slice(0, 500)}`
      : "",
    "Wardrobe is invented per scene from USER SCENE — never assume a bikini/catalog outfit unless the scene calls for it.",
    "No reference photo: interpret likeness only from words; photoreal output should match the **described** eyes, nose, mouth, brows, and hair — no race-swap, no random substitute model.",
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
