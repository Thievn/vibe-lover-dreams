/** Themed fragments — combined for extra variety when the static list would feel repetitive. */
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

/** Evocative catalog-style names — never `Forge-*` developer slugs. */
const FORGE_DISPLAY_NAMES = [
  "Seraphine Devereaux",
  "Kaelen Marrow",
  "Orin Voss",
  "Lyra Nightingale",
  "Morwyn Ash",
  "Sable Rook",
  "Elara Moon",
  "Jax Harlan",
  "Kira Lux",
  "Zara Eclipse",
  "Nova Quinn",
  "Riven Thorne",
  "Cassian Vale",
  "Isolde Fair",
  "Dorian Cross",
  "Mira Solace",
  "Theron Drake",
  "Vesper Nyx",
  "Aurelia Frost",
  "Rowan Sable",
  "Silas Meridian",
  "Nadia Vex",
  "Caius Storm",
  "Elowen Reed",
  "Lazarus Bloom",
  "Selene Drift",
  "Orion Hale",
  "Freya Ink",
  "Magnus Rook",
  "Iris Vail",
  "Dante Hollow",
  "Yara Quill",
  "Phoenix Vale",
  "Lilith Vesper",
  "Soren Blake",
  "Amara Lux",
  "Gideon Crow",
  "Nyx Solari",
  "Valen Ashford",
  "Celeste Drift",
  "Rhys Marlowe",
  "Ophelia Rook",
  "Zane Crossfire",
  "Morgana Vale",
  "Atlas Night",
  "Juno Sterling",
  "Cyrus Vane",
  "Delilah Thorne",
  "Remy Solstice",
  "Sage Evergreen",
  "Indigo Rae",
  "Felix Harrow",
  "Luna Sable",
  "Orpheus Dawn",
  "Aria Storm",
  "Cassiel Noir",
  "Echo Meridian",
  "Raven Nox",
  "Solene Ash",
  "Marlowe Vex",
  "Coraline Drift",
  "Thorne Blackwood",
  "Vespera Moon",
  "Alaric Stone",
  "Seren Vale",
  "Dax Harlan",
  "Mielo Cross",
  "Rhea Solace",
  "Cinder Rook",
  "Nero Ash",
  "Lyric Night",
  "Oberon Vale",
  "Sable Quinn",
  "Tempest Rae",
  "Alistair Frost",
  "Belladonna Vex",
  "Cassian Night",
  "Eira Solstice",
  "Lucian Marrow",
  "Nocturne Vale",
  "Sorrel Ash",
  "Zephyr Drift",
  "Morrigan Cross",
  "Orion Sable",
  "Vesper Thorn",
  "Calypso Moon",
  "Riven Sol",
  "Isabeau Noir",
  "Kestrel Vale",
  "Mordecai Rook",
  "Sylva Nightingale",
  "Torin Ash",
  "Vega Solari",
  "Wren Marlowe",
  "Xanthe Drift",
  "Yaelis Thorn",
  "Zinnia Vale",
];

export function suggestedForgeDisplayName(): string {
  if (Math.random() < 0.55) {
    return compoundEvocativeName();
  }
  const i = Math.floor(Math.random() * FORGE_DISPLAY_NAMES.length);
  return FORGE_DISPLAY_NAMES[i] ?? compoundEvocativeName();
}
