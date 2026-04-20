/**
 * Imagine-oriented body-type lock text — mirrors `forgePortraitBodyTypeContract` in
 * `src/lib/forgeBodyTypes.ts` (keep in sync when editing templates).
 */

const BODY_TYPE_LOCK_HEAD =
  'EXTREMELY IMPORTANT — BODY TYPE LOCK: The character MUST match the forge body type below for silhouette, species, limb count, and proportions. Do NOT default to a generic tall human runway model, stock "beautiful stranger," or unrelated build. If any other prose in this prompt conflicts with the body type label, the body type wins.';

function forgeBodyCategoryIdEdge(bodyType: string): string {
  const t = bodyType.trim().toLowerCase();
  if (!t) return "humanoid";
  if (
    /\b(little\s*person|midget|short\s*stature|tiny\s*&\s*doll|pixie-sized|micro\s*\/\s*tiny|giantess|giant\s*body|kaiju)\b/i.test(
      t,
    )
  ) {
    return "stature";
  }
  if (/\b(amputee|wheelchair|one-legged|one-armed|double\s*amputee|prosthetic|cybernetic)\b/i.test(t)) return "mobility";
  if (/\b(furry|anthro|wolf-anthro|feline-anthro|monster\s*girl|monster\s*boy|werewolf)\b/i.test(t)) return "anthro";
  if (/\b(tentacle|mermaid|centaur|harpy|naga|insectoid|arachnid|reverse\s*centaur)\b/i.test(t)) return "hybrid";
  if (
    /\b(elf-eared|orc-built|orc\s*\/|goblinoid|troll|ogre-sized|demon-tailed|angel-winged|succubus|incubus|satyr|faun|minotaur|dragon-scaled)\b/i.test(
      t,
    )
  ) {
    return "fantasy";
  }
  if (
    /\b(living\s*doll|inflatable|slime|goo|crystal|ghostly|latex|melting\s*wax|shadow|plant-based|floating|mechanical|holographic|stone\s*\/|fire\s*elemental|ice\s*elemental|neon\s*wireframe|skeleton|wraith|golem|clockwork|ash|lightning|water-formed)\b/i.test(
      t,
    )
  ) {
    return "otherworldly";
  }
  if (/\b(hyper-|hourglass\s*extreme)\b/i.test(t)) return "hyper";
  return "humanoid";
}

function statureEmphasisEdge(bodyType: string): string {
  const t = bodyType.trim().toLowerCase();
  const compact =
    /\b(little\s*person|midget|short\s*stature|tiny\s*&\s*doll|pixie-sized|micro\s*\/\s*tiny\s*body)\b/i.test(t) ||
    (/\bdwarf\b/i.test(t) && !/\bdragon\b/i.test(t)) ||
    /\bdoll-like\b/i.test(t) ||
    /\bmicro\s*\/\s*tiny\b/i.test(t);
  if (!compact) return "";
  return "Stature is the hero of this image: three-quarter or full-body framing so scale is obvious (furniture, counter height, door rail, another figure, or handheld object for hand-size read). Adult with compact proportions per forge body type — not a child, not average-height model legs; wardrobe and pose reinforce short-stature / little-person read; do not render a generic tall-human silhouette.";
}

/** Same contract string as client `forgePortraitBodyTypeContract` for `generate-image`. */
export function forgePortraitBodyTypeContract(bodyType: string): string {
  const raw = bodyType?.trim() || "Average Build";
  const bt = raw;
  const cat = forgeBodyCategoryIdEdge(bt);
  const statureExtra = statureEmphasisEdge(bt);

  const tailHumanoid = `Humanoid adult build matching "${bt}" — height, shoulder/hip ratio, musculature or softness must read as this label, not a different stock body.`;

  const tailStature = (() => {
    let s = `Scale and proportion are the dominant read for "${bt}" — use in-frame scale cues (furniture, doorway, bar, handheld prop, horizon, another figure) so the viewer cannot read this as an average-height default human.`;
    if (statureExtra) s += ` ${statureExtra}`;
    else if (/\b(Giantess|Giant Body|Kaiju)/i.test(bt)) {
      s += ` Show massive scale vs environment — limbs and mass clearly oversized; not a normal human with a wide-angle trick only.`;
    }
    return s;
  })();

  const tailMobility = `Respect "${bt}" with coherent adaptive anatomy — wheelchair, limb difference, or prosthetics as the label implies; dignified, accurate, not erased into a generic able-bodied silhouette.`;

  const tailAnthro = `Non-human anthropomorphic body for "${bt}" — species-appropriate skull/face, ears, fur/feathers/scales, tail placement, digitigrade or plantigrade stance as fits the label; limb count correct. Forbidden: a human cosplayer with minimal ears/tail only.`;

  const tailFantasy = `Fantasy-species anatomy for "${bt}" — horns, wings, tail, skin texture, ears, and silhouette must match the archetype, not a plain human with jewelry.`;

  const tailHybrid = `Hybrid / multi-region body for "${bt}" — correct junction between regions (e.g. centaur, naga, harpy, arachnid); all named segments visible and anatomically consistent; never collapse to human-only.`;

  const tailOther = `Non-standard or stylized body for "${bt}" — slime/gel mass, crystal planes, stone, wireframe, doll joints, elemental glow, etc.; keep a readable character silhouette without reverting to generic human skin unless the label is humanoid glam.`;

  const tailHyper = `Exaggerated proportions for "${bt}" — push the named exaggeration clearly and consistently; do not swap in a different trope (e.g. unrelated weight or species).`;

  const body =
    cat === "humanoid"
      ? tailHumanoid
      : cat === "stature"
        ? tailStature
        : cat === "mobility"
          ? tailMobility
          : cat === "anthro"
            ? tailAnthro
            : cat === "fantasy"
              ? tailFantasy
              : cat === "hybrid"
                ? tailHybrid
                : cat === "otherworldly"
                  ? tailOther
                  : cat === "hyper"
                    ? tailHyper
                    : tailHumanoid;

  return `${BODY_TYPE_LOCK_HEAD} Body type label: "${bt}". ${body}`;
}
