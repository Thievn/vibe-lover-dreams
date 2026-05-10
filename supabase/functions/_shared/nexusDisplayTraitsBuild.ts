/**
 * Server-side Nexus `display_traits` — mirrors `src/lib/vibeDisplayTraits` buildNexus path (no @/ imports).
 */
const NEXUS_TRAITS_BASE: Record<string, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  abyssal: 6,
};
const BONUS = 1;

export const NEXUS_ROLLABLE_TRAIT_IDS: string[] = [
  "deep_memory", "clingy", "tease_master", "vocal", "obsession", "heat_cycle", "signature_scent", "ramp_queen",
  "bratty", "seductive_whisper", "photographic_memory", "signature_move", "mind_reader", "aftercare_queen",
  "multiple_personalities", "legacy", "unique_voice", "erotic_dream", "bondage_artist", "cum_addict", "soul_bond",
  "reality_bender", "eternal_heat", "forbidden_knowledge", "goddess_mode", "yandere", "unhinged", "deranged",
  "psychotic_sweetheart", "manic", "velvet_psychopath", "fractured", "stalker", "bloodlust", "delirious",
  "masochist", "breeding_obsessed", "worshipper", "pillow_princess", "dominant_goddess", "gremlin", "degenerate",
  "touch_starved", "monster_fucker", "caffeine_demon", "professional_brat", "himbo_energy", "ferret_wife", "war_criminal",
  "sentient_fleshlight",
];
const ROLL = new Set(NEXUS_ROLLABLE_TRAIT_IDS);

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function normRar(r: string): string {
  const x = r.toLowerCase();
  if (NEXUS_TRAITS_BASE[x] !== undefined) return x;
  return "rare";
}

function parseParentTraits(raw: unknown): string[] {
  if (!Array.isArray(raw) || !raw.length) return [];
  const o: string[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = (row as Record<string, string>).id;
    if (typeof id === "string" && ROLL.has(id)) o.push(id);
  }
  return o;
}

function pickK<T>(items: T[], seed: string, n: number, k: string): T[] {
  if (n <= 0) return [];
  return [...items]
    .map((it, i) => ({ it, s: fnv1a32(`${seed}|${k}|${i}`) }))
    .sort((a, b) => a.s - b.s)
    .slice(0, n)
    .map((x) => x.it);
}

function shuffleWithSeed(ids: string[], key: string): string[] {
  return [...ids].sort((a, b) => fnv1a32(`${key}|${a}`) - fnv1a32(`${key}|${b}`));
}

export function buildNexusDisplayTraitRows(input: {
  childRarity: string;
  childIdUuid: string;
  parentA: { display_traits?: unknown; tags?: string[]; personality?: string };
  parentB: { display_traits?: unknown; tags?: string[]; personality?: string };
}): { id: string; inherited?: boolean }[] {
  const r = normRar(input.childRarity);
  const target = (NEXUS_TRAITS_BASE[r] ?? 2) + BONUS;
  const seed = input.childIdUuid;
  const h = fnv1a32(`${seed}:nexusRoll`);
  const extraN = 1 + (h % 4);
  const a = parseParentTraits(input.parentA.display_traits);
  const b = parseParentTraits(input.parentB.display_traits);
  const inter = a.filter((id) => b.includes(id));
  const inherited: string[] = inter.length
    ? pickK(inter, seed, Math.min(3, target - 1), "inter")
    : pickK(
      [...new Set([...a, ...b])].filter((id) => ROLL.has(id)),
      seed,
      Math.min(2, target - 1),
      "union",
    );
  const shuffled = shuffleWithSeed([...NEXUS_ROLLABLE_TRAIT_IDS], seed);
  const fromRandom: string[] = [];
  const used = new Set(inherited);
  for (const id of shuffled) {
    if (fromRandom.length >= extraN) break;
    if (used.has(id)) continue;
    used.add(id);
    fromRandom.push(id);
  }
  const merged: string[] = [];
  for (const id of [...inherited, ...fromRandom]) {
    if (ROLL.has(id) && !merged.includes(id)) merged.push(id);
  }
  const uniq: string[] = [];
  for (const id of merged) {
    if (uniq.length >= target) break;
    if (!uniq.includes(id)) uniq.push(id);
  }
  for (const id of shuffled) {
    if (uniq.length >= target) break;
    if (!uniq.includes(id) && ROLL.has(id)) uniq.push(id);
  }
  const inheritedSet = new Set(
    inherited.filter((id) => ROLL.has(id)),
  );
  return uniq.slice(0, target).map((id) => ({ id, inherited: inheritedSet.has(id) }));
}
