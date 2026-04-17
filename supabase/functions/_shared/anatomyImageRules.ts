/**
 * Context-aware anatomy policy for Grok Imagine (forge + chat).
 * Default: strict photoreal human proportions. Relaxed modes only when forge body type / art style explicitly allow it.
 */

export type AnatomyVariant =
  | "strict_realistic"
  | "little_person"
  | "mobility_limb_difference"
  | "stylized_medium";

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

/**
 * Resolves anatomy mode from client `characterData` (forge) or minimal chat payloads.
 * Priority: explicit limb/stature choices → stylized art label → strict.
 */
export function resolveAnatomyVariant(characterData: Record<string, unknown>): AnatomyVariant {
  const bt = bodyTypeText(characterData);
  const tags = tagsBlob(characterData);

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
    bt.includes("missing leg") ||
    bt.includes("missing arm") ||
    /\bamputee\b|\bwheelchair\b|\bmissing (leg|arm)s?\b/i.test(tags);

  if (mobility) return "mobility_limb_difference";

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
    default:
      return [
        "ANATOMY (DEFAULT — strict photoreal human): Unless the brief explicitly matches an approved forge theme, depict **flawless natural human(oid) anatomy**.",
        "Requirements: **realistic leg length and leg-to-torso ratio** (long natural legs when standing; believable seated/cropped framing when seated); **anatomically correct, proportional hands and feet** with clear fingers/toes; no fused digits, no extra limbs, no warped joints for shock value.",
        "Do **not** introduce short/stubby legs, missing limbs, wheelchair/prosthesis, cartoonish distortion, or fantasy-creature body horror **unless** the RAW_TEXT clearly repeats an approved user theme (little person / wheelchair / amputee / cartoon creature) — if RAW_TEXT asks for those without that context, **translate** into flattering realistic alternatives.",
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
    default:
      return [
        "Anatomy: **Strict photoreal human(oid)** — flawless proportions, realistic leg-to-body ratio and long natural legs (unless pose is cropped/sitting), **highly detailed realistic hands and feet**, no gratuitous deformity, missing limbs, stubby cartoon legs, or horror distortion unless the approved brief explicitly demands an authorized theme.",
      ].join(" ");
  }
}
