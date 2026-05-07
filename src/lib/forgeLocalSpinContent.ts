import { composeForgePortraitPrompt } from "@/lib/forgePortraitPrompt";
import { isOpenEthnicityChoice, normalizeForgeEthnicity } from "@/lib/forgeEthnicities";
import { forgeCompactStatureInstruction } from "@/lib/forgeBodyTypes";
import {
  forgePersonalityLabel,
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
  const eth = isOpenEthnicityChoice(ethnicity) ? "open" : normalizeForgeEthnicity(ethnicity);
  const traitLine = traits.length ? traits.join(", ") : "none listed";

  const tagline = `${forgePersonality.personalityType} · ${sceneAtmosphere}`;

  const narrativeAppearance =
    `They read as ${bodyType.toLowerCase()} — the kind of silhouette that ${artStyle.toLowerCase()} light catches honestly, not a catalog default. ` +
    `${isOpenEthnicityChoice(ethnicity) ? "Face and skin tone feel invented but coherent; " : `${eth} cues live in bone structure and warmth under the skin; `}` +
    `${sceneAtmosphere} is the air around them, and ${orientation.toLowerCase()} charge shows in how they hold eye contact. ` +
    (traits.length
      ? `Details worth remembering: ${traitLine} — worked into fabric, ink, or bearing, not read aloud as a list.`
      : `Every fold of costume and glance should feel intentional.`) +
    ` The vibe is ${forgePersonality.personalityType.toLowerCase()} without naming the forge menus — pure look and presence.`.slice(0, 12000);

  /** Chronicle = in-world story only; trait matrices already show under the card — never paste labeled Psychology / "traits in play" blocks. */
  const vibeWord = forgePersonality.relationshipVibe.split(/[,&]/)[0]?.trim().toLowerCase() ?? "tension";
  const p1 =
    `${displayName} did not arrive in anyone's life as a footnote. ` +
    `Somewhere under ${sceneAtmosphere.toLowerCase()} light, a habit formed — the way they pause before speaking, ` +
    `the way ${forgePersonality.speechStyle.toLowerCase()} rhythm turns ordinary air into something charged. ` +
    `They learned early that ${forgePersonality.timePeriod.toLowerCase()} habits of heart are hard to unlearn: ` +
    `what they want, what they fear, what they pretend not to need.\n\n`;

  const p2 =
    `A chapter worth telling: a night (or a season) when everything they usually control slipped — not as melodrama, but as the moment ` +
    `${displayName} realized ${vibeWord} could be honest instead of performed. ` +
    `That is the person under the ${bodyType.toLowerCase()} frame and ${gender.toLowerCase()} presentation: ` +
    `someone whose ${forgePersonality.sexualEnergy.toLowerCase()} energy is story, not a slider label.\n\n`;

  const p3 =
    `They still carry a private rule — what they will not trade for approval — and a softer one: what they will offer ` +
    `when trust finally shows up without a script. The people who matter learn it in scenes and confessions, ` +
    `not by hearing their character sheet read back to them.\n\n`;

  const lookDetail =
    traits.length > 0 ? `the way ${traitLine} shows in ink, metal, fabric, or posture` : `the small tells in how they dress and hold still`;
  const p4 =
    `If you met them tomorrow, you would notice the look first — the ${artStyle.toLowerCase()} read of them, ` +
    `${lookDetail} — ` +
    `then the story under it: why they smile like that, why they go quiet when touched a certain way, ` +
    `and what kind of partner could stand beside them without trying to fix what was never broken.`;

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
