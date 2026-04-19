/** Offline fallback only when Grok name invention fails — no static catalog roster. */

const NAME_CORES = [
  "Myrrh",
  "Vex",
  "Kael",
  "Zohra",
  "Thalen",
  "Ixis",
  "Oryx",
  "Niamh",
  "Sorin",
  "Yael",
  "Qirin",
  "Fen",
  "Rhea",
  "Tamsin",
  "Umbrae",
  "Virel",
  "Xanth",
  "Zephy",
  "Aurex",
  "Brume",
] as const;

const NAME_TAILS = [
  "ithis",
  "astra",
  "vane",
  "kai",
  "thiel",
  "lun",
  "mire",
  "vex",
  "nox",
  "sol",
  "drift",
  "harrow",
  "quill",
  "shard",
  "rime",
  "ash",
  "vale",
  "nyx",
] as const;

const EPITHETS = [
  "the Inkbound",
  "of the Veil",
  "Nine-Fingers",
  "the Hollow Choir",
  "Saltglass",
  "the Ember Oath",
  "Black-Tide",
  "the Gilded Fault",
  "Starveling",
  "the Quiet Furnace",
] as const;

function compoundEvocativeName(): string {
  const roll = Math.random();
  if (roll < 0.34) {
    return `${pick(NAME_CORES)} ${pick(NAME_TAILS)}`.replace(/\s+/g, "");
  }
  if (roll < 0.67) {
    return `${pick(NAME_CORES)} ${pick(EPITHETS)}`;
  }
  return `${pick(NAME_CORES)}'${pick(NAME_TAILS)}`;
}

function pick<T extends readonly string[]>(arr: T): T[number] {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Last-resort display name if `forge_name_only` fails (network / API).
 * Procedural glue — not a curated list, so it won't mirror catalog cards.
 */
export function fallbackForgeDisplayName(): string {
  return compoundEvocativeName();
}
