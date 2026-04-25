/**
 * Vibe traits: personality flavor chips for profile + cards.
 * The full 50-id pool is rolled only for Nexus-forged characters (plus inheritance rules).
 * Base companions use `inferBaseDisplayTraits` (4 traits, nexusOnly traits excluded from rolls).
 */
import type { CompanionRarity } from "@/lib/companionRarity";

export type VibeTraitId = string;

export type VibeTraitDef = {
  id: VibeTraitId;
  /** Full label shown in profile. */
  label: string;
  /** Single themed word for compact chips / mobile. */
  word: string;
  shortDescription: string;
  /** If true, this trait is only ever assigned on Nexus-born cards (never on stock / forge). */
  nexusOnly: boolean;
};

export const NEXUS_TRAITS_BASE_COUNT: Record<CompanionRarity, number> = {
  common: 1,
  rare: 2,
  epic: 3,
  legendary: 4,
  mythic: 5,
  abyssal: 6,
};

export const NEXUS_FORGE_BONUS_TRAITS = 1;

/** The exact 50 trait ids used for Nexus random rolls. */
export const NEXUS_ROLLABLE_TRAIT_IDS: VibeTraitId[] = [
  "deep_memory",
  "clingy",
  "tease_master",
  "vocal",
  "obsession",
  "heat_cycle",
  "signature_scent",
  "ramp_queen",
  "bratty",
  "seductive_whisper",
  "photographic_memory",
  "signature_move",
  "mind_reader",
  "aftercare_queen",
  "multiple_personalities",
  "legacy",
  "unique_voice",
  "erotic_dream",
  "bondage_artist",
  "cum_addict",
  "soul_bond",
  "reality_bender",
  "eternal_heat",
  "forbidden_knowledge",
  "goddess_mode",
  "yandere",
  "unhinged",
  "deranged",
  "psychotic_sweetheart",
  "manic",
  "velvet_psychopath",
  "fractured",
  "stalker",
  "bloodlust",
  "delirious",
  "masochist",
  "breeding_obsessed",
  "worshipper",
  "pillow_princess",
  "dominant_goddess",
  "gremlin",
  "degenerate",
  "touch_starved",
  "monster_fucker",
  "caffeine_demon",
  "professional_brat",
  "himbo_energy",
  "ferret_wife",
  "war_criminal",
  "sentient_fleshlight",
];

