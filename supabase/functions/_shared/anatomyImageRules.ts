/**
 * Context-aware anatomy policy for Grok Imagine (forge + chat).
 * Default: strict photoreal human proportions. Non-human forge body types authorize matching silhouettes.
 */

export type AnatomyVariant =
  | "strict_realistic"
  | "little_person"
  | "mobility_limb_difference"
  | "stylized_medium"
  /** Furry, anthro, kemonomimi, monster-person — non-human species traits with coherent anatomy */
  | "anthropomorphic_creature"
  /** Centaur, mermaid, wings, tails, orc, scaled, harpy, etc. — mixed humanoid + fantasy morphology */
  | "fantasy_hybrid"
  /** Slime, elemental, golem, shadow, plant-creature — clearly non-standard human silhouette */
  | "nonhuman_silhouette"
  /** Wireframe, heavy glitch, melting — medium-led abstraction */
  | "extreme_surreal";

/** Art directions where non-photoreal proportions are an intentional part of the medium. */
const STYLIZED_ART_STYLE_LABELS: readonly string[] = [
  "Anime",
  "Anime Style",
  "Comic / graphic novel",
  "Low-poly stylized",
  "Watercolor",
  "Watercolor Painting",
  "Neon airbrush",
  "Neon Cyberpunk",
  "Baroque portrait",
  "Dramatic Baroque",
  "Oil painting",
  "Digital Oil Painting",
  "Cyber-goth digital",
  "Dark Fantasy Art",
  "Gothic Victorian",
  "Surreal Dreamscape",
  "Film Noir",
  "Grunge Aesthetic",
];

/** Substrings matched against normalized body type + tags (forge labels from forgeBodyTypes). Order in resolve* matters only after stature/mobility. */
const EXTREME_SURREAL_MARKERS = [
  "neon wireframe",
  "glitch body",
  "holographic / glitch",
  "melting wax",
] as const;

const NONHUMAN_SILHOUETTE_MARKERS = [
  "goo / slime",
  "slime body",
  "crystal / gemstone",
  "ghostly translucent",
  "shadow creature",
  "plant-based",
  "stone / marble statue",
  "fire elemental",
  "ice elemental",
  "mechanical cyborg",
  "living doll",
  "inflatable / squishy",
  "latex / shiny skin",
  "floating levitating",
  "reverse centaur",
  "skeleton-kin (stylized)",
  "wraith / specter",
  "golem / warforged",
  "clockwork automaton",
  "ash / ember skin",
  "lightning-touched",
  "water-formed",
] as const;

const FANTASY_HYBRID_MARKERS = [
  "centaur lower body",
  "mermaid lower body",
  "tentacle hybrid",
  "demon-tailed",
  "angel-winged",
  "elf-eared & slender",
  "orc-built & powerful",
  "succubus curves",
  "incubus physique",
  "dragon-scaled",
  "avian / harpy",
  "serpent / naga",
  "satyr / faun",
  "minotaur-inspired",
  "orc / goblinoid",
  "troll",
  "ogre-sized",
  "pixie-sized",
  "kaiju-scale humanoid",
  "giantess",
  "giant body",
  "micro / tiny body",
  "tiny & doll-like",
  "insectoid",
  "arachnid",
  "werewolf hybrid",
  "cybernetic limb replacement",
  "prosthetic beauty",
] as const;

const ANTHROPOMORPHIC_MARKERS = [
  "furry / anthro",
  "wolf-anthro",
  "feline-anthro",
  "monster girl / boy",
] as const;

function norm(s: unknown): string {
  return String(s ?? "").trim().toLowerCase();
}

function bodyTypeText(characterData: Record<string, unknown>): string {
  return norm(characterData.bodyType);
}

function artStyleLabel(characterData: Record<string, unknown>): string {
  const raw = characterData.artStyleLabel ?? characterData.art_style_label;
  return String(raw ?? "").trim();
}

function tagsBlob(characterData: Record<string, unknown>): string {
  const t = characterData.tags;
  if (Array.isArray(t)) return t.map((x) => String(x)).join(" | ").toLowerCase();
  return "";
}

function haystack(characterData: Record<string, unknown>): string {
  return `${bodyTypeText(characterData)} | ${tagsBlob(characterData)}`;
}

function matchesAny(hay: string, markers: readonly string[]): boolean {
  return markers.some((m) => hay.includes(m.toLowerCase()));
}

