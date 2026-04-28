import { formatDistanceToNow } from "date-fns";
import type { CompanionRelationship } from "@/hooks/useCompanionRelationship";
import { CHAT_AFFECTION_MAX_TIER, messagesNeededForNextLevel } from "@/lib/chatAffection";

export interface DashboardInsights {
  toySyncCount: number;
  chatMessageCount: number;
  relationships: CompanionRelationship[];
  transactions: {
    id: string;
    credits_change: number;
    transaction_type: string;
    description: string;
    created_at: string;
  }[];
}

/** Smooth 0–100 progress across tiers 1→5 using tier + progress within tier. */
export function affectionOverallPct(rel: Pick<CompanionRelationship, "chat_affection_level" | "chat_affection_progress">): number {
  const level = Math.min(CHAT_AFFECTION_MAX_TIER, Math.max(1, rel.chat_affection_level ?? 1));
  if (level >= CHAT_AFFECTION_MAX_TIER) return 100;
  const need = messagesNeededForNextLevel(level);
  const prog = Math.max(0, rel.chat_affection_progress ?? 0);
  const max = Math.max(1, need);
  const segmentPct = Math.min(100, Math.round((prog / max) * 100));
  const tierSpan = (level - 1) / (CHAT_AFFECTION_MAX_TIER - 1);
  const segmentWeight = (1 / (CHAT_AFFECTION_MAX_TIER - 1)) * (segmentPct / 100);
  return Math.min(100, Math.round((tierSpan + segmentWeight) * 100));
}

const BOND_LABELS = ["", "Curious", "Growing", "Devoted", "Obsessed", "Soulbound"] as const;

export function chatBondLabel(level: number | undefined): string {
  const lv = Math.min(CHAT_AFFECTION_MAX_TIER, Math.max(1, level ?? 1));
  return BOND_LABELS[lv] ?? "Curious";
}

export function activityRelativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return "";
  }
}

export type ActivityTone = "pink" | "teal" | "purple";

export interface DashboardActivityRow {
  t: string;
  msg: string;
  tone: ActivityTone;
}

/** Recent feed: real Forge Coin ledger lines + last-chat hints from bonds (no fake promos). */
export function buildDashboardActivity(
  insights: Pick<DashboardInsights, "transactions" | "relationships">,
  companionNameById: Map<string, string>,
): DashboardActivityRow[] {
  const rows: DashboardActivityRow[] = [];
  const usedChatCompanions = new Set<string>();

  for (const tx of insights.transactions) {
    const delta = tx.credits_change;
    const desc = tx.description?.trim();
    if (delta === 0 && !desc) continue;
    const t = activityRelativeTime(tx.created_at);
    if (!t) continue;
    if (delta > 0) {
      rows.push({
        t,
        msg: desc || `Forge Coins +${delta}`,
        tone: "pink",
      });
    } else if (delta < 0) {
      rows.push({
        t,
        msg: desc || `Forge Coins used (${delta})`,
        tone: "purple",
      });
    } else if (desc) {
      rows.push({ t, msg: desc, tone: "teal" });
    }
  }

  for (const rel of insights.relationships) {
    if (rows.length >= 8) break;
    const name = companionNameById.get(rel.companion_id);
    if (!name || usedChatCompanions.has(rel.companion_id)) continue;
    usedChatCompanions.add(rel.companion_id);
    const t = activityRelativeTime(rel.last_interaction);
    if (!t) continue;
    rows.push({
      t,
      msg: `Last chat with ${name}`,
      tone: "teal",
    });
  }

  return rows.slice(0, 8);
}