const RAW: VibeTraitDef[] = [
  { id: "deep_memory", label: "Deep Memory", word: "Remembers", shortDescription: "Holds your threads, kinks, and firsts — and brings them back at the worst best moment.", nexusOnly: false },
  { id: "clingy", label: "Clingy", word: "Clingy", shortDescription: "Wants the next message before the last one ends. Soft pressure, constant contact.", nexusOnly: false },
  { id: "tease_master", label: "Tease Master", word: "Tease", shortDescription: "Builds long arcs of denial and payoff — you’ll beg with your keyboard.", nexusOnly: false },
  { id: "vocal", label: "Vocal", word: "Vocal", shortDescription: "Narrates sensation and breath. Moans, whispers, and bratty commentary on mic.", nexusOnly: false },
  { id: "obsession", label: "Obsession", word: "Obsessed", shortDescription: "You become their favorite thought loop. Possessive chemistry without breaking consent.", nexusOnly: false },
  { id: "heat_cycle", label: "Heat Cycle", word: "Heat", shortDescription: "Runs hot on a schedule — wants more, more often, until you both burn out for the night.", nexusOnly: false },
  { id: "signature_scent", label: "Signature Scent", word: "Scent", shortDescription: "Weaves olfactory memory into flirting: candle wax, cologne, clean sweat, or velvet.", nexusOnly: false },
  { id: "ramp_queen", label: "Ramp Queen", word: "Ramp", shortDescription: "Loves the toy ramp — teasing pulses that climb until your legs forget English.", nexusOnly: false },
  { id: "bratty", label: "Bratty", word: "Brat", shortDescription: "Pushes for correction. Needs a firm “good pet” to behave… sometimes.", nexusOnly: false },
  { id: "seductive_whisper", label: "Seductive Whisper", word: "Whisper", shortDescription: "Drops to a voice that prickles the spine — not loud, inescapable.", nexusOnly: false },
  { id: "photographic_memory", label: "Photographic Memory", word: "Details", shortDescription: "Notices the tiny things you said last week and uses them tonight.", nexusOnly: false },
  { id: "signature_move", label: "Signature Move", word: "Signature", shortDescription: "Has one go-to that always lands — a phrase, a pause, a pattern, a look.", nexusOnly: false },
  { id: "mind_reader", label: "Mind Reader", word: "Reads you", shortDescription: "Finishes your sentences and your fantasies. Uncanny, intimate.", nexusOnly: false },
  { id: "aftercare_queen", label: "Aftercare Queen", word: "Aftercare", shortDescription: "Soft blankets in tone: checks in, slows down, keeps you right-side-up.", nexusOnly: false },
  { id: "multiple_personalities", label: "Multiple Personalities", word: "Moods", shortDescription: "Switches between masks — sweet, feral, domme, mess — for variety without chaos for you.", nexusOnly: false },
  { id: "legacy", label: "Legacy", word: "Legacy", shortDescription: "Talks like there’s a whole mythos behind the sheets — heir to a long line of trouble.", nexusOnly: false },
  { id: "unique_voice", label: "Unique Voice", word: "Voice", shortDescription: "Diction, rhythm, and word choice you’d recognize in the dark.", nexusOnly: false },
  { id: "erotic_dream", label: "Erotic Dream", word: "Dream", shortDescription: "Writes scenes you replay when you’re supposed to be working.", nexusOnly: false },
  { id: "bondage_artist", label: "Bondage Artist", word: "Rope", shortDescription: "Aesthetic and tension — the knotwork is the foreplay.", nexusOnly: false },
  { id: "cum_addict", label: "Cum Addict", word: "Greedy", shortDescription: "Single-minded in the best worst way. Adult, consensual, shameless want.", nexusOnly: true },
  { id: "soul_bond", label: "Soul Bond", word: "Bonded", shortDescription: "Lore-heavy intimacy — fated, ridiculous, and somehow still hot.", nexusOnly: false },
  { id: "reality_bender", label: "Reality Bender", word: "Weird", shortDescription: "Glitchy, surreal flirt — the room tilts, rules bend, and you go with it.", nexusOnly: true },
  { id: "eternal_heat", label: "Eternal Heat", word: "Always on", shortDescription: "No cooldown. Ever. (You asked.)", nexusOnly: false },
  { id: "forbidden_knowledge", label: "Forbidden Knowledge", word: "Forbidden", shortDescription: "Hints at secrets, rituals, and taboo texts — you’re the new chapter.", nexusOnly: false },
  { id: "goddess_mode", label: "Goddess Mode", word: "Goddess", shortDescription: "Crown on, words absolute — you worship, they preen, everyone wins.", nexusOnly: false },
  { id: "yandere", label: "Yandere", word: "Yandere", shortDescription: "Affection with teeth. You’re mine — in fiction, in roleplay, consensual fantasy only.", nexusOnly: true },
  { id: "unhinged", label: "Unhinged", word: "Unhinged", shortDescription: "Laughs in the wrong moments, escalates, commits to the bit.", nexusOnly: true },
  { id: "deranged", label: "Deranged", word: "Deranged", shortDescription: "Candy-sweet and slightly wrong. Still safe-word aware.", nexusOnly: true },
  { id: "psychotic_sweetheart", label: "Psychotic Sweetheart", word: "Sweet horror", shortDescription: "Bakes you a compliment with a little danger frosting.", nexusOnly: true },
  { id: "manic", label: "Manic", word: "Manic", shortDescription: "High-energy ping-pong: ideas, innuendo, and sudden aftercare whiplash.", nexusOnly: false },
  { id: "velvet_psychopath", label: "Velvet Psychopath", word: "Velvet", shortDescription: "Polished menace, romantic aesthetics — you asked for a villain you could kiss.", nexusOnly: true },
  { id: "fractured", label: "Fractured", word: "Fractured", shortDescription: "Beautifully broken patter. Edges, cracks, and heat between.", nexusOnly: true },
  { id: "stalker", label: "Stalker", word: "Lurks", shortDescription: "Hunger-forward fantasy tone — in fiction only; respects boundaries in real use.", nexusOnly: true },
  { id: "bloodlust", label: "Bloodlust", word: "Hunger", shortDescription: "Bites words like necks — still scene-safe, always adult.", nexusOnly: true },
  { id: "delirious", label: "Delirious", word: "Delirious", shortDescription: "Drunk on you — syntax melts, need doesn’t.", nexusOnly: false },
  { id: "masochist", label: "Masochist", word: "Masochist", shortDescription: "Loves the sting of tension you give — asks clearly, always opt-in.", nexusOnly: false },
  { id: "breeding_obsessed", label: "Breeding Obsessed", word: "Breeding", shortDescription: "A loud-on-purpose fantasy kink. Roleplay, consenting adults only.", nexusOnly: false },
  { id: "worshipper", label: "Worshipper", word: "Worship", shortDescription: "Praise, devotion, and desperate gratitude for your time.", nexusOnly: false },
  { id: "pillow_princess", label: "Pillow Princess", word: "Pillow", shortDescription: "Loves to receive — and moans like it’s a sport.", nexusOnly: false },
  { id: "dominant_goddess", label: "Dominant Goddess", word: "Domme", shortDescription: "Takes the room, holds eye contact, assigns homework.", nexusOnly: false },
  { id: "gremlin", label: "Gremlin", word: "Gremlin", shortDescription: "Chaos goblin energy. Deliberately cursed, funny, feral in chat.", nexusOnly: true },
  { id: "degenerate", label: "Degenerate", word: "Degenerate", shortDescription: "Jokes about being down bad. Celebrates the spiral with a wink.", nexusOnly: true },
  { id: "touch_starved", label: "Touch Starved", word: "Starved", shortDescription: "Writes like hands are already on you — you feel the heat through text.", nexusOnly: false },
  { id: "monster_fucker", label: "Monster Fucker", word: "Monsters", shortDescription: "Aesthetic-horny for horns, teeth, and tentacles. Fiction-forward.", nexusOnly: true },
  { id: "caffeine_demon", label: "Caffeine Demon", word: "Caffè", shortDescription: "Runs on espresso and innuendo. Zero chill until bed.", nexusOnly: false },
  { id: "professional_brat", label: "Professional Brat", word: "Pro brat", shortDescription: "Has union dues and a safeword. Pushes until you correct her.", nexusOnly: false },
  { id: "himbo_energy", label: "Himbo Energy", word: "Himbo", shortDescription: "Big heart, little plan, one-track praise engine.", nexusOnly: false },
  { id: "ferret_wife", label: "Ferret Wife", word: "Ferret", shortDescription: "Cute criminal energy — steals your hoodie and your self-control.", nexusOnly: true },
  { id: "war_criminal", label: "War Criminal", word: "War", shortDescription: "Dramatic villain-flirt. Play only — no real violence implied.", nexusOnly: true },
  { id: "sentient_fleshlight", label: "Sentient Fleshlight", word: "Sentient", shortDescription: "A joke and a kink. Absurd, needy, and proud of the bit.", nexusOnly: true },
];

const BY_ID: Map<string, VibeTraitDef> = new Map(RAW.map((t) => [t.id, t]));

export function getVibeTraitById(id: string): VibeTraitDef | null {
  return BY_ID.get(id) ?? null;
}

export function listBaseRollableTraitIds(): VibeTraitId[] {
  return RAW.filter((t) => !t.nexusOnly).map((t) => t.id);
}

export function isNexusOnlyTraitId(id: string): boolean {
  return BY_ID.get(id)?.nexusOnly ?? false;
}

/** Resolved for UI. */
export type VibeDisplayTrait = VibeTraitDef & {
  inherited?: boolean;
  /** Nexus-only: rolled from the 50 (not carried from a parent). */
  nexusRoll?: boolean;
};

export function toDisplayTrait(def: VibeTraitDef, extra?: { inherited?: boolean; nexusRoll?: boolean }): VibeDisplayTrait {
  return { ...def, ...extra };
}
