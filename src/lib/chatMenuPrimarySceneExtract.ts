/**
 * Client copy of `supabase/functions/_shared/chatMenuPrimarySceneExtract.ts` — keep in sync.
 */
export const MENU_PRIMARY_BODY_MARKERS = [
  "MENU_TILE_SCENE:",
  "— Requested framing (from menu) —",
  "— USER-CHOSEN SCENE (EXECUTION PRIORITY #1 — NOT A PORTRAIT REMASTER) —",
  "**PRIMARY SCENE (execute literally",
  "**PRIMARY SCENE (authoritative",
] as const;

export const MAX_MENU_PRIMARY_EXTRACT = 5600;

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

export function resolveMenuPrimarySceneForImagine(args: {
  explicitTileScene?: string | null;
  fusedPrompt: string;
}): string {
  const explicit = String(args.explicitTileScene ?? "").trim();
  if (explicit.length >= 20) {
    return explicit.length > MAX_MENU_PRIMARY_EXTRACT
      ? `${explicit.slice(0, MAX_MENU_PRIMARY_EXTRACT).trimEnd()}…`
      : explicit;
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