/**
 * Resolves anatomy mode from client `characterData` (forge) or minimal chat payloads.
 * Priority: stature → mobility → explicit forge body bucket → stylized art label → strict.
 */
export function resolveAnatomyVariant(characterData: Record<string, unknown>): AnatomyVariant {
  const bt = bodyTypeText(characterData);
  const tags = tagsBlob(characterData);
  const hay = haystack(characterData);

  const stature =
    bt.includes("little person") ||
    bt.includes("midget") ||
    bt.includes("dwarf") ||
    bt.includes("short stature") ||
    /\blittle person\b|\bmidget\b|\bdwarf\b|\bshort stature\b/i.test(tags);

  if (stature) return "little_person";

  const mobility =
    bt.includes("amputee") ||
    bt.includes("wheelchair") ||
    bt.includes("one-legged") ||
    bt.includes("one-armed") ||
    bt.includes("double amputee") ||
    bt.includes("missing leg") ||
    bt.includes("missing arm") ||
    /\bamputee\b|\bwheelchair\b|\bmissing (leg|arm)s?\b|one-legged|one-armed|double amputee/i.test(tags);

  if (mobility) return "mobility_limb_difference";

  if (matchesAny(hay, EXTREME_SURREAL_MARKERS)) return "extreme_surreal";
  if (matchesAny(hay, NONHUMAN_SILHOUETTE_MARKERS)) return "nonhuman_silhouette";
  if (matchesAny(hay, FANTASY_HYBRID_MARKERS)) return "fantasy_hybrid";
  if (matchesAny(hay, ANTHROPOMORPHIC_MARKERS)) return "anthropomorphic_creature";

  const label = artStyleLabel(characterData);
  const labelLo = label.toLowerCase();
  if (
    STYLIZED_ART_STYLE_LABELS.some(
      (s) => s.toLowerCase() === labelLo || labelLo.includes(s.toLowerCase()),
    )
  ) {
    return "stylized_medium";
  }

  const styleSlug = norm(characterData.style);
  if (
    [
      "anime",
      "anime-style",
      "comic",
      "graphic-novel",
      "low-poly",
      "watercolor",
      "watercolor-painting",
      "neon-airbrush",
      "neon-cyberpunk",
      "baroque",
      "dramatic-baroque",
      "oil-painting",
      "digital-oil-painting",
      "cyber-goth",
      "dark-fantasy",
      "dark-fantasy-art",
      "gothic-victorian",
      "surreal-dreamscape",
      "film-noir",
      "grunge",
      "grunge-aesthetic",
    ].some((k) => styleSlug.includes(k))
  ) {
    return "stylized_medium";
  }

  return "strict_realistic";
}

