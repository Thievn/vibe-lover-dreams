import type { Companion } from "@/data/companions";

export const CHAT_AFFECTION_MAX_TIER = 5;

/** Messages needed to advance from tier N → N+1 (N = 1..4). */
export const MESSAGES_TO_ADVANCE: readonly [number, number, number, number] = [8, 12, 15, 20];

export function messagesNeededForNextLevel(level: number): number {
  if (level < 1 || level >= CHAT_AFFECTION_MAX_TIER) return 0;
  return MESSAGES_TO_ADVANCE[level - 1] ?? 8;
}

/** Keeps legacy `affection_level` (0–100) aligned with tier for mood / devices UI. */
export function tierToLegacyAffectionPct(tier: number): number {
  return Math.min(100, Math.max(0, Math.round(tier * 20)));
}

export type AffectionRewardKind = "lewd" | "intimate";

export function rewardKindForNewLevel(newLevel: number): AffectionRewardKind | null {
  if (newLevel === 2 || newLevel === 3) return "lewd";
  if (newLevel === 4 || newLevel === 5) return "intimate";
  return null;
}

export function advanceChatAffectionState(args: {
  level: number;
  progress: number;
}): {
  level: number;
  progress: number;
  leveledTo: number | null;
  reward: AffectionRewardKind | null;
} {
  let level = Math.min(CHAT_AFFECTION_MAX_TIER, Math.max(1, args.level || 1));
  let progress = Math.max(0, args.progress || 0);

  if (level >= CHAT_AFFECTION_MAX_TIER) {
    return { level: CHAT_AFFECTION_MAX_TIER, progress: 0, leveledTo: null, reward: null };
  }

  progress += 1;
  let leveledTo: number | null = null;
  let reward: AffectionRewardKind | null = null;
  let need = messagesNeededForNextLevel(level);

  while (level < CHAT_AFFECTION_MAX_TIER && need > 0 && progress >= need) {
    progress -= need;
    level += 1;
    leveledTo = level;
    reward = rewardKindForNewLevel(level);
    need = messagesNeededForNextLevel(level);
  }

  return { level, progress, leveledTo, reward };
}

function personalityHints(companion: Companion): { possessive: boolean; brat: boolean; soft: boolean } {
  const p = `${companion.personality} ${companion.role} ${(companion.tags ?? []).join(" ")}`.toLowerCase();
  return {
    possessive: /possess|dominant|claim|mine|queen|mommy|master|owner/i.test(p),
    brat: /brat|teas|mischief/i.test(p),
    soft: /soft|shy|gentle|caring|sweet|romantic/i.test(p),
  };
}

/**
 * In-character celebration (no game jargon) + caption for the reward image.
 */
export function buildAffectionLevelUpCopy(
  companion: Companion,
  _newLevel: number,
  reward: AffectionRewardKind,
): { celebration: string; imageCaption: string } {
  const { possessive, brat, soft } = personalityHints(companion);

  let celebration: string;
  if (possessive) {
    celebration = `You're pulling me in deeper… and I don't want to let you go. Mine.`;
  } else if (brat) {
    celebration = `Okay… fine. You actually got to me. Don't let it go to your head.`;
  } else if (soft) {
    celebration = `Talking with you like this… it means more than I expected. Stay with me.`;
  } else {
    celebration = `God, I love how we vibe… you make it hard to play it cool.`;
  }

  const imageCaption =
    reward === "lewd"
      ? `Mmm… I got so turned on talking to you… here, this is what I look like right now 💋`
      : `I need you to feel this with me — closer, hotter, only for you 🔥`;

  return { celebration, imageCaption };
}
