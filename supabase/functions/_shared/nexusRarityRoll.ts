/**
 * Nexus child rarity: server roll from parent-pair outcome table (matches client `nexusRarityOutcomesTable`).
 * Weights use the same canonical order: common, rare, epic, legendary, mythic, abyssal.
 */
const ORDER = ["common", "rare", "epic", "legendary", "mythic", "abyssal"] as const;

/** Authoritative rows for all 21 parent-pair combinations. */
const WEIGHTS: Record<string, readonly number[]> = {
  "common::common": [70, 25, 4, 1, 0.1, 0.01],
  "common::rare": [0, 65, 28, 6, 0.8, 0.05],
  "common::epic": [28, 32, 26, 8, 4, 2],
  "common::legendary": [15, 22, 30, 22, 7, 4],
  "common::mythic": [8, 14, 24, 28, 16, 10],
  "common::abyssal": [2, 6, 12, 22, 32, 26],
  "rare::rare": [0, 55, 35, 8, 1.8, 0.2],
  "rare::epic": [0, 0, 60, 30, 8, 2],
  "rare::legendary": [5, 14, 24, 35, 14, 8],
  "rare::mythic": [0, 8, 16, 28, 32, 16],
  "rare::abyssal": [0, 2, 8, 16, 34, 40],
  "epic::epic": [0, 0, 50, 38, 10, 2],
  "epic::legendary": [0, 0, 0, 55, 35, 10],
  "epic::mythic": [0, 0, 8, 22, 40, 30],
  "epic::abyssal": [0, 0, 2, 10, 32, 56],
  "legendary::legendary": [0, 0, 0, 60, 32, 8],
  "legendary::mythic": [0, 0, 0, 0, 65, 35],
  "legendary::abyssal": [0, 0, 0, 2, 20, 78],
  "mythic::mythic": [0, 0, 0, 4, 40, 56],
  "mythic::abyssal": [0, 0, 0, 0, 8, 92],
  "abyssal::abyssal": [0, 0, 0, 0, 2, 98],
};

function normRarity(raw: string): string {
  const v = (raw || "common").toLowerCase().trim();
  return (ORDER as readonly string[]).includes(v) ? v : "common";
}

function pairKey(a: string, b: string): string {
  const ia = ORDER.indexOf(normRarity(a) as (typeof ORDER)[number]);
  const ib = ORDER.indexOf(normRarity(b) as (typeof ORDER)[number]);
  const i = Math.min(ia, ib);
  const j = Math.max(ia, ib);
  return `${ORDER[i]}::${ORDER[j]}`;
}

function weightsForKey(k: string): number[] {
  const row = WEIGHTS[k];
  return row ? [...row] : [0, 0, 0, 0, 0, 0];
}

function randomUnit(): number {
  const buf = new Uint32Array(2);
  crypto.getRandomValues(buf);
  const hi = buf[0]! >>> 11;
  const lo = buf[1]!;
  return (hi * Math.pow(2, 21) + lo) / Math.pow(2, 53);
}

/** Returns one of: common | rare | epic | legendary | mythic | abyssal */
export function rollNexusChildRarity(parentARarity: string, parentBRarity: string): string {
  const k = pairKey(parentARarity, parentBRarity);
  const w = weightsForKey(k);
  let sum = 0;
  for (const x of w) sum += Math.max(0, x);
  if (sum <= 0) return "rare";
  const u = randomUnit() * sum;
  let acc = 0;
  for (let i = 0; i < w.length; i++) {
    acc += Math.max(0, w[i]!);
    if (u < acc) return ORDER[i]!;
  }
  return ORDER[ORDER.length - 1]!;
}
