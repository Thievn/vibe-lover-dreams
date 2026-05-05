/**
 * Companion Forge — optional dramatic “Portrait pose” beat (Grok Imagine).
 * Neutral wording (“the character”) so any gender/species from the card is respected.
 * Near-duplicates from the original 40-item list are merged; two distinct poses replace them to keep exactly 40 options.
 */

export type ForgePortraitPoseGroup =
  | "Standing & stance"
  | "Seated & furniture"
  | "Lounging & bed"
  | "Floor & kneel"
  | "Leans & angles"
  | "Chair & props"
  | "Expression & motion";

export type ForgePortraitPoseEntry = {
  id: string;
  label: string;
  group: ForgePortraitPoseGroup;
  /** Grok-optimized pose line — keep short; combined with Card pose discipline client-side. */
  prompt: string;
};

/** Merged “leaning on wall” + “back against wall” into one clear beat. */
/** Merged “looking over shoulder” + “over the shoulder glance” into one. */
/** Added “S-curve stance” + “silhouette rim-lit profile” to keep count at 40 after merges. */
export const FORGE_PORTRAIT_POSE_CATALOG: readonly ForgePortraitPoseEntry[] = [
  {
    id: "standing-confident",
    label: "Standing confidently",
    group: "Standing & stance",
    prompt:
      "The character standing confidently with perfect posture, powerful and seductive presence, eyes engaging the viewer.",
  },
  {
    id: "seated-throne",
    label: "Sitting on throne",
    group: "Seated & furniture",
    prompt: "The character seated elegantly on a throne, regal and seductive posture, commanding the frame.",
  },
  {
    id: "lean-wall",
    label: "Lean / back to wall",
    group: "Leans & angles",
    prompt:
      "The character leaning or resting back against a wall — shoulders or spine to the surface, arms relaxed, seductive cool energy.",
  },
  {
    id: "lying-side",
    label: "Lying on side",
    group: "Lounging & bed",
    prompt:
      "The character lying on their side, propped on one arm, sensual and alluring, clear eye contact with the lens.",
  },
  {
    id: "kneeling-graceful",
    label: "Kneeling gracefully",
    group: "Floor & kneel",
    prompt: "The character kneeling gracefully, gaze lifted toward the viewer with seductive intent.",
  },
  {
    id: "over-shoulder-glance",
    label: "Over-shoulder glance",
    group: "Expression & motion",
    prompt: "The character glancing back over the shoulder toward the viewer with a sultry, arresting stare.",
  },
  {
    id: "sitting-desk-edge",
    label: "Sitting on desk edge",
    group: "Seated & furniture",
    prompt: "The character perched on the edge of a desk, legs crossed, composed and very seductive.",
  },
  {
    id: "arms-crossed",
    label: "Arms crossed",
    group: "Standing & stance",
    prompt: "The character standing with arms crossed beneath the chest line, confident and alluring.",
  },
  {
    id: "hands-on-hips",
    label: "Hands on hips",
    group: "Standing & stance",
    prompt: "The character standing with hands on hips, powerful sexy stance, owning the frame.",
  },
  {
    id: "sitting-bed-edge",
    label: "Sitting on bed edge",
    group: "Lounging & bed",
    prompt: "The character seated on the edge of a bed, sultry and inviting, weight slightly forward.",
  },
  {
    id: "reclining-chaise",
    label: "Reclining on chaise",
    group: "Lounging & bed",
    prompt: "The character reclining seductively on a chaise lounge, long lines and languid tension.",
  },
  {
    id: "bending-forward-tease",
    label: "Bending forward (tease)",
    group: "Leans & angles",
    prompt: "The character bent slightly forward toward the camera, teasing and seductive without explicit staging.",
  },
  {
    id: "s-curve-stance",
    label: "S-curve stance",
    group: "Standing & stance",
    prompt:
      "The character standing with a subtle S-curve through hips and shoulders, one hand trailing along the thigh, magnetic and alluring.",
  },
  {
    id: "sitting-legs-crossed",
    label: "Sitting, legs crossed",
    group: "Seated & furniture",
    prompt: "The character seated elegantly with legs crossed, classy and sexy editorial energy.",
  },
  {
    id: "crouch-low",
    label: "Crouching low",
    group: "Floor & kneel",
    prompt: "The character crouched low to the ground, coiled intensity and seductive focus.",
  },
  {
    id: "lying-stomach-feet-up",
    label: "Lying on stomach, feet up",
    group: "Lounging & bed",
    prompt: "The character lying on their stomach, feet kicked up playfully behind, flirtatious pin-up read.",
  },
  {
    id: "one-knee-raised-sit",
    label: "Seated, one knee up",
    group: "Seated & furniture",
    prompt: "The character seated with one knee raised, relaxed sensual asymmetry in the pose.",
  },
  {
    id: "standing-seductive",
    label: "Standing seductively",
    group: "Standing & stance",
    prompt: "The character in a highly seductive standing pose, weight shifted, gaze locked to the viewer.",
  },
  {
    id: "chair-backwards",
    label: "Backwards on chair",
    group: "Chair & props",
    prompt: "The character straddling or sitting backwards on a chair, forearms on the backrest, provocative poise.",
  },
  {
    id: "lean-forward-intimate",
    label: "Leaning toward viewer",
    group: "Leans & angles",
    prompt: "The character leaning forward toward the viewer, intimate and seductive without crowding the lens.",
  },
  {
    id: "head-tilt-flirty",
    label: "Head tilt (flirty)",
    group: "Expression & motion",
    prompt: "The character with head slightly tilted, flirty seductive expression, soft catch-lights in the eyes.",
  },
  {
    id: "hands-behind-head",
    label: "Hands behind head",
    group: "Standing & stance",
    prompt: "The character with both hands behind the head, open chest line, very sensual editorial pose.",
  },
  {
    id: "floor-lean-casual",
    label: "On floor, leaning back",
    group: "Floor & kneel",
    prompt: "The character seated on the floor leaning against furniture or a low surface, casual and sexy.",
  },
  {
    id: "pillar-lean",
    label: "Against a pillar",
    group: "Leans & angles",
    prompt: "The character leaning against a classical pillar, elegant curves and alluring stillness.",
  },
  {
    id: "lying-back-viewer",
    label: "Lying on back",
    group: "Lounging & bed",
    prompt: "The character lying on their back looking up at the viewer, seductive vulnerability in the gaze.",
  },
  {
    id: "side-profile-silhouette",
    label: "Side profile silhouette",
    group: "Expression & motion",
    prompt: "The character in elegant side profile, beautiful silhouette read, eyes still connecting with camera.",
  },
  {
    id: "hands-covering-chest",
    label: "Hands covering chest",
    group: "Expression & motion",
    prompt: "The character strategically covering the chest with hands, suggestive but SFW editorial framing.",
  },
  {
    id: "wind-in-hair",
    label: "Wind in hair",
    group: "Expression & motion",
    prompt: "The character standing as wind blows through hair and fabric, dramatic sensual motion.",
  },
  {
    id: "straddle-chair",
    label: "Straddling chair",
    group: "Chair & props",
    prompt: "The character straddling a chair facing the backrest, extremely seductive controlled posture.",
  },
  {
    id: "arching-back",
    label: "Arching back",
    group: "Leans & angles",
    prompt: "The character arching the back sensually, balanced and statuesque.",
  },
  {
    id: "look-up-seductive",
    label: "Looking up seductively",
    group: "Expression & motion",
    prompt: "The character looking up at the viewer with heavy-lidded seductive eyes.",
  },
  {
    id: "wet-hair-sensual",
    label: "Wet hair sensual",
    group: "Expression & motion",
    prompt: "The character with wet hair clinging to skin and shoulders, sensual shower or rain aftermath mood.",
  },
  {
    id: "biting-finger-tease",
    label: "Biting finger (tease)",
    group: "Expression & motion",
    prompt: "The character lightly biting a fingertip while holding eye contact, playful teasing energy.",
  },
  {
    id: "sitting-knees-to-chest",
    label: "Sitting, knees to chest",
    group: "Floor & kneel",
    prompt: "The character seated with knees drawn toward the chest, cute yet seductive compact framing.",
  },
  {
    id: "doorway-shadow",
    label: "Standing in doorway",
    group: "Standing & stance",
    prompt: "The character standing seductively in a doorway, half in shadow half in light, cinematic tension.",
  },
  {
    id: "lying-bed-seductive",
    label: "Lying seductively on bed",
    group: "Lounging & bed",
    prompt: "The character lying on a bed in a highly seductive pose, sheets and fabric supporting the mood.",
  },
  {
    id: "kneeling-on-bed",
    label: "Kneeling on bed",
    group: "Lounging & bed",
    prompt: "The character kneeling on a mattress, provocative but tasteful boudoir staging.",
  },
  {
    id: "elegant-full-body",
    label: "Elegant full body",
    group: "Standing & stance",
    prompt: "The character in an elegant full-body seductive pose, long lines and couture confidence.",
  },
  {
    id: "playful-wink",
    label: "Playful wink",
    group: "Expression & motion",
    prompt: "The character giving a playful wink with a mischievous smile, charisma-forward portrait.",
  },
  {
    id: "rimlit-profile",
    label: "Rim-lit profile",
    group: "Expression & motion",
    prompt:
      "The character in a rim-lit profile or three-quarter silhouette, edge light carving the jaw and hair, premium editorial sensuality.",
  },
  {
    id: "hand-through-hair",
    label: "Hand through hair",
    group: "Expression & motion",
    prompt: "The character running fingers through hair mid-motion, sensual confidence and soft motion blur in strands.",
  },
  {
    id: "adjusting-collar-strap",
    label: "Adjusting collar / strap",
    group: "Expression & motion",
    prompt:
      "The character adjusting a collar, strap, or neckline with focused gaze at the viewer, intimate wardrobe-forward tease.",
  },
] as const;

