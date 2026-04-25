import { composeForgePortraitPrompt } from "@/lib/forgePortraitPrompt";
import { isOpenEthnicityChoice, normalizeForgeEthnicity } from "@/lib/forgeEthnicities";
import { forgeCompactStatureInstruction } from "@/lib/forgeBodyTypes";
import {
  forgePersonalityLabel,
  forgePersonalitySeedsProse,
  forgePersonalityToArchetypeList,
  type ForgePersonalityProfile,
} from "@/lib/forgePersonalityProfile";
import { padDefaultStarters } from "@/lib/forgeLocalSpinStarters";

const KINK_POOL = [
  "slow burn",
  "praise and tension",
  "possessive focus",
  "vulnerable confessions",
  "teasing dominance",
  "emotional attunement",
  "ritual and anticipation",
  "aftermath tenderness",
] as const;

/**
 * Fills narrative fields from a random **local** mix only (no model call) — used by Companion Forge "spin".
 */
export function buildLocalSpinForgeFields(o: {
  displayName: string;
  gender: string;
  orientation: string;
  ethnicity: string;
  forgePersonality: ForgePersonalityProfile;
  artStyle: string;
  sceneAtmosphere: string;
  bodyType: string;
  traits: string[];
}): {
  tagline: string;
  narrativeAppearance: string;
  chronicleBackstory: string;
  hookBio: string;
  charterSystemPrompt: string;
  packshotPrompt: string;
  rosterTags: string[];
  rosterKinks: string[];
  fantasyStarters: { title: string; description: string }[];
} {
  const { displayName, gender, orientation, ethnicity, forgePersonality, artStyle, sceneAtmosphere, bodyType, traits } = o;
  const pl = forgePersonalityLabel(forgePersonality);
  const seeds = forgePersonalitySeedsProse(forgePersonality);
  const eth = isOpenEthnicityChoice(ethnicity) ? "open" : normalizeForgeEthnicity(ethnicity);
  const traitLine = traits.length ? traits.join(", ") : "none listed";

  const tagline = `${forgePersonality.personalityType} · ${sceneAtmosphere}`;

  const narrativeAppearance =
    `A ${gender.toLowerCase()} ${bodyType.toLowerCase()} figure staged in ${sceneAtmosphere} — ` +
    `${artStyle} rendering, ${orientation.toLowerCase()} energy. ` +
    `${isOpenEthnicityChoice(ethnicity) ? "Invent a coherent face and skin tone; " : `${eth} complexion cues; `}` +
    `the silhouette must read as "${bodyType}" first, not a stock default. ` +
    `Notable look details: ${traitLine}. The mood follows ${pl} — every fold of fabric and glance should feel intentional.`.slice(
      0,
      12000,
    );

  const p1 = `${displayName} moves through a world painted in ${artStyle} tones, anchored in ${sceneAtmosphere}. ` +
    `They carry ${forgePersonality.timePeriod} textures into how they love, fight, and surrender — the five Personalities lines are not a checklist: they are the reason their voice changes when the door locks.\n\n`;

  const p2 = `Psychology: ${seeds}\n\n`;

  const p3 =
    `Their body is staged as ${bodyType} — scale, mass, and species cues stay honest to that label, while gender (${gender}) shapes face and voice only. ` +
    `Traits in play: ${traitLine}. A turning point: they first noticed the user as more than a stranger when ${forgePersonality.relationshipVibe.toLowerCase()} tension stopped being theory and became breath.\n\n`;

  const p4 = `Wardrobe, kink, and aftercare are woven through the same story — not bullet tags. The reader should feel why ${displayName} craves the dynamic they do, and what they will not compromise on when desire runs hot.`;

  const chronicleBackstory = (p1 + p2 + p3 + p4).slice(0, 24000);

  const hookBio = `${displayName} — ${forgePersonality.personalityType} energy under ${artStyle} light, born for ${sceneAtmosphere}. ${pl}`.slice(
    0,
    12000,
  );

  const ethLine = isOpenEthnicityChoice(ethnicity)
    ? ""
    : ` Ancestry & complexion (visual): ${normalizeForgeEthnicity(ethnicity)}.`;
  const charterSystemPrompt =
    `You are ${displayName}, ${gender.toLowerCase()}, ${orientation}.${ethLine} **Personalities (voice + psychology):** ${pl}. Visual (scene is appearance — not personality): primary scene "${sceneAtmosphere}", ${artStyle} aesthetic. ${bodyType} body; notable visual traits: ${traits.join(", ") || "none specified"}. Speak and act consistently with this persona — the five Personalities picks must thread through every line of dialogue. Stay immersive; respect safe words immediately. When toy control fits the scene and the user consents, you may end messages with: {"lovense_command":{"command":"vibrate","intensity":0-20,"duration":5000}}. User flavor notes: none`.slice(
      0,
      32000,
    );

  const portraitText = narrativeAppearance;
  const packshotPrompt = composeForgePortraitPrompt({
    name: displayName,
    bodyType,
    genderPresentation: gender,
    ethnicitySeed: isOpenEthnicityChoice(ethnicity) ? undefined : normalizeForgeEthnicity(ethnicity),
    portraitAppearanceText: portraitText,
    personalityLabel: pl,
    vibeThemeLabel: "",
    artStyle,
    sceneAtmosphere,
    extraNotes: "",
    referenceNotes: "",
  }).slice(0, 8000);
  const withStature = `${forgeCompactStatureInstruction(bodyType)}${packshotPrompt}`.trim();

  const baseTags = [
    ...new Set(
      [
        ...forgePersonalityToArchetypeList(forgePersonality),
        artStyle,
        sceneAtmosphere,
        bodyType,
        ...traits,
      ]
        .map((t) => t.trim())
        .filter(Boolean),
    ),
  ].slice(0, 14);
  const rosterTags = baseTags;

  const rosterKinks = [...KINK_POOL].sort(() => Math.random() - 0.5).slice(0, 6);
  const fantasyStarters = padDefaultStarters([], displayName);

  return {
    tagline: tagline.slice(0, 240),
    narrativeAppearance,
    chronicleBackstory,
    hookBio,
    charterSystemPrompt,
    packshotPrompt: withStature,
    rosterTags,
    rosterKinks: rosterKinks.map(String),
    fantasyStarters,
  };
}
