/**
 * Master chat image brief: character bible (appearance + forge anchors) + scene.
 * Likeness = face, hair, eyes, lips, hands, legs, body, species from prose (and optional roster portrait URL downstream for identity-only — never the card’s backdrop or outfit).
 */
import type { Companion } from "@/data/companions";
import { inferForgeBodyTypeFromAppearance, inferForgeBodyTypeFromTags } from "@/lib/forgeBodyTypes";
import { resolveChatArtStyleLabel } from "@/lib/chatArtStyle";
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
import {
  CHARACTER_REFERENCE_INTRO_LINES,
  resolveEffectiveCharacterReference,
} from "@/lib/characterReferenceImagePrompt";
import { MOMENTS_EXPLICIT_TIER_LINE, MOMENTS_SF_TIER_LINE } from "@/lib/chatMomentsImaginePrompt";
import { buildCompanionVisualIdentityCapsule } from "@/lib/buildCompanionVisualIdentityCapsule";
import {
  CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK,
  CHAT_LIKENESS_SCENE_FORBIDDEN_INLINE,
  CHAT_LIKENESS_SUBJECT_FEATURES_INLINE,
  chatLikenessSameSubjectMandate,
} from "@/lib/chatLikenessAnchors";

function resolvePersonalityMatrix(companion: Companion): ForgePersonalityProfile {
  if (companion.personalityForge) {
    return normalizeForgePersonality(companion.personalityForge);
  }
  const seed = `${companion.personality}\n${companion.bio}\n${(companion.tags || []).join(" ")}`;
  return inferForgePersonalityFromText(seed, DEFAULT_FORGE_PERSONALITY);
}

/**
 * SFW vs sensual (`lewd` key) from raw user + optional menu tier. Explicit phrasing maps to sensual, not a separate nude tier.
 */
export function classifyChatImageMood(input: { rawUserMessage: string; menuBasePrompt: string | null }): FabSelfieTier {
  if (input.menuBasePrompt) {
    const m = input.menuBasePrompt.trim();
    const lewdBase = FAB_SELFIE.lewd.imagePrompt;
    const sfwBase = FAB_SELFIE.sfw.imagePrompt;
    if (m === lewdBase || m.startsWith(`${lewdBase}\n`)) return "lewd";
    if (m === sfwBase || m.startsWith(`${sfwBase}\n`)) return "sfw";
    return "sfw";
  }
  const t = input.rawUserMessage.toLowerCase();
  if (
    /\b(nude|naked|fully nude|send nude|nsfw|explicit|uncensored)\b/i.test(t) &&
    !/\b(cute|clothed|outfit|sfw)\b/i.test(t)
  ) {
    return "lewd";
  }
  if (/\b(lewd|lingerie|topless|sheer|spicy|hot selfie)\b/i.test(t)) return "lewd";
  if (isExplicitImageRequest(input.rawUserMessage) && !/\b(cute|outfit|clothed|sweet)\b/i.test(t)) return "lewd";
  return "sfw";
}

function moodNsfwClauses(m: FabSelfieTier): string {
  if (m === "lewd") {
    return "Sensual Moments tier (Grok Imagine): lingerie, sheer layers, silk sheets, wet fabric with coverage, short shorts, tanks, steam/sheer silhouette, sheet-drape editorial — perfume-ad / fashion heat only, **not** porn staging. **Identity:** obey CHARACTER REFERENCE + written profile (face, hair, eyes, skin tone, body type, tattoos) — **do not change facial features**; **wardrobe, pose, room** only from USER SCENE / menu. **Forbidden:** no bare skin below tasteful coverage in lower frame, no visible genitals, no explicit sexual acts, no phone or smartphone visible, no deformed anatomy. No generic bikini unless the scene calls for it.";
  }
  return "SFW — flirty, romantic, or cute; fully clothed for public-safe framing. Same individual as the **written** character description (face, eyes, lips, hair, hands, legs, body type); **do not change facial features**. Outfit must fit THIS preset and USER SCENE.";
}

