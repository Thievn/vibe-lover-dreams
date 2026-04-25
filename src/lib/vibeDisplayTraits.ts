/**
 * Resolves the trait strip + profile section: DB `display_traits` or smart fallback.
 */
import type { CompanionRarity } from "@/lib/companionRarity";
import { normalizeCompanionRarity } from "@/lib/companionRarity";
import type { Companion } from "@/data/companions";
import type { DbCompanion } from "@/hooks/useCompanions";
import {
  NEXUS_FORGE_BONUS_TRAITS,
  NEXUS_ROLLABLE_TRAIT_IDS,
  NEXUS_TRAITS_BASE_COUNT,
  getVibeTraitById,
  listBaseRollableTraitIds,
  toDisplayTrait,
  type VibeDisplayTrait,
  type VibeTraitId,
} from "@/lib/vibeTraitCatalog";

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pickDeterministic<T>(items: T[], seed: string, n: number, key: string): T[] {
  if (n <= 0 || items.length === 0) return [];
  const scored = items.map((it, i) => ({ it, s: fnv1a32(`${seed}|${key}|${i}`) }));
  scored.sort((a, b) => a.s - b.s);
  return scored.slice(0, n).map((x) => x.it);
}

/** Parse JSON array of `{ id, inherited? }` from DB. */
export function parseStoredDisplayTraits(raw: unknown): { id: string; inherited?: boolean }[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: { id: string; inherited?: boolean }[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const id = typeof (row as Record<string, unknown>).id === "string" ? (row as Record<string, unknown>).id : null;
    if (!id) continue;
    out.push({
      id,
      inherited: Boolean((row as Record<string, unknown>).inherited),
    });
  }
  return out.length ? out : null;
}

/** Four permanent traits for stock / user forge: keyword-aware, nexusOnly excluded. */
export function inferBaseDisplayTraits(params: {
  seed: string;
  tags: string[];
  kinks: string[];
  personality: string;
  bio: string;
}): VibeDisplayTrait[] {
  const pool = listBaseRollableTraitIds();
  const text = [params.tags.join(" "), params.kinks.join(" "), params.personality, params.bio].join(" ").toLowerCase();

  const scoreFor = (id: VibeTraitId) => {
    const def = getVibeTraitById(id);
    if (!def) return 0;
    const terms = [def.id.replace(/_/g, " "), def.label.toLowerCase(), def.word.toLowerCase(), ...def.label.split(/[\s-]+/)]
      .map((s) => s.toLowerCase())
      .filter((s) => s.length > 2);
    let s = fnv1a32(`${params.seed}#${id}`) % 3;
    for (const t of terms) {
      if (t.length > 2 && text.includes(t)) s += 4;
    }
    return s;
  };

  const ranked = [...pool].sort((a, b) => scoreFor(b) - scoreFor(a));
  const take = (() => {
    if (ranked[0] !== undefined && scoreFor(ranked[0]) > 3) {
      return pickDeterministic(ranked, params.seed, 4, "base");
    }
    return pickDeterministic(ranked, params.seed, 4, "baseflat");
  })();
  return take
    .map((id) => getVibeTraitById(id))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))
    .map((d) => toDisplayTrait(d));
}

export function resolveDisplayTraitsForDb(
  db: Pick<DbCompanion, "id" | "tags" | "kinks" | "personality" | "bio" | "is_nexus_hybrid" | "rarity"> & { display_traits?: unknown },
): VibeDisplayTrait[] {
  const stored = parseStoredDisplayTraits(db.display_traits);
  if (stored) {
    const out: VibeDisplayTrait[] = [];
    for (const s of stored) {
      const def = getVibeTraitById(s.id);
      if (def) {
        out.push(
          toDisplayTrait(def, {
            inherited: s.inherited,
            nexusRoll: Boolean(db.is_nexus_hybrid) && !s.inherited,
          }),
        );
      }
    }
    if (out.length > 0) return out;
  }
  if (db.is_nexus_hybrid) {
    return nexusEmptyFallbackTraits(db.id, db.rarity);
  }
  return inferBaseDisplayTraits({
    seed: db.id,
    tags: db.tags ?? [],
    kinks: db.kinks ?? [],
    personality: db.personality ?? "",
    bio: db.bio ?? "",
  });
}

export function resolveDisplayTraitsForCompanion(c: Companion): VibeDisplayTrait[] {
  if (c.displayTraits && c.displayTraits.length > 0) return c.displayTraits;
  return inferBaseDisplayTraits({
    seed: c.id,
    tags: c.tags,
    kinks: c.kinks,
    personality: c.personality,
    bio: c.bio,
  });
}