/** Injected into the safe-prompt rewriter (system-adjacent user block). */
export function buildAnatomyRewriterDirective(variant: AnatomyVariant): string {
  switch (variant) {
    case "little_person":
      return [
        "ANATOMY (AUTHORIZED — short stature): The user explicitly chose a **little person / short stature** presentation.",
        "Depict **dignified adult proportions** consistent with that choice (shorter limbs relative to torso) **without** mockery, infantilization, fetishizing disability, or carnival caricature.",
        "Hands and feet must stay **coherent and intentional** (correct finger count, believable joints, clean silhouettes).",
        "Stay SFW. Do not add unrelated limb loss, horror distortion, or random glitch anatomy.",
      ].join(" ");
    case "mobility_limb_difference":
      return [
        "ANATOMY (AUTHORIZED — mobility / limb difference): The user explicitly chose **amputee and/or wheelchair user** (or missing limb) presentation.",
        "You may show **assistive devices or respectful limb difference** when it fits the wardrobe and pose. Keep remaining anatomy **coherent, detailed, and non-exploitative**.",
        "No shock gore, tragedy porn, or fetishizing disability. Stay SFW.",
      ].join(" ");
    case "stylized_medium":
      return [
        "ANATOMY (AUTHORIZED — stylized medium): The user chose a **non-photoreal art style** (anime, comic, low-poly, painterly, etc.).",
        "You may use **clean, genre-typical stylization** of proportions, hands, and feet (simplified shapes, slightly elongated limbs, painterly looseness) **only** in ways that match that medium — not random broken anatomy or horror deformity.",
        "Avoid hateful caricature. Stay SFW.",
      ].join(" ");
    case "anthropomorphic_creature":
      return [
        "ANATOMY (AUTHORIZED — anthropomorphic / kemonomimi): The user chose a **non-human species presentation** (furry, anthro, monster-person, animal-inspired traits).",
        "Depict **species-appropriate anatomy** — muzzle, ears, tail, fur/feathers/scales, digitigrade stance, or other traits **consistent with the brief** — not a generic human with light makeup.",
        "Keep hands/paws **coherent** (correct digit count for the species when visible). No hateful animal caricature. Stay SFW.",
      ].join(" ");
    case "fantasy_hybrid":
      return [
        "ANATOMY (AUTHORIZED — fantasy hybrid): The user chose a **mixed fantasy morphology** (centaur, mer-tail, wings, horns, extra limbs, non-human scale, or demi-human species traits).",
        "Render the **full hybrid silhouette** from the brief — do **not** collapse to a plain human; translate into a **cohesive, dignified** fantasy body that matches the selected label.",
        "Avoid random body-horror glitching; limbs and junctions must read **intentional**. Stay SFW.",
      ].join(" ");
    case "nonhuman_silhouette":
      return [
        "ANATOMY (AUTHORIZED — non-human silhouette): The user chose a **clearly non-standard body** (slime, elemental, construct, plant, shadow, statue-like, etc.).",
        "The figure may depart from human musculoskeletal structure **as the brief specifies** — keep materials, edges, and volume **readable and intentional**, not muddy human-with-filters.",
        "Stay SFW; no gore or shock disfigurement unless the brief is a respectful fantasy construct.",
      ].join(" ");
    case "extreme_surreal":
      return [
        "ANATOMY (AUTHORIZED — surreal / abstract medium): The user chose a **heavy stylization** (wireframe, glitch-body, melting wax, etc.).",
        "Proportions may follow **the art direction** rather than photoreal human rules — keep one **clear focal subject**, avoid random mutilation tropes. Stay SFW.",
      ].join(" ");
    default:
      return [
        "ANATOMY (DEFAULT — strict photoreal human): Unless the brief matches an approved forge theme above, depict **flawless natural human anatomy**.",
        "Requirements: **realistic leg length and leg-to-torso ratio**; **anatomically correct hands and feet** with clear fingers/toes; no fused digits, no extra limbs for shock value.",
        "Do **not** substitute a generic human when the user selected a **non-human forge body type** — that case uses an authorized variant instead.",
        "Stay SFW.",
      ].join(" ");
  }
}

/** Shorter block for the final Imagine prompt “Key Rules” section. */
export function buildAnatomyImagineKeyRules(variant: AnatomyVariant): string {
  switch (variant) {
    case "little_person":
      return [
        "Anatomy: **Short-stature / little person** presentation is **explicitly authorized** — respectful, adult, dignified proportions; detailed believable hands and feet; no mockery or fetishizing.",
      ].join(" ");
    case "mobility_limb_difference":
      return [
        "Anatomy: **Wheelchair / limb difference** is **explicitly authorized** when consistent with the character — respectful, accurate assistive tech; coherent remaining anatomy; no gore or exploitation.",
      ].join(" ");
    case "stylized_medium":
      return [
        "Anatomy: **Stylized / non-photoreal** look is **explicitly authorized** for this art style — medium-typical simplification of hands/feet/proportions only; avoid random glitch bodies or horror disfigurement.",
      ].join(" ");
    case "anthropomorphic_creature":
      return [
        "Anatomy: **Anthropomorphic / species traits** are **explicitly authorized** — show non-human features (fur, muzzle, ears, tail, etc.) consistent with the forge body type, not a default human model.",
      ].join(" ");
    case "fantasy_hybrid":
      return [
        "Anatomy: **Fantasy hybrid / demi-human** silhouette is **explicitly authorized** — wings, tails, extra limbs, mer-form, centaur junction, or scale as in the brief; keep it coherent and SFW.",
      ].join(" ");
    case "nonhuman_silhouette":
      return [
        "Anatomy: **Non-human construct / elemental / slime / shadow** form is **explicitly authorized** when it matches the forge choice — readable materials, intentional silhouette, SFW.",
      ].join(" ");
    case "extreme_surreal":
      return [
        "Anatomy: **Surreal / wireframe / glitch** treatment is **explicitly authorized** for this brief — follow the art direction; one clear subject; SFW.",
      ].join(" ");
    default:
      return [
        "Anatomy: **Strict photoreal human** — flawless proportions, realistic leg-to-body ratio, **detailed realistic hands and feet**, unless the forge body type above authorizes non-human anatomy.",
      ].join(" ");
  }
}
