/** Deno copy of client tcg stat generation for nexus-merge inserts (keep in sync with src/lib/tcgStats.ts). */

export const TCG_STAT_KEYS = [
  "seduction",
  "passion",
  "fertility",
  "synergy",
  "dominance",
  "mystique",
  "wildness",
  "devotion",
] as const;

export type TcgStatKey = (typeof TCG_STAT_KEYS)[number];
export type TcgStatBlock = Partial<Record<TcgStatKey, number>>;

const TIER: Record<string, [number, number]> = {
  common: [38, 62],
  rare: [44, 74],
  epic: [50, 82],
  legendary: [56, 88],
  mythic: [60, 92],
  abyssal: [66, 98],
};

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normalizeRarity(r: string | null | undefined): string {
  const v = (r || "common").toLowerCase().trim();
  if (v in TIER) return v;
  return "common";
}

function roll(seed: string, stat: TcgStatKey, rarity: string): number {
  const [lo, hi] = TIER[normalizeRarity(rarity)] ?? TIER.common;
  const span = hi - lo + 1;
  return lo + (fnv1a32(`${seed}|${stat}`) % span);
}

function pickKeys(seed: string): TcgStatKey[] {
  const scored = [...TCG_STAT_KEYS].map((k) => ({ k, s: fnv1a32(`${seed}#${k}`) }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, 4).map((x) => x.k);
}

export function generateTcgStatBlock(seed: string, rarity: string | null | undefined): TcgStatBlock {
  const keys = pickKeys(seed);
  const out: TcgStatBlock = {};
  for (const k of keys) {
    out[k] = roll(seed, k, rarity ?? "common");
  }
  return out;
}

function statVal(o: Record<string, unknown>, k: string): number | undefined {
  const v = o[k];
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

export function mergeTcgForNexusChild(
  seed: string,
  childRarity: string,
  pa: Record<string, unknown> | null,
  pb: Record<string, unknown> | null,
): TcgStatBlock {
  const keys = pickKeys(seed);
  const out: TcgStatBlock = {};
  const ra = (pa?.tcg_stats as Record<string, unknown> | null) ?? {};
  const rb = (pb?.tcg_stats as Record<string, unknown> | null) ?? {};
  for (const k of keys) {
    const va = statVal(ra, k);
    const vb = statVal(rb, k);
    let n: number;
    if (va != null && vb != null) {
      n = Math.round((va + vb) / 2 + (fnv1a32(`${seed}~${k}`) % 7) - 3);
    } else if (va != null) {
      n = Math.min(98, va + (fnv1a32(`${seed}a${k}`) % 5));
    } else if (vb != null) {
      n = Math.min(98, vb + (fnv1a32(`${seed}b${k}`) % 5));
    } else {
      n = roll(seed, k as TcgStatKey, childRarity);
    }
    out[k as TcgStatKey] = Math.max(28, Math.min(99, n));
  }
  return out;
}