function timePeriodAesthetic(period: string): string {
  const p = {
    "Modern Day":
      "contemporary real-world: current fashion, current interiors, contemporary digital-camera / sensor look unless the user names a set.",
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
    "Mmm… you want a peek? Alright — give me a second. I’ll angle the light, bite my lip just a little, and send you something *very* cute. Don’t look away. 📸",
    "Hehe, fine — you’re lucky I like you. Hold on; I want you to feel this one in your chest when it lands.",
    "Okay, okay~ Let me find the sweet spot — soft smile, eyes only for you. One sec, love~",
  ],
  lewd: [
    "You want me a little *dirty-cute*? …Fine. Gimme a second — fabric, shadow, and a smile that knows exactly what it’s doing. 😈",
    "Oh? *That* kind of request? I’m warm already. One moment — I’m going to make you regret asking so politely~",
    "Mischief unlocked. Lingerie logic, slow breath, eyes on you. Hold on — this one’s for your imagination, not your innocence~",
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
    "24mm environmental portrait, slight wide — arm-extended front-camera POV or mirror shot with **no smartphone visible**",
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
    "One hand in hair, arm-extended POV — **no phone or screen visible**.",
    "Doorway or wall lean — engaged smile; **no chair** unless scene names one.",
  ] as const;
  const lewdSets = [
    "Warm spotlight in a private interior — standing or lean; avoid random armchair hero props.",
    "Steam-soft bathroom glass or marble — tasteful silhouette beats.",
    "Neon rim + deep shadow alley or corridor — cinematic tease on foot.",
    "Sunset balcony with sheer curtain — wind and fabric motion at the railing.",
  ] as const;
  const lewdPose = [
    "Torso twist with weight on back foot — curve read without crude staging.",
    "Over-shoulder glance — **tasteful backshot** framing, fabric implying form.",
    "Standing at vanity or mirror edge — editorial lingerie grammar; **no dining chair**.",
    "Mirror three-quarter — outfit story legible, face still hero.",
  ] as const;
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
export function buildMasterChatImagePrompt(args: MasterImagePromptArgs): {
  prompt: string;
  portraitConsistencyLock: string;
  /** Passed to Edge `generate-image` for menu-lock echo in Character Details. */
  visualIdentityCapsule?: string;
} {
  const { companion, dbComp, sceneRequest, rawUserMessage, menuImagePrompt, variationSeed, lockSceneToMenuPreset } = args;
  const menuSceneLock = lockSceneToMenuPreset === true;
  const visualIdentityCapsule = menuSceneLock ? buildCompanionVisualIdentityCapsule(companion, dbComp) : undefined;
  const profile = resolvePersonalityMatrix(companion);
  const seeds = forgePersonalitySeedsProse(profile).split("\n").map((l) => `  ${l}`).join("\n");
  const bodyType =
    inferForgeBodyTypeFromTags(dbComp.tags ?? []) ??
    inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
    "Average Build";
  const art = resolveChatArtStyleLabel(dbComp);
  const pack = (dbComp.image_prompt || "").trim().slice(0, 900);
  const mood = classifyChatImageMood({ rawUserMessage, menuBasePrompt: menuImagePrompt });
  const nexusHybrid = Boolean(dbComp.is_nexus_hybrid);
  const nonPhotorealArtLane =
    /\b(anime|manga|cel[-\s]?shad|illustrat|chibi|pixel|watercolor|oil\s+painting|fantasy\s+illustration|comic|cartoon|digital\s+painting|ghibli|hentai|yaoi|yuri|graphic\s+novel|2d\b|stylized\s*\/\s*illustrated|painterly|low[-\s]?poly)\b/i.test(
      art,
    );
  const seedStr =
    (variationSeed ?? "").trim() ||
    `${companion.id}:${sceneRequest.length}:${rawUserMessage.length}:${menuImagePrompt?.length ?? 0}`;
  const variationHash = hashVariationSeed(seedStr);
  const shotVariation = menuSceneLock
    ? ""
    : shotVariationBlock(mood, variationHash);
  const explicit = isExplicitImageRequest(rawUserMessage) || isExplicitImageRequest(sceneRequest);
  const tierLine = explicit ? MOMENTS_EXPLICIT_TIER_LINE : MOMENTS_SF_TIER_LINE;

  const identity = [
    "— IDENTITY (TEXT BIBLE — ROSTER PORTRAIT = LIKENESS ONLY IF SUPPLIED) —",
    chatLikenessSameSubjectMandate(companion.name),
    `**Prose-first bible.** When a roster portrait HTTPS URL is supplied to the image step, use it **only** for ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE} — **never** import ${CHAT_LIKENESS_SCENE_FORBIDDEN_INLINE}. Do not duplicate, remaster, or “match pixels” to a **catalog composition**. Build **one** believable person who fits **CHARACTER APPEARANCE** and forge metadata — eyes, lips, hands, legs, hair, skin, face shape, age read, species, and body type must read consistently with that prose.`,
    menuSceneLock
      ? "— MENU PRESET LOCK — The **Requested framing (from menu)** section is the **sole** authority for **environment, wardrobe, pose, props, lighting, and camera**. Use the written profile (and optional portrait URL) **only** for **face, eyes, lips, hair, hands, legs, skin, species, and body proportions** — not for background, outfit, or pose from any implied catalog/portrait shot."
      : "",
    "— SCENE-FIRST —",
    menuSceneLock
      ? "Ignore generic “vary the backdrop” or random alternate-set suggestions for this request — the menu preset already fixed the world. Tier/exposure lines are **tone band only**, not a second scene."
      : "USER SCENE / menu framing decides **location, outfit, pose, props, lighting, and camera**. The appearance text is **who** they are, not **which photograph** to recreate. Each still should feel like a **new** shoot, not a reskin of a catalog frame.",
    ...(nonPhotorealArtLane
      ? ([
          "— STYLIZED RENDERING LANES —",
          `This character’s **art direction** is **${art}** — preserve authentic stylized / illustrated / anime discipline as implied by that label and CHARACTER APPEARANCE; **do not** flatten into unrelated photoreal unless USER SCENE explicitly demands a deliberate medium switch.`,
        ] as const)
      : ([
          "— STYLIZED / CHIBI LORE —",
          "If the written profile or tags imply chibi, caricature, or non-photoreal marketing art, translate into **coherent photoreal** anatomy for this render unless USER SCENE explicitly asks for stylized output. Keep distinctive marks, hair, and vibe from the **words**.",
        ] as const)),
    "Likeness = continuity of **described** traits (face, eyes, lips, hair, hands, legs, skin, build, species). Not a new random model, not a generic influencer — but also **not** “copy the card photo’s scene or pose.”",
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
      : "Translate these into: fabric choices, set dressing, what they'd plausibly wear in-scene, how they relate to the lens (arm-extended POV, mirror glance, tripod) — **no smartphone visible** unless a period-accurate film camera is explicitly scene-appropriate — how bold or shy the expression is, and the emotional temperature of the light.",
  ].join("\n");

  const scene = [
    menuSceneLock
      ? "— USER-CHOSEN SCENE (EXECUTION PRIORITY #1 — NOT A PORTRAIT REMASTER) —"
      : "— USER SCENE (creative freedom inside identity lock) —",
    sceneRequest.trim() || "Flattering portrait-appropriate key art matching the matrix above.",
    !menuSceneLock && rawUserMessage.trim()
      ? `— USER MESSAGE (verbatim setting / pose / outfit — do not collapse to catalog sofa or roster backdrop) —\n${rawUserMessage.trim()}`
      : "",
    menuSceneLock
      ? "Implement **Requested framing (from menu)** literally for **place, props, wardrobe, pose, camera distance, and light**. CHARACTER APPEARANCE (below) is **face, hair, skin, build, species only** — it must **not** pull pose, outfit, crop, or backdrop from any catalog/profile mental model."
      : "Honor specific user asks (shower, beach, snowy cabin, bed, etc.) with accurate environment — same described person; **never** substitute the roster portrait’s interior when the user named a different place.",
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
    CHAT_IMAGINE_NO_DEFAULT_CHAIR_BLOCK,
    menuSceneLock
      ? "Single-subject, vertical 2:3; match camera grammar implied by **Requested framing (from menu)** (natural selfie POV, mirror, tripod, environmental shot, etc.) — **avoid a visible smartphone in hand** — and the time period; premium lens, coherent depth of field."
      : "Single-subject, vertical 2:3 card-style natural selfie POV, mirror, tripod, or partner-held frame — **no phone visible** — matching the time period; premium lens, coherent depth of field.",
    nonPhotorealArtLane
      ? `Match art direction: **${art}** — same rendering discipline and material read throughout the frame. Body-type anchor: ${bodyType}.`
      : "Photographic realism; match art direction:" + ` ${art}. Body-type anchor: ${bodyType}.`,
    "No duplicate faces, no collage, no watermark, no app UI, no on-image text, no disembodied parts unless the user explicitly asked.",
  ].join(" ");

  const coreLook = (resolveEffectiveCharacterReference(dbComp) ?? "").trim();
  const longAppear = (companion.appearance || "").trim();
  const characterRefPreamble = coreLook
    ? [
        "— CHARACTER REFERENCE (READ FIRST — EXECUTE BEFORE ANY SCENE TEXT) —",
        CHARACTER_REFERENCE_INTRO_LINES,
        "",
        coreLook.slice(0, 2000),
        "",
        "Keep the exact same face, hair, eyes, body type, skin tone, distinctive marks, and rendering style as the main portrait and this reference — identity is not negotiable.",
        "",
        "---",
        "",
      ].join("\n")
    : "";

  const charBlock = coreLook
    ? longAppear && longAppear !== coreLook
      ? `CHARACTER APPEARANCE supplement (must match CHARACTER REFERENCE above — text only, no outfit/scene): ${companion.name}, ${companion.gender}. ${longAppear.slice(0, 1200)}${longAppear.length > 1200 ? "…" : ""}`
      : `CHARACTER APPEARANCE: identity locked by CHARACTER REFERENCE block above — ${companion.name}, ${companion.gender}.`
    : `CHARACTER APPEARANCE (primary likeness — text only): ${companion.name}, ${companion.gender}. ${longAppear.slice(0, 2000)}`;

  const appearanceStripForMenu = `**APPEARANCE-TEXT STRIP (gallery preset):** The CHARACTER APPEARANCE paragraph may repeat how she looks on a **roster / profile card**. For **this** render, mine it **only** for ${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE}. **Discard** any sentences about catalog outfit, cape, swimsuit, jewelry, throne room, studio backdrop, or “icon pose” if they disagree with **Requested framing (from menu)** — the menu wins 100% on clothes, location, pose, props, and camera. **Demote** mood-only lines (heavy smoke, fog, haze, lens-flare poetry, club strobes) unless the **menu** explicitly asks for that vibe — they must not steal detail budget from a **clear face, hands, and figure**.`;

  const strongPortraitLead = [
    "— STRONG PORTRAIT & ART-STYLE LOCK (READ BEFORE ALL OTHER SECTIONS) —",
    "Use this exact character's face, hair style, eye color, body type, tattoos, piercings, species marks, and overall appearance exactly as reference.",
    "Maintain 100% consistency with the main profile / roster portrait (HTTPS likeness URL when supplied) AND the CHARACTER REFERENCE / CHARACTER APPEARANCE blocks in this brief.",
    `Match the **same art style and rendering discipline** as that portrait (**${art}**) — do not drift to a different model, different ethnicity, different body silhouette, or a mismatched medium (e.g. photoreal wash on an anime subject). Generic catalog poses are forbidden when they contradict the reference.`,
    "Only change pose, outfit, wardrobe state, background, environment, props, lighting, and camera per PRIMARY SCENE / menu or USER SCENE.",
    nexusHybrid
      ? "**Nexus Forge companion:** EXTRA strict DNA lock — face, hair, eyes, body, species anatomy, and palette must match the vault portrait; reference + portrait override generic glam defaults."
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const prompt = (
    menuSceneLock
      ? [
          strongPortraitLead,
          characterRefPreamble,
          "LUSTFORGE MASTER BRIEF — in-session gallery-preset still (scene-first; subject likeness from CHARACTER APPEARANCE + optional roster portrait URL; scene from menu)",
          antiProfileRemaster,
          scene,
          visualIdentityCapsule ?? "",
          identity,
          theming,
          tech,
          charBlock,
          appearanceStripForMenu,
        ]
      : [
          strongPortraitLead,
          characterRefPreamble,
          "LUSTFORGE MASTER BRIEF — in-session generative still (likeness from CHARACTER APPEARANCE; scene from USER SCENE — not the card backdrop)",
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
    `Use this exact character's face, hair style, eye color, body type, tattoos, piercings, species marks, and overall appearance exactly as reference. Maintain 100% consistency with the main portrait and CHARACTER APPEARANCE — only change pose, outfit, background, and scene per PRIMARY SCENE / menu.`,
    `CHARACTER LOCK for ${companion.name}: keep **${CHAT_LIKENESS_SUBJECT_FEATURES_INLINE}** and **${bodyType}** consistent with CHARACTER APPEARANCE — do not invent a different person. **Face-first:** atmosphere (smoke, fog, particles, dramatic backlight) stays **subordinate** to a readable face unless the menu scene text explicitly demands that effect.`,
    menuSceneLock
      ? `Menu preset lock: **pose, outfit, background, props, and lighting** come only from PRIMARY SCENE / the **Requested framing (from menu)** block — not from forge packshots, packshot prose, or roster/profile portrait **environments**. **Ignore** the card photo as a **location or wardrobe** template.`
      : `Body-type lock: ${bodyType} — limbs, torso scale, and species read must match the prose. **Pose, outfit, location, lens, and lighting** follow USER SCENE / PRIMARY SCENE.`,
    `Art & era: ${art} · time/world: ${profile.timePeriod} — props and set must plausibly belong in that world.`,
    !menuSceneLock && pack
      ? `Forge prompt anchors (mood/color/style hints only — not a framing mandate): ${pack.slice(0, 500)}`
      : "",
    "Wardrobe is invented per scene from USER SCENE — never assume a bikini/catalog outfit unless the scene calls for it.",
    "Likeness channel: a roster portrait URL (when supplied) is **identity only** — never copy that still’s backdrop, crop, pose, or costume unless the menu explicitly matches. **Text-only path:** if no URL, interpret the same subject-feature list from CHARACTER APPEARANCE only — no race-swap, no substitute model, no continuity to a marketing still’s **scene**.",
  ]
    .filter(Boolean)
    .join(" ")
    .slice(0, 8_000);

  return { prompt, portraitConsistencyLock, visualIdentityCapsule };
}

/**
 * Infers a concrete scene from casual chat when we did not get a menu preset.
 */
export function buildSceneRequestForChatImage(rawUserMessage: string): string {
  const fromInfer = inferChatImageGenerationPrompt(rawUserMessage);
  if (fromInfer) return `${fromInfer}\n\nUser framing (verbatim lean): ${rawUserMessage.trim().slice(0, 2_000)}`;
  return rawUserMessage.trim().slice(0, 6_000);
}
