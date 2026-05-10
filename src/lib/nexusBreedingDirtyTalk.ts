import type { DbCompanion } from "@/hooks/useCompanions";

/** Nexus merge ritual only — explicit chat lines between parents (not shown elsewhere). */
export const NEXUS_DIRTY_POOL_PUSSY = [
  "Fuck… your cock is stretching my pussy so good…",
  "Deeper… wreck my fucking pussy…",
  "My pussy is dripping all over you…",
  "Pound my pussy harder, don’t hold back…",
  "I love how deep you are in my pussy…",
  "Fill my pussy up… give me every drop…",
  "My pussy is clenching around your cock…",
  "Use my pussy… it’s yours to ruin…",
  "You’re so deep in my pussy I’m shaking…",
  "Breed my pussy… cum inside me…",
  "My pussy is so fucking wet for you…",
  "Stretch my pussy wide open…",
  "I need your cock balls deep in my pussy…",
  "Fuck my pussy just like that…",
  "My pussy is throbbing for you…",
  "Don’t pull out… fill my pussy…",
  "You’re destroying my tight little pussy…",
  "My pussy was made for your cock…",
  "I’m such a sloppy mess because of you…",
  "Keep fucking my pussy raw…",
] as const;

export const NEXUS_DIRTY_POOL_COCK = [
  "Your cock feels so fucking good inside me…",
  "I can feel your cock throbbing deep in me…",
  "Fuck me with that thick cock…",
  "Give me every inch of that cock…",
  "Your cock is so deep I can’t breathe…",
  "I love how hard your cock is for me…",
  "Push that cock deeper inside me…",
  "Your cock is stretching me so good…",
  "I want you to cum with that cock buried inside me…",
  "That cock is ruining me in the best way…",
  "Fuck… your cock is hitting all the right spots…",
  "I need that cock pounding me harder…",
  "Your cock is so big… I love it…",
  "Don’t stop using that cock on me…",
  "I’m addicted to your fucking cock…",
  "Bury that cock as deep as it’ll go…",
  "Your cock is pulsing inside me…",
  "I want that cock to flood me…",
  "That cock belongs inside me…",
  "You’re so fucking hard… I love it…",
] as const;

export const NEXUS_DIRTY_POOL_GENERAL = [
  "Fuck… I’m so horny right now…",
  "Don’t stop, I’m so close already…",
  "God yes… right there, just like that…",
  "I’m such a slut for you…",
  "Fuck me harder, I can take it…",
  "I’m getting so close… don’t stop…",
  "You feel so fucking good…",
  "I love being used like this…",
  "I’m such a dirty little whore for you…",
  "Fill me up… I want it all…",
  "I’m dripping everywhere…",
  "Fuck, I’m losing my mind…",
  "Use me… I’m yours…",
  "I want you to cum so deep inside me…",
  "I’m shaking from how good this feels…",
  "You’re fucking me so good…",
  "I need you to ruin me…",
  "I’m such a greedy slut…",
  "Don’t stop fucking me…",
  "I want every drop…",
] as const;

export type NexusBreedingPoolWeights = { wPussy: number; wCock: number; wGeneral: number };

/** Weight Pool 1 if either parent reads vulva-forward; Pool 2 if phallus-forward; always mix Pool 3. */
export function getNexusBreedingPoolWeights(a: DbCompanion, b: DbCompanion): NexusBreedingPoolWeights {
  const blob = [
    a.gender,
    b.gender,
    a.role,
    b.role,
    a.identity_anatomy_detail ?? "",
    b.identity_anatomy_detail ?? "",
    ...(a.tags ?? []),
    ...(b.tags ?? []),
    ...(a.kinks ?? []),
    ...(b.kinks ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const pussyHints =
    /\b(pussy|vulva|clit|labia|woman|female|girl|milf|mommy|mistress|she|her|womb|breed me|preg)\b/i.test(blob) ||
    /\b(pre-op|post-op)\b/i.test(blob);
  const cockHints =
    /\b(cock|dick|penis|male|man|boy|daddy|bull|balls?|thick|shaft|cum)\b/i.test(blob);

  let wPussy = 0.28;
  let wCock = 0.28;
  let wGeneral = 0.44;

  if (pussyHints && !cockHints) {
    wPussy = 0.48;
    wCock = 0.12;
    wGeneral = 0.4;
  } else if (cockHints && !pussyHints) {
    wPussy = 0.12;
    wCock = 0.48;
    wGeneral = 0.4;
  } else if (pussyHints && cockHints) {
    wPussy = 0.34;
    wCock = 0.34;
    wGeneral = 0.32;
  }

  const sum = wPussy + wCock + wGeneral;
  return { wPussy: wPussy / sum, wCock: wCock / sum, wGeneral: wGeneral / sum };
}

function pickFrom<T extends readonly string[]>(pool: T, avoid: Set<string>): string {
  const candidates = pool.filter((line) => !avoid.has(line));
  const pick = candidates.length > 0 ? candidates : [...pool];
  return pick[Math.floor(Math.random() * pick.length)]!;
}

/** Draw one explicit line and register it in `recent` (caps size). */
export function pickNexusBreedingLine(weights: NexusBreedingPoolWeights, recent: Set<string>): string {
  const r = Math.random();
  let pool: readonly string[];
  if (r < weights.wPussy) pool = NEXUS_DIRTY_POOL_PUSSY;
  else if (r < weights.wPussy + weights.wCock) pool = NEXUS_DIRTY_POOL_COCK;
  else pool = NEXUS_DIRTY_POOL_GENERAL;

  const text = pickFrom(pool, recent);
  if (recent.size > 24) {
    recent.clear();
  }
  recent.add(text);
  return text;
}

/** Returns which parent "speaks" (0 = first/parent A slot, 1 = second) and the line. */
export function nextNexusBreedingUtterance(
  weights: NexusBreedingPoolWeights,
  recent: Set<string>,
): { speaker: 0 | 1; text: string } {
  const text = pickNexusBreedingLine(weights, recent);
  return { speaker: Math.random() < 0.5 ? 0 : 1, text };
}

/** Biases toward alternating speakers so the thread reads like a back-and-forth. */
export function nextNexusBreedingUtteranceConversational(
  weights: NexusBreedingPoolWeights,
  recent: Set<string>,
  lastSpeaker: 0 | 1 | null,
): { speaker: 0 | 1; text: string } {
  const text = pickNexusBreedingLine(weights, recent);
  if (lastSpeaker === null) {
    return { speaker: Math.random() < 0.5 ? 0 : 1, text };
  }
  const alternate = lastSpeaker === 0 ? 1 : 0;
  const speaker = Math.random() < 0.82 ? alternate : lastSpeaker;
  return { speaker, text };
}
