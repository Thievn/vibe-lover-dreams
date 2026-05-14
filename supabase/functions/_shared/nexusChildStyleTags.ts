import { normalizeForgeThemeTabIdForMerge, readForgeThemeDna } from "./nexusForgeThemeMerge.ts";

const STYLE_HINT_RE =
  /\b(anime|manga|cel|photoreal|hyper[-\s]?real|cinematic|illustration|chibi|pixel|watercolor|oil\s+painting|cyberpunk|gothic|baroque|fantasy|digital\s+painting|comic|cartoon|synthwave|vaporwave|neon\s+noir|film\s+noir|editorial|ghibli|hentai|yaoi|yuri|pinup|boudoir|low[-\s]?poly|vapor)\b/i;

function asStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => String(x).trim()).filter(Boolean);
}

/**
 * Ensures Nexus children inherit visual-style tags from parents and explicit anime marker when merged tab is anime.
 */
export function mergeNexusChildVisualStyleTags(input: {
  childTags: string[];
  parentATags: unknown;
  parentBTags: unknown;
  mergedPersonalityForge: Record<string, unknown> | null | undefined;
  maxTags: number;
}): string[] {
  const { childTags, parentATags, parentBTags, mergedPersonalityForge, maxTags } = input;
  const out: string[] = [];
  const seen = new Set<string>();

  const add = (t: string) => {
    const k = t.trim().toLowerCase();
    if (!k || seen.has(k) || out.length >= maxTags) return;
    seen.add(k);
    out.push(t.trim());
  };

  for (const t of childTags) add(t);

  for (const p of [...asStringArray(parentATags), ...asStringArray(parentBTags)]) {
    if (STYLE_HINT_RE.test(p)) add(p);
  }

  const dna = readForgeThemeDna(mergedPersonalityForge ?? null);
  const rawTab = dna && typeof dna.activeForgeTab === "string" ? dna.activeForgeTab.trim() : "";
  const tab = rawTab ? normalizeForgeThemeTabIdForMerge(rawTab) : "";
  if (tab === "anime_temptation") {
    const hasAnimeWord = out.some((t) => /\banime\b/i.test(t) || /\bmanga\b/i.test(t) || /cel-shad/i.test(t));
    if (!hasAnimeWord) add("Anime Style");
  }

  return out.slice(0, maxTags);
}
