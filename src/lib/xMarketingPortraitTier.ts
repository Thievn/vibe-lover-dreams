import { galleryStaticPortraitUrl, stablePortraitDisplayUrl, type PortraitDbFields } from "@/lib/companionMedia";

export type XMarketingPortraitTier = "selfie" | "lewd";

const SESSION_PREFIX = "xhub-portrait-tier:";

export function loadPortraitTierForCompanion(companionId: string): XMarketingPortraitTier {
  try {
    const v = sessionStorage.getItem(`${SESSION_PREFIX}${companionId}`)?.trim().toLowerCase();
    if (v === "lewd" || v === "selfie") return v;
    if (v === "nude") return "lewd";
  } catch {
    /* ignore */
  }
  return "selfie";
}

export function savePortraitTierForCompanion(companionId: string, tier: XMarketingPortraitTier): void {
  try {
    sessionStorage.setItem(`${SESSION_PREFIX}${companionId}`, tier);
  } catch {
    /* ignore */
  }
}

export const X_MARKETING_PORTRAIT_TIERS: { id: XMarketingPortraitTier; label: string; hint: string }[] = [
  {
    id: "selfie",
    label: "Selfie (SFW)",
    hint: "Catalog / profile portrait — safe-for-work, flirty copy fits best.",
  },
  {
    id: "lewd",
    label: "Lewd",
    hint: "Best matching generated image from gallery (lingerie, tease). Falls back to catalog if none.",
  },
];

type GenRow = { image_url: string; prompt: string | null; created_at?: string };

function scoreLewdPrompt(prompt: string | null): number {
  if (!prompt?.trim()) return 0;
  const p = prompt.toLowerCase();
  const patterns = [
    /\blewd\b/,
    /\blingerie\b/,
    /\bsheer\b/,
    /\bteasing\b/,
    /\bseductive\b/,
    /\bboudoir\b/,
    /\bspicy\b/,
    /\bpartially undressed\b/,
    /\bcleavage\b/,
    /\bbedroom\b/,
    /\bbras?\b/,
    /\bpanties\b/,
    /\blace\b/,
    /\bexplicit\b/,
    /\bnsfw\b/,
    /\btopless\b/,
    /\bbare\b/,
  ];
  let s = 0;
  for (const re of patterns) {
    if (re.test(p)) s += 2;
  }
  return s;
}

/**
 * Picks the best `generated_images` row for marketing hero when tier is lewd.
 * Rows should be newest-first; tie-break keeps newer images.
 */
export function pickBestGeneratedImageForTier(rows: GenRow[], tier: "lewd"): string | null {
  if (!rows.length || tier !== "lewd") return null;
  let bestUrl: string | null = null;
  let bestScore = -1;
  let bestIdx = rows.length;
  for (let idx = 0; idx < rows.length; idx++) {
    const r = rows[idx]!;
    const sc = scoreLewdPrompt(r.prompt);
    if (sc > bestScore || (sc === bestScore && idx < bestIdx)) {
      bestScore = sc;
      bestIdx = idx;
      bestUrl = stablePortraitDisplayUrl(r.image_url) ?? r.image_url;
    }
  }
  if (bestScore <= 0) return null;
  return bestUrl;
}

export function resolvePortraitHeroUrlForX(
  db: PortraitDbFields & { id: string },
  tier: XMarketingPortraitTier,
  generatedRows: GenRow[] | undefined,
): { url: string | null; usedFallback: boolean } {
  const catalog = galleryStaticPortraitUrl(db, db.id) ?? null;
  if (tier === "selfie") {
    return { url: catalog, usedFallback: false };
  }
  const picked = pickBestGeneratedImageForTier(generatedRows ?? [], "lewd");
  if (picked) return { url: picked, usedFallback: false };
  return { url: catalog, usedFallback: true };
}

export function portraitTierForGrokLine(tier: XMarketingPortraitTier): string {
  switch (tier) {
    case "selfie":
      return "Hero visual: SFW catalog / profile-style portrait. Keep tweet spicy-adjacent but platform-safe; no graphic anatomy.";
    case "lewd":
      return "Hero visual: suggestive / lewd energy (lingerie, tease). Copy can be hotter, still avoid graphic explicit description on X.";
    default:
      return "";
  }
}