/**
 * Produces the JSON to store in `display_traits` for a fresh forge (non-Nexus) row.
 * Exactly four ids.
 */
export function serializeBaseDisplayTraitsForInsert(params: {
  seed: string;
  tags: string[];
  kinks: string[];
  personality: string;
  bio: string;
}): { id: string; inherited?: boolean }[] {
  return inferBaseDisplayTraits(params).map((t) => ({ id: t.id }));
}

/** Strips cc- for UUID for stable seeds inside Edge. */
export function nexusChildSeedKey(ccId: string): string {
  return ccId.startsWith("cc-") ? ccId.slice(3) : ccId;
}

/**
 * How many visible traits a Nexus child shows: by child rarity, plus 1 “Nexus” bonus line.
 * Example: two commons → child might be rare (2) +1 = 3 trait chips.
 */
export function nexusTotalTraitCount(childRarity: string): number {
  const r = normalizeCompanionRarity(childRarity);
  return (NEXUS_TRAITS_BASE_COUNT[r] ?? 2) + NEXUS_FORGE_BONUS_TRAITS;
}

export { NEXUS_TRAITS_BASE_COUNT, NEXUS_FORGE_BONUS_TRAITS, NEXUS_ROLLABLE_TRAIT_IDS };

/**
 * Storable rows for `custom_characters.display_traits` (Nexus child).
 * Merges inherited parent traits with 1–4 fresh rolls from the 50, then pads to
 * (rarity base count + 1 Nexus bonus).
 */
export function buildNexusStoredDisplayTraits(input: {
  childRarity: string;
  childIdUuid: string;
  parentA: { display_traits?: unknown; tags?: string[]; personality?: string };
  parentB: { display_traits?: unknown; tags?: string[]; personality?: string };
}): { id: string; inherited?: boolean }[] {
  const r = normalizeCompanionRarity(input.childRarity);
  const target = (NEXUS_TRAITS_BASE_COUNT[r] ?? 2) + NEXUS_FORGE_BONUS_TRAITS;
  const seed = input.childIdUuid;
  const h = fnv1a32(`${seed}:nexusRoll`);
  const extraN = 1 + (h % 4);

  const parseIds = (row: { display_traits?: unknown }): string[] => {
    const s = parseStoredDisplayTraits(row.display_traits);
    return s?.map((x) => x.id) ?? [];
  };
  const a = parseIds(input.parentA);
  const b = parseIds(input.parentB);
  const inter = a.filter((id) => b.includes(id));
  let inherited: string[] = [];
  if (inter.length) {
    inherited = pickDeterministic(inter, seed, Math.min(3, target - 1), "inter");
  } else {
    const u = [...new Set([...a, ...b])].filter((id) => NEXUS_ROLLABLE_TRAIT_IDS.includes(id as VibeTraitId));
    inherited = pickDeterministic(u, seed, Math.min(2, target - 1), "union");
  }
  for (const id of inherited) {
    if (!getVibeTraitById(id)) continue;
  }

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
    if (getVibeTraitById(id) && !merged.includes(id)) merged.push(id);
  }
  const uniq: string[] = [];
  for (const id of merged) {
    if (uniq.length >= target) break;
    if (uniq.includes(id)) continue;
    uniq.push(id);
  }
  for (const id of shuffled) {
    if (uniq.length >= target) break;
    if (uniq.includes(id)) continue;
    if (!getVibeTraitById(id)) continue;
    uniq.push(id);
  }
  const inheritedSet = new Set(inherited.filter((id) => getVibeTraitById(id)));
  return uniq.slice(0, target).map((id) => ({ id, inherited: inheritedSet.has(id) }));
}

function shuffleWithSeed(ids: string[], key: string): string[] {
  return [...ids].sort((a, b) => fnv1a32(`${key}|${a}`) - fnv1a32(`${key}|${b}`));
}

/** Old rows without `display_traits` (edge case). */
function nexusEmptyFallbackTraits(id: string, rarityRaw: string | undefined): VibeDisplayTrait[] {
  const n = nexusTotalTraitCount(rarityRaw ?? "rare");
  const sh = shuffleWithSeed([...NEXUS_ROLLABLE_TRAIT_IDS], id);
  const out: VibeDisplayTrait[] = [];
  for (let i = 0; i < n && i < sh.length; i++) {
    const def = getVibeTraitById(sh[i]!);
    if (def) out.push(toDisplayTrait(def, { nexusRoll: true }));
  }
  return out;
}
