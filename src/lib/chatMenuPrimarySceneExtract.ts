/**
 * Client copy of `supabase/functions/_shared/chatMenuPrimarySceneExtract.ts` — keep in sync.
 */
export const MENU_PRIMARY_BODY_MARKERS = [
  "— CHARACTER / LIKENESS (READ FIRST",
  "MENU_TILE_SCENE:",
  "— Requested framing (from menu) —",
  "— USER-CHOSEN SCENE (EXECUTION PRIORITY #1 — NOT A PORTRAIT REMASTER) —",
  "**PRIMARY SCENE (execute literally",
  "**PRIMARY SCENE (authoritative",
] as const;

export const MENU_IDENTITY_MARKERS = [
  "**#0 CHARACTER REFERENCE",
  "FORGE_VISUAL_IDENTITY",
  "**#1 PRIORITY — SAME PERSON AS MAIN PORTRAIT",
  "— CHARACTER REFERENCE (likeness text",
  "— CHARACTER / LIKENESS (READ FIRST",
] as const;

export const MAX_MENU_PRIMARY_EXTRACT = 5600;
const MAX_IDENTITY_HEAD = 2800;
const MAX_TILE_SCENE = 2200;
const MAX_TIER_TONE = 700;

export function extractMenuPrimarySceneBody(fullPrompt: string): string {
  const f = String(fullPrompt ?? "");
  let best = -1;
  for (const m of MENU_PRIMARY_BODY_MARKERS) {
    const i = f.indexOf(m);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  if (best < 0) return "";
  const slice = f.slice(best).trim();
  if (slice.length > MAX_MENU_PRIMARY_EXTRACT) {
    return `${slice.slice(0, MAX_MENU_PRIMARY_EXTRACT).trimEnd()}…`;
  }
  return slice;
}

export function extractMenuIdentityFromFused(fullPrompt: string): string {
  const f = String(fullPrompt ?? "");
  let best = -1;
  for (const m of MENU_IDENTITY_MARKERS) {
    const i = f.indexOf(m);
    if (i >= 0 && (best < 0 || i < best)) best = i;
  }
  if (best < 0) return "";
  const afterIdentity = f.slice(best);
  const tileIdx = afterIdentity.indexOf("MENU_TILE_SCENE:");
  const slice =
    tileIdx > 80 ? afterIdentity.slice(0, tileIdx).trim() : afterIdentity.slice(0, MAX_IDENTITY_HEAD).trim();
  if (slice.length > MAX_IDENTITY_HEAD) {
    return `${slice.slice(0, MAX_IDENTITY_HEAD).trimEnd()}…`;
  }
  return slice;
}

export function buildMenuIdentityHeadFromParts(parts: {
  visualIdentityCapsule?: string | null;
  characterReference?: string | null;
  portraitConsistencyLock?: string | null;
}): string {
  const capsule = String(parts.visualIdentityCapsule ?? "").trim();
  const charRef = String(parts.characterReference ?? "").trim();
  const portraitLock = String(parts.portraitConsistencyLock ?? "").trim();
  const blocks: string[] = [];
  if (portraitLock) {
    blocks.push(
      `[PORTRAIT & LIKENESS LOCK] ${portraitLock.slice(0, 900)}${portraitLock.length > 900 ? "…" : ""}`,
    );
  }
  if (capsule) blocks.push(capsule.slice(0, MAX_IDENTITY_HEAD));
  if (charRef) {
    const refBlock = `CHARACTER REFERENCE (face, hair, skin, tattoos, species — not card room/outfit):\n${charRef.slice(0, 1400)}${charRef.length > 1400 ? "…" : ""}`;
    if (!capsule.includes(charRef.slice(0, Math.min(60, charRef.length)))) {
      blocks.push(refBlock);
    }
  }
  return blocks.join("\n\n").trim().slice(0, MAX_IDENTITY_HEAD);
}

export function buildMenuImagineClampBody(args: {
  identityHead: string;
  tileScene: string;
  tierTone?: string | null;
}): string {
  const identity = String(args.identityHead ?? "").trim();
  const tile = String(args.tileScene ?? "").trim();
  const tier = String(args.tierTone ?? "").trim();
  const sections: string[] = [];
  if (identity.length >= 24) {
    sections.push(
      `— CHARACTER / LIKENESS (READ FIRST — same individual as profile / roster portrait) —\n${identity}`,
    );
  }
  if (tile.length >= 12) {
    const tileClamped =
      tile.length > MAX_TILE_SCENE ? `${tile.slice(0, MAX_TILE_SCENE).trimEnd()}…` : tile;
    sections.push(
      `— MENU TILE SCENE (place / pose / wardrobe / props — execute literally) —\nMENU_TILE_SCENE:\n${tileClamped}\n\n**PRIMARY SCENE (execute literally):**\n${tileClamped}`,
    );
  }
  if (tier.length >= 12) {
    sections.push(
      `— TIER TONE ONLY (mood / coverage — not location) —\n${tier.slice(0, MAX_TIER_TONE)}${tier.length > MAX_TIER_TONE ? "…" : ""}`,
    );
  }
  const joined = sections.join("\n\n");
  if (joined.length > MAX_MENU_PRIMARY_EXTRACT) {
    return `${joined.slice(0, MAX_MENU_PRIMARY_EXTRACT).trimEnd()}…`;
  }
  return joined;
}

export function resolveMenuPrimarySceneForImagine(args: {
  identityHead?: string | null;
  explicitTileScene?: string | null;
  tierTone?: string | null;
  fusedPrompt: string;
}): string {
  const identity =
    String(args.identityHead ?? "").trim() || extractMenuIdentityFromFused(args.fusedPrompt);
  const tile = String(args.explicitTileScene ?? "").trim();
  const tier = String(args.tierTone ?? "").trim();
  if (tile.length >= 12 && identity.length >= 24) {
    return buildMenuImagineClampBody({ identityHead: identity, tileScene: tile, tierTone: tier });
  }
  if (tile.length >= 12) {
    return buildMenuImagineClampBody({ identityHead: identity, tileScene: tile, tierTone: tier });
  }
  return extractMenuPrimarySceneBody(args.fusedPrompt);
}

export function buildMenuScenarioBindingLead(tileScene: string, tileLabel?: string | null): string {
  const scene = String(tileScene ?? "").trim();
  if (!scene) return "";
  const label = String(tileLabel ?? "").trim();
  const excerpt = scene.replace(/\s+/g, " ").slice(0, 400);
  const labelBit = label ? ` (“${label}”)` : "";
  return `SCENARIO (binding — execute literally${labelBit}): ${excerpt}${scene.length > 400 ? "…" : ""} — **not** a generic bedroom portrait, catalog three-quarter, or random armchair unless the scene text explicitly names that furniture.`;
}

export function buildMenuIdentityBindingLead(identityHead: string): string {
  const id = String(identityHead ?? "").trim();
  if (!id) return "";
  const excerpt = id.replace(/\s+/g, " ").slice(0, 320);
  return `IDENTITY (binding — non-negotiable): ${excerpt}${id.length > 320 ? "…" : ""} — match profile portrait + Character Details for face, hair, skin, tattoos, species marks, and body type; **then** apply the menu tile scene for outfit, pose, and environment only.`;
}
