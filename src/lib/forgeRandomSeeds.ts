/** Random sampling for LustForge UI — maximizes variety vs fixed [0] defaults. */

export function pickOne<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** Without replacement; if count > arr length, returns a shuffled copy of arr. */
export function pickRandom<T>(arr: readonly T[], count: number): T[] {
  if (count <= 0) return [];
  const copy = [...arr];
  const out: T[] = [];
  const n = Math.min(count, copy.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]!);
  }
  return out;
}

/** 1–3 picks for multi-select forge fields. */
export function randomSelectionCount(): number {
  return 1 + Math.floor(Math.random() * 3);
}

/** 3–6 random visual/personality traits. */
export function randomTraitCount(): number {
  return 3 + Math.floor(Math.random() * 4);
}
