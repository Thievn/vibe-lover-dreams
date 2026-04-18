import discoveredDoc from "@/generated/marketingSurfaces.discovered.json";
import { SITE_MARKETING_SURFACES, type MarketableSiteSurface } from "@/lib/xMarketingSiteRegistry";

export type DiscoveredMarketingItem = {
  id: string;
  kind: string;
  label: string;
  path: string;
};

export type MergedMarketableSurface = MarketableSiteSurface & {
  reviewed: boolean;
  /** How this surface was detected (curated overlay entries omit this). */
  discoveryKinds?: string[];
};

/** Map discovery row ids to curated marketing surface ids. */
const DISCOVERY_ID_TO_OVERLAY: Record<string, string> = {
  toy: "lovense",
  collection: "vault",
  "create-companion": "forge",
  settings: "lovense",
  admin: "command",
  "companion-profile": "discover",
};

const GENERIC_ANGLES: MarketableSiteSurface["angles"] = [
  {
    id: "gen-new",
    label: "What's new",
    prompt:
      "Announce this area in one sharp hook — what changed, why fans should care, tasteful adult-adjacent tone for X.",
  },
  {
    id: "gen-why",
    label: "Why it matters",
    prompt: "Benefit-led: emotional payoff, fantasy ownership, premium product framing — no spammy hashtag walls.",
  },
  {
    id: "gen-tease",
    label: "Tease (safe)",
    prompt: "One sentence that teases depth without explicit imagery; curiosity + ellipsis energy.",
  },
];

function overlayIdSet(): Set<string> {
  return new Set(SITE_MARKETING_SURFACES.map((s) => s.id));
}

function resolveTargetId(discoveryId: string): string {
  return DISCOVERY_ID_TO_OVERLAY[discoveryId] ?? discoveryId;
}

function preferPath(prev: string | undefined, candidate: string): string {
  if (!prev) return candidate;
  if (prev.includes("nav=toy") && candidate === "/settings") return prev;
  if (candidate.includes("nav=toy") && prev === "/settings") return candidate;
  if (prev === "/dashboard" && candidate !== "/dashboard") return candidate;
  if (candidate === "/dashboard" && prev !== "/dashboard" && !prev.startsWith("/dashboard?")) return prev;
  return candidate;
}

function discoveredItems(): DiscoveredMarketingItem[] {
  const raw = discoveredDoc as { items?: DiscoveredMarketingItem[] };
  return Array.isArray(raw.items) ? raw.items : [];
}

/**
 * Curated overlay surfaces (paths enriched from discovery) plus any net-new
 * routes/tabs that are not yet in SITE_MARKETING_SURFACES.
 */
export function getMergedMarketingSurfaces(): MergedMarketableSurface[] {
  const overlay = SITE_MARKETING_SURFACES;
  const ids = overlayIdSet();
  const items = discoveredItems();

  const pathByOverlay = new Map<string, string>();
  const kindsByOverlay = new Map<string, Set<string>>();

  for (const d of items) {
    const target = resolveTargetId(d.id);
    if (!ids.has(target)) continue;
    const cur = pathByOverlay.get(target);
    pathByOverlay.set(target, preferPath(cur, d.path));
    if (!kindsByOverlay.has(target)) kindsByOverlay.set(target, new Set());
    kindsByOverlay.get(target)!.add(d.kind);
  }

  const mergedOverlay: MergedMarketableSurface[] = overlay.map((s) => {
    const p = pathByOverlay.get(s.id);
    const kindSet = kindsByOverlay.get(s.id);
    return {
      ...s,
      path: p ?? s.path,
      reviewed: true,
      discoveryKinds: kindSet && kindSet.size ? [...kindSet] : undefined,
    };
  });

  const synthetics: MergedMarketableSurface[] = [];
  const syntheticIds = new Set<string>();

  for (const d of items) {
    const target = resolveTargetId(d.id);
    if (ids.has(target) || ids.has(d.id)) continue;
    if (syntheticIds.has(d.id)) continue;
    syntheticIds.add(d.id);
    synthetics.push({
      id: d.id,
      label: d.label,
      pitch: `${d.label} — detected in the app bundle (curate pitch + angles in SITE_MARKETING_SURFACES when ready).`,
      path: d.path,
      category: "product",
      angles: GENERIC_ANGLES,
      reviewed: false,
      discoveryKinds: [d.kind],
    });
  }

  synthetics.sort((a, b) => a.label.localeCompare(b.label));
  return [...mergedOverlay, ...synthetics];
}

export function buildProductAtlasForPrompt(): string {
  return getMergedMarketingSurfaces()
    .map((s) => `• ${s.label}${s.reviewed ? "" : " (unreviewed)"} (${s.category}): ${s.pitch}`)
    .join("\n");
}
