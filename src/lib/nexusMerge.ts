import type { DbCompanion } from "@/hooks/useCompanions";

function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic “compatibility” for UI before the server finalizes merge_stats. */
export function computeNexusCompatibility(a: DbCompanion, b: DbCompanion): number {
  const tagA = new Set(a.tags.map((t) => t.toLowerCase()));
  const tagB = new Set(b.tags.map((t) => t.toLowerCase()));
  let tagOverlap = 0;
  for (const t of tagA) {
    if (tagB.has(t)) tagOverlap++;
  }
  const kA = new Set(a.kinks.map((k) => k.toLowerCase()));
  const kB = new Set(b.kinks.map((k) => k.toLowerCase()));
  let kOverlap = 0;
  for (const k of kA) {
    if (kB.has(k)) kOverlap++;
  }
  const roleMatch = a.role.trim().toLowerCase() === b.role.trim().toLowerCase() ? 6 : 0;
  const base = 54 + Math.min(28, tagOverlap * 4 + kOverlap * 3 + roleMatch);
  const jitter = fnv1a32(`${a.id}|${b.id}`) % 11;
  return Math.min(98, Math.max(61, base + jitter));
}

/** Short prose preview of how traits might fuse (client-side; merge uses Grok). */
export function buildTraitFusionPreview(a: DbCompanion, b: DbCompanion): string {
  const sharedTags = a.tags.filter((t) => b.tags.some((x) => x.toLowerCase() === t.toLowerCase()));
  const sharedKinks = a.kinks.filter((k) => b.kinks.some((x) => x.toLowerCase() === k.toLowerCase()));
  const tone =
    sharedTags.length + sharedKinks.length >= 4
      ? "exceptionally aligned"
      : sharedTags.length + sharedKinks.length >= 2
        ? "harmonious"
        : "volatile and electric";
  const tagBit =
    sharedTags.length > 0
      ? `Shared aesthetic hooks (${sharedTags.slice(0, 3).join(", ")}) suggest a ${tone} fusion.`
      : "Distinct visual identities will braid rather than blend evenly — expect sharp contrast in silhouette.";
  const kinkBit =
    sharedKinks.length > 0
      ? ` Overlapping appetites: ${sharedKinks.slice(0, 3).join(", ")} may dominate the newborn’s instinct palette.`
      : " Divergent desires will negotiate inside the new persona — tension becomes texture.";
  return `${tagBit}${kinkBit}`;
}

export function nexusCooldownRemainingMs(cooldownIso: string | null | undefined): number {
  if (!cooldownIso) return 0;
  const t = new Date(cooldownIso).getTime();
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, t - Date.now());
}

export function formatNexusCooldownShort(ms: number): string {
  if (ms <= 0) return "";
  const h = Math.ceil(ms / 3600000);
  if (h >= 48) return `${Math.ceil(h / 24)}d`;
  if (h > 1) return `${h}h`;
  const m = Math.max(1, Math.ceil(ms / 60000));
  return `${m}m`;
}
