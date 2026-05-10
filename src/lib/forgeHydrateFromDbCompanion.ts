import type { DbCompanion } from "@/hooks/useCompanions";
import type { ForgeStashPayload } from "@/lib/forgeDraftStash";
import { FORGE_ETHNICITY_ANY_LABEL, normalizeForgeEthnicity } from "@/lib/forgeEthnicities";
import { normalizeForgePersonality } from "@/lib/forgePersonalityProfile";
import { normalizeForgeArtStyle, normalizeForgeScene } from "@/lib/forgePortraitPrompt";
import { pickRandom, randomTraitCount } from "@/lib/forgeRandomSeeds";
import { parseForgeThemeSnapshotFromPersonalityForge } from "@/lib/forgeThemeSnapshot";
import {
  normalizeForgeCardPoseId,
  normalizeForgeTabFeatureMap,
  normalizeForgeTabSharedOverrides,
  normalizeForgeThemeTabId,
} from "@/lib/forgeThemeTabs";
import { normalizeForgeBodyType } from "@/lib/forgeBodyTypes";
import { FORGE_SPECIAL_FEATURES, normalizeForgeVisualTailoring } from "@/lib/forgeVisualTailoring";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";
import { normalizeIdentityAnatomyDetail } from "@/lib/identityAnatomyDetail";
import { FORGE_ACCENT_TRAIT_POOL, FORGE_ACCENT_TRAIT_SET } from "@/lib/forgeAccentTraits";

function traitsFromCompanionTags(tags: string[] | undefined): string[] {
  const poolHits = (tags || []).filter((t) => FORGE_ACCENT_TRAIT_SET.has(t) || (FORGE_SPECIAL_FEATURES as readonly string[]).includes(t));
  if (poolHits.length) return [...new Set(poolHits)].slice(0, 8);
  return pickRandom([...FORGE_ACCENT_TRAIT_POOL], randomTraitCount());
}

/**
 * Build a forge session payload from a `custom_characters` row mapped as `DbCompanion` (`cc-…` id).
 * Restores theme DNA from `personality_forge._forgeThemeV2` when present.
 */
export function forgeStashPayloadFromDbCompanion(c: DbCompanion): ForgeStashPayload {
  const snap = parseForgeThemeSnapshotFromPersonalityForge(c.personality_forge);
  const vt = snap?.visualTailoring ? normalizeForgeVisualTailoring(snap.visualTailoring) : normalizeForgeVisualTailoring(undefined);

  const themeBlock = snap
    ? {
        artStyle: normalizeForgeArtStyle(snap.artStyle),
        sceneAtmosphere: normalizeForgeScene(snap.sceneAtmosphere),
        bodyType: normalizeForgeBodyType(snap.bodyType),
        activeForgeTab: normalizeForgeThemeTabId(snap.activeForgeTab),
        forgeCardPose: normalizeForgeCardPoseId(snap.forgeCardPose),
        forgeTabFeatures: normalizeForgeTabFeatureMap(snap.forgeTabFeatures),
        forgeTabSharedOverrides: normalizeForgeTabSharedOverrides(snap.forgeTabSharedOverrides),
      }
    : {
        artStyle: normalizeForgeArtStyle(""),
        sceneAtmosphere: normalizeForgeScene(""),
        bodyType: normalizeForgeBodyType(""),
        activeForgeTab: normalizeForgeThemeTabId(undefined),
        forgeCardPose: normalizeForgeCardPoseId(undefined),
        forgeTabFeatures: normalizeForgeTabFeatureMap(undefined),
        forgeTabSharedOverrides: normalizeForgeTabSharedOverrides(undefined),
      };

  const portraitStill =
    (c.static_image_url && c.static_image_url.trim()) || (c.image_url && c.image_url.trim()) || (c.avatar_url && c.avatar_url.trim()) || null;
  const disp = portraitStill ? (stablePortraitDisplayUrl(portraitStill) ?? portraitStill) : null;

  return {
    savedAt: new Date().toISOString(),
    name: c.name || "",
    namePrefix: undefined,
    tagline: c.tagline || "",
    gender: c.gender && c.gender !== "—" ? c.gender : "Female",
    identityAnatomyDetail: normalizeIdentityAnatomyDetail(c.identity_anatomy_detail ?? undefined) || undefined,
    ethnicity: normalizeForgeEthnicity(FORGE_ETHNICITY_ANY_LABEL),
    forgePersonality: normalizeForgePersonality(c.personality_forge),
    ...themeBlock,
    traits: traitsFromCompanionTags(c.tags),
    orientation: c.orientation || "",
    extraNotes: "",
    referenceNotes: undefined,
    narrativeAppearance: c.appearance || "",
    chronicleBackstory: c.backstory || "",
    hookBio: c.bio || "",
    charterSystemPrompt: c.system_prompt || "",
    packshotPrompt: c.image_prompt || "",
    rosterTags: [...(c.tags || [])].slice(0, 12),
    rosterKinks: [...(c.kinks || [])].slice(0, 16),
    fantasyStartersJson: JSON.stringify(c.fantasy_starters?.length ? c.fantasy_starters : []),
    previewUrl: disp,
    previewCanonicalUrl: disp,
    visualTailoring: vt,
  };
}
