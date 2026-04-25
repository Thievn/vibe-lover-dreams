import type { CompanionRarity } from "@/lib/companionRarity";
import { COMPANION_RARITIES, rarityDisplayLabel } from "@/lib/companionRarity";

/**
 * Stated child-rarity **distribution** (percent, sum 100) for a Nexus merge when parents are
 * the given pair. Lower alphabetical rarity first, then higher (e.g. common+epic).
 * These are the product’s reference odds; the AI may still return any tier, but the UI
 * is transparent about intended mathematics.
 */
export type NexusOutcomeRow = {
  parentA: CompanionRarity;
  parentB: CompanionRarity;
  /** child tier → percent */
  childChancePct: Record<CompanionRarity, number>;
};

function keyPair(a: CompanionRarity, b: CompanionRarity): string {
  const [x, y] = [a, b].sort((p, q) => COMPANION_RARITIES.indexOf(p) - COMPANION_RARITIES.indexOf(q));
  return `${x}::${y}`;
}

// Hand-tuned: higher parent tiers weight upgrades; low pairings bias common/rare.
const RAW: Record<string, [number, number, number, number, number, number]> = {
  "common::common": [60, 28, 8, 3, 1, 0],
  "common::rare": [42, 35, 16, 5, 1, 1],
  "common::epic": [28, 32, 26, 8, 4, 2],
  "common::legendary": [15, 22, 30, 22, 7, 4],
  "common::mythic": [8, 14, 24, 28, 16, 10],
  "common::abyssal": [2, 6, 12, 22, 32, 26],
  "rare::rare": [32, 38, 20, 7, 2, 1],
  "rare::epic": [12, 28, 32, 18, 6, 4],
  "rare::legendary": [5, 14, 24, 35, 14, 8],
  "rare::mythic": [0, 8, 16, 28, 32, 16],
  "rare::abyssal": [0, 2, 8, 16, 34, 40],
  "epic::epic": [4, 18, 40, 22, 10, 6],
  "epic::legendary": [0, 4, 18, 32, 28, 18],
  "epic::mythic": [0, 0, 8, 22, 40, 30],
  "epic::abyssal": [0, 0, 2, 10, 32, 56],
  "legendary::legendary": [0, 0, 4, 38, 32, 26],
  "legendary::mythic": [0, 0, 0, 8, 42, 50],
  "legendary::abyssal": [0, 0, 0, 2, 20, 78],
  "mythic::mythic": [0, 0, 0, 4, 40, 56],
  "mythic::abyssal": [0, 0, 0, 0, 8, 92],
  "abyssal::abyssal": [0, 0, 0, 0, 2, 98],
};

function rowToRecord(nums: [number, number, number, number, number, number]): Record<CompanionRarity, number> {
  const o = {} as Record<CompanionRarity, number>;
  COMPANION_RARITIES.forEach((r, i) => {
    o[r] = nums[i] ?? 0;
  });
  return o;
}

const CACHE = new Map<string, NexusOutcomeRow>();
let tableLoaded = false;

function ensureTable(): void {
  if (tableLoaded) return;
  for (const [k, nums] of Object.entries(RAW)) {
    const [a, b] = k.split("::") as [CompanionRarity, CompanionRarity];
    const entry: NexusOutcomeRow = { parentA: a, parentB: b, childChancePct: rowToRecord(nums) };
    CACHE.set(k, entry);
  }
  tableLoaded = true;
}

export function getNexusRarityOutcomesTable(): NexusOutcomeRow[] {
  ensureTable();
  return Array.from(CACHE.values());
}

export function nexusOutcomesForParents(a: CompanionRarity, b: CompanionRarity): NexusOutcomeRow {
  const k = keyPair(a, b);
  ensureTable();
  return (
    CACHE.get(k) ?? {
      parentA: a,
      parentB: b,
      childChancePct: rowToRecord([16, 22, 24, 18, 12, 8]),
    }
  );
}

export { rarityDisplayLabel };
