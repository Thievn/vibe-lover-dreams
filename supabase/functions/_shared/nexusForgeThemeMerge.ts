/**
 * Deterministic merge of parent forge theme snapshots (`_forgeThemeV2` / legacy `_forgeThemeV1`) for Nexus-born children.
 * Deno-safe — no path-alias imports.
 */

const FORGE_THEME_TAB_IDS = [
  "anime",
  "monster",
  "gothic",
  "realistic",
  "dark_fantasy",
  "chaos",
  "cyber_neon_syndicate",
  "starlit_siren_sci_fi",
  "steampunk_velvet",
  "retro_pinup_heat",
  "iron_glory_apex",
  "velvet_romance_soft",
  "horror_whisper_court",
  "feral_nature_covenant",
  "royal_sin_palace",
  "neon_alley_predator",
  "celestial_fallen_halo",
  "infernal_high_table",
  "abyssal_depth_siren",
  "grotesque_goddess_majesty",
] as const;

export function fnv1a32(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pickU32(h: number, mod: number): number {
  if (mod <= 0) return 0;
  return Math.abs(h) % mod;
}

function shuffleWithSeed<T>(arr: T[], seedStr: string): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const h = fnv1a32(`${seedStr}:${i}`);
    const j = pickU32(h, i + 1);
    const t = a[i]!;
    a[i] = a[j]!;
    a[j] = t;
  }
  return a;
}

export function readForgeThemeDna(rawPersonalityForge: unknown): Record<string, unknown> | null {
  if (!rawPersonalityForge || typeof rawPersonalityForge !== "object") return null;
  const root = rawPersonalityForge as Record<string, unknown>;
  const inner = root._forgeThemeV2 ?? root._forgeThemeV1;
  if (!inner || typeof inner !== "object") return null;
  return inner as Record<string, unknown>;
}

function blendUnknown(a: unknown, b: unknown, path: string, childId: string): unknown {
  if (a == null && b == null) return undefined;
  if (a == null) return b;
  if (b == null) return a;
  const h = fnv1a32(`${childId}:${path}`);
  const key = path.includes(".") ? path.slice(path.lastIndexOf(".") + 1) : path;

  if (typeof a === "number" && typeof b === "number" && Number.isFinite(a) && Number.isFinite(b)) {
    if (key === "whatTheFuckSeed") {
      return pickU32(h, 2) === 0 ? Math.floor(a) : Math.floor(b);
    }
    if (key === "tentacleCount") {
      const mid = (a + b) / 2;
      return Math.max(0, Math.min(12, Math.round(mid + pickU32(h >>> 3, 5) - 2)));
    }
    const mid = (a + b) / 2;
    const jitter = pickU32(h, 17) - 8;
    return Math.max(0, Math.min(100, Math.round(mid + jitter)));
  }
  if (typeof a === "boolean" && typeof b === "boolean") {
    return pickU32(h, 2) === 0 ? a : b;
  }
  if (typeof a === "string" && typeof b === "string") {
    return pickU32(h, 2) === 0 ? a : b;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    const sa = a.map((x) => String(x)).filter(Boolean);
    const sb = b.map((x) => String(x)).filter(Boolean);
    const set = [...new Set([...sa, ...sb])];
    if (!set.length) return [];
    const shuffled = shuffleWithSeed(set, `${childId}:${path}`);
    const n = 1 + pickU32(h, Math.min(5, shuffled.length));
    return shuffled.slice(0, n);
  }
  if (typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(ao), ...Object.keys(bo)])].filter(
      (k) => k !== "_forgeThemeV1" && k !== "_forgeThemeV2",
    );
    const out: Record<string, unknown> = {};
    for (const k of keys) {
      const v = blendUnknown(ao[k], bo[k], `${path}.${k}`, childId);
      if (v !== undefined) out[k] = v;
    }
    return out;
  }
  return pickU32(h, 2) === 0 ? a : b;
}

/** Remove nested theme snapshot from personality_forge JSON. */
export function stripForgeThemeV1(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object") return {};
  const o = { ...(raw as Record<string, unknown>) };
  delete o._forgeThemeV1;
  delete o._forgeThemeV2;
  return o;
}

const PERSONALITY_FORGE_KEYS = [
  "timePeriod",
  "personalityType",
  "speechStyle",
  "sexualEnergy",
  "relationshipVibe",
] as const;

/**
 * Merge parents' top-level personality_forge pillars (excluding _forgeThemeV1) for the child row.
 */
export function mergeChildPersonalityForgeBase(
  rawA: unknown,
  rawB: unknown,
  childId: string,
): Record<string, unknown> {
  const a = stripForgeThemeV1(rawA);
  const b = stripForgeThemeV1(rawB);
  const out: Record<string, unknown> = {};
  for (const k of PERSONALITY_FORGE_KEYS) {
    const va = a[k];
    const vb = b[k];
    if (typeof va === "string" && va.trim() && typeof vb === "string" && vb.trim()) {
      const merged = blendUnknown(va, vb, `pf.${k}`, childId);
      if (typeof merged === "string" && merged.trim()) out[k] = merged;
    } else if (typeof va === "string" && va.trim()) out[k] = va;
    else if (typeof vb === "string" && vb.trim()) out[k] = vb;
  }
  return out;
}

/**
 * Merge two parent `_forgeThemeV1` objects. Returns null if neither parent had a snapshot.
 */
export function mergeForgeThemeSnapshotsV1(
  themeA: Record<string, unknown> | null,
  themeB: Record<string, unknown> | null,
  childId: string,
): Record<string, unknown> | null {
  if (!themeA && !themeB) return null;
  const ao = (themeA ?? {}) as Record<string, unknown>;
  const bo = (themeB ?? {}) as Record<string, unknown>;
  const merged = blendUnknown(ao, bo, "snap", childId) as Record<string, unknown>;
  merged.v = 2;

  const hTab = fnv1a32(`${childId}:activeForgeTab`);
  const at = typeof ao.activeForgeTab === "string" ? ao.activeForgeTab : "";
  const bt = typeof bo.activeForgeTab === "string" ? bo.activeForgeTab : "";
  if (at && bt && at === bt) {
    merged.activeForgeTab = at;
  } else if (at && bt) {
    merged.activeForgeTab = pickU32(hTab, 2) === 0 ? at : bt;
  } else if (at) merged.activeForgeTab = at;
  else if (bt) merged.activeForgeTab = bt;
  else {
    merged.activeForgeTab = FORGE_THEME_TAB_IDS[pickU32(hTab, FORGE_THEME_TAB_IDS.length)]!;
  }

  if (typeof merged.activeForgeTab === "string") {
    const ok = (FORGE_THEME_TAB_IDS as readonly string[]).includes(merged.activeForgeTab);
    if (!ok) merged.activeForgeTab = "anime";
  }

  return merged;
}

export function buildChildPersonalityForgeRow(
  rawPersonalityA: unknown,
  rawPersonalityB: unknown,
  themeA: Record<string, unknown> | null,
  themeB: Record<string, unknown> | null,
  childId: string,
): Record<string, unknown> | null {
  const base = mergeChildPersonalityForgeBase(rawPersonalityA, rawPersonalityB, childId);
  const theme = mergeForgeThemeSnapshotsV1(themeA, themeB, childId);
  if (!theme && Object.keys(base).length === 0) return null;
  if (theme) {
    return { ...base, _forgeThemeV2: theme, _forgeThemeV1: theme };
  }
  return Object.keys(base).length ? base : null;
}