export const FORGE_PORTRAIT_POSE_DEFAULT_ID = FORGE_PORTRAIT_POSE_CATALOG[0]!.id;

const POSE_BY_ID = new Map(FORGE_PORTRAIT_POSE_CATALOG.map((e) => [e.id, e]));

export const FORGE_PORTRAIT_POSE_GROUP_ORDER: readonly ForgePortraitPoseGroup[] = [
  "Standing & stance",
  "Seated & furniture",
  "Lounging & bed",
  "Floor & kneel",
  "Leans & angles",
  "Chair & props",
  "Expression & motion",
] as const;

export function normalizeForgePortraitPoseId(raw: unknown): string {
  if (typeof raw === "string" && POSE_BY_ID.has(raw)) return raw;
  return FORGE_PORTRAIT_POSE_DEFAULT_ID;
}

export function getForgePortraitPoseEntry(id: string): ForgePortraitPoseEntry {
  return POSE_BY_ID.get(id) ?? FORGE_PORTRAIT_POSE_CATALOG[0]!;
}

export function getForgePortraitPosePrompt(id: string): string {
  return getForgePortraitPoseEntry(id).prompt;
}

export function getForgePortraitPoseLabel(id: string): string {
  return getForgePortraitPoseEntry(id).label;
}

export function randomForgePortraitPoseId(): string {
  const i = Math.floor(Math.random() * FORGE_PORTRAIT_POSE_CATALOG.length);
  return FORGE_PORTRAIT_POSE_CATALOG[i]!.id;
}
