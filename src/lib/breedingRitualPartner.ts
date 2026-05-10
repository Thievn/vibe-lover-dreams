import type { DbCompanion } from "@/hooks/useCompanions";

/** Second parent for chat breeding covenant: vault pick, or a twined echo of the primary. */
export function resolveBreedingRitualPartnerB(primary: DbCompanion, candidate: DbCompanion | null): DbCompanion {
  if (candidate && candidate.id !== primary.id) return candidate;
  const stem = primary.name.trim().split(/\s+/)[0] ?? primary.name;
  return {
    ...primary,
    id: `${primary.id}::covenant_echo`,
    name: `${stem} · twined shade`,
  };
}
