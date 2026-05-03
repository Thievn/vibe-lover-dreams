/**
 * Dense, deterministic **looks + render style** block for chat gallery stills.
 * Scene (pose, outfit, room, camera) comes from the menu only — this capsule is identity + art discipline.
 */
import type { Companion } from "@/data/companions";
import type { DbCompanion } from "@/hooks/useCompanions";
import {
  forgeBodyCategoryIdForType,
  inferForgeBodyTypeFromAppearance,
  inferForgeBodyTypeFromTags,
  inferStylizedArtFromTags,
  normalizeForgeBodyType,
} from "@/lib/forgeBodyTypes";

/** Sentences that usually describe the roster card / marketing still, not portable likeness. */
const SCENE_CONTAMINATION =
  /\b(beach|ocean|poolside|swimsuit|bikini|standing on sand|tropical shore|catalog|packshot|roster card|marketing still|studio backdrop|icon pose|same outfit as the card)\b/i;

const CURVE_HINTS =
  /\b(hyper[-\s]?breast|hyper[-\s]?ass|hyper[-\s]?thicc|hourglass extreme|busty|large bust|big bust|wide hips|thick thighs|curvy|voluptuous|muscular|six[-\s]?pack|abs definition)\b/i;

function stripSceneHeavySentences(text: string, maxChars: number): string {
  const raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const parts = raw
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !SCENE_CONTAMINATION.test(s));
  const joined = parts.join(" ").trim();
  if (joined.length <= maxChars) return joined;
  return `${joined.slice(0, maxChars).trimEnd()}…`;
}

function renderingDisciplineLine(art: string): string {
  const a = art.toLowerCase();
  if (/\b(anime|manga|chibi|cel|2d|hentai|yuri|yaoi|ghibli|pixel)\b/.test(a)) {
    return `**Rendering discipline:** Match **${art}** — authentic stylized 2D / illustrated look where applicable; do not “photoreal wash” an anime or chibi subject unless the character is explicitly hybrid photoreal.`;
  }
  if (/\b(blob|slime|goo|inflatable|wireframe|glitch|holographic|elemental)\b/.test(a)) {
    return `**Rendering discipline:** Match **${art}** — creature / non-standard anatomy and materials as written; coherent volume and readable silhouette.`;
  }
  return `**Rendering discipline:** Match **${art}** — coherent photoreal (or painterly where the label implies) with premium skin, hair, and material read.`;
}

function figureNotesFromTagsAndText(tags: string[], cleanedAppearance: string): string | null {
  const blob = [...tags, cleanedAppearance].join(" ").toLowerCase();
  if (!CURVE_HINTS.test(blob)) return null;
  const hits = tags.filter((t) => CURVE_HINTS.test(t));
  if (hits.length) return `**Figure / musculature cues (from forge tags):** ${hits.slice(0, 6).join("; ")}.`;
  const snip = cleanedAppearance.match(/.{0,180}\b(muscular|curvy|bust|hips|thicc|toned|athletic|petite|tall|hourglass)\b.{0,120}/i);
  if (snip) return `**Figure cues (from appearance text):** ${snip[0].trim().slice(0, 220)}`;
  return "**Figure cues:** honor the forge body-type label and any explicit musculature / curves in the filtered appearance text.";
}

/**
 * Returns markdown (no outer heading) suitable for embedding in the master chat image prompt.
 */
export function buildCompanionVisualIdentityCapsule(companion: Companion, dbComp: DbCompanion): string {
  const tags = dbComp.tags ?? [];
  const resolvedBody =
    inferForgeBodyTypeFromTags(tags) ??
    inferForgeBodyTypeFromAppearance(dbComp.appearance) ??
    inferForgeBodyTypeFromAppearance(companion.appearance) ??
    "Average Build";
  const bodyType = normalizeForgeBodyType(resolvedBody);
  const art = inferStylizedArtFromTags(tags) ?? "Photorealistic";
  const silCat = forgeBodyCategoryIdForType(bodyType);
  const idAnatomy = (dbComp.identity_anatomy_detail ?? "").trim().slice(0, 280);

  const appearanceSource = (companion.appearance || dbComp.appearance || "").trim();
  const cleaned = stripSceneHeavySentences(appearanceSource, 900);
  const figureLine = figureNotesFromTagsAndText(tags, cleaned);

  const lines = [
    "**FORGE_VISUAL_IDENTITY (binding — looks + art style only; NOT outfit, pose, room, or catalog photo):**",
    renderingDisciplineLine(art),
    `**Silhouette category:** ${silCat} — **forge body type:** ${bodyType} (show this build clearly; correct species / hybrid / non-human mass when the label implies it).`,
    `**Named subject:** ${companion.name} (${companion.gender}).`,
    idAnatomy ? `**Identity / anatomy notes:** ${idAnatomy}` : null,
    cleaned
      ? `**Likeness prose (face, hair, skin, species — filtered to drop card-scene junk):** ${cleaned}`
      : null,
    figureLine,
    "**Forbidden:** inventing a different model; swapping ethnicity or body-type label away from forge; copying swimsuit/beach/studio **wardrobe or backdrop** from long appearance text — those belong to **Requested framing (from menu)** only.",
  ].filter(Boolean);

  return lines.join("\n");
}
