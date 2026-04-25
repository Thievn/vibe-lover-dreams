import type { CompanionRarity } from "@/lib/companionRarity";
import { COMPANION_RARITIES, normalizeCompanionRarity, rarityDisplayLabel } from "@/lib/companionRarity";

/**
 * Stated child-rarity **distribution** (percent; may include decimals) for a Nexus merge by parent pair
 * (order-independent: lower tier first in the key).
 * This table is complete for all 21 possible parent combinations.
 */
export type NexusOutcomeRow = {
  parentA: CompanionRarity;
  parentB: CompanionRarity;
  childChancePct: Record<CompanionRarity, number>;
};

/** Product table (Nexus) — canonical weights per tier, common → abyssal (all pairs). */
export const NEXUS_RARITY_WEIGHTS: Record<string, readonly [number, number, number, number, number, number]> = {
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

export function nexusParentPairKey(a: CompanionRarity, b: CompanionRarity): string {
  const ia = COMPANION_RARITIES.indexOf(a);
  const ib = COMPANION_RARITIES.indexOf(b);
  const i = Math.min(ia, ib);
  const j = Math.max(ia, ib);
  return `${COMPANION_RARITIES[i]}::${COMPANION_RARITIES[j]}`;
}

function rowToRecord(nums: readonly number[]): Record<CompanionRarity, number> {
  const o = {} as Record<CompanionRarity, number>;
  COMPANION_RARITIES.forEach((r, i) => {
    o[r] = nums[i] ?? 0;
  });
  return o;
}

function numsForKey(k: string): readonly number[] {
  if (NEXUS_RARITY_WEIGHTS[k]) return NEXUS_RARITY_WEIGHTS[k]!;
  return [0, 0, 0, 0, 0, 0];
}

const CACHE = new Map<string, NexusOutcomeRow>();
let tableLoaded = false;

function ensureTable(): void {
  if (tableLoaded) return;
  for (let i = 0; i < COMPANION_RARITIES.length; i++) {
    for (let j = i; j < COMPANION_RARITIES.length; j++) {
      const a = COMPANION_RARITIES[i]!;
      const b = COMPANION_RARITIES[j]!;
      const k = `${a}::${b}`;
      const nums = numsForKey(k);
      CACHE.set(k, { parentA: a, parentB: b, childChancePct: rowToRecord(nums) });
    }
  }
  tableLoaded = true;
}

export function getNexusRarityOutcomesTable(): NexusOutcomeRow[] {
  ensureTable();
  return Array.from(CACHE.values());
}

export function nexusOutcomesForParents(a: CompanionRarity, b: CompanionRarity): NexusOutcomeRow {
  const k = nexusParentPairKey(a, b);
  ensureTable();
  return (
    CACHE.get(k) ?? {
      parentA: normalizeCompanionRarity(a),
      parentB: normalizeCompanionRarity(b),
      childChancePct: rowToRecord([0, 0, 0, 0, 0, 0]),
    }
  );
}

/** Gacha-style cell: em dash for impossible (0%), otherwise compact percent text. */
export function formatNexusOddsPercent(pct: number): string {
  if (pct <= 0) return "—";
  if (pct >= 10) return `${Math.round(pct)}%`;
  if (pct >= 1) return `${Number(pct.toFixed(1))}%`;
  return `${Number(pct.toFixed(2))}%`;
}

export { rarityDisplayLabel };
