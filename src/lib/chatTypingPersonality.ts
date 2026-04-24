import type { Companion } from "@/data/companions";

/** Drives typing-dot cadence: slower / heavier for dommy archetypes, snappier for bratty. */
export type ChatTypingVariant = "dominant" | "playful" | "default";

export function getChatTypingVariant(companion: Pick<Companion, "role" | "tags" | "personality">): ChatTypingVariant {
  const tags = (companion.tags ?? []).map((x) => x.toLowerCase());
  const p = (companion.personality ?? "").toLowerCase();
  if (tags.some((x) => x.includes("brat") || x.includes("bratty")) || p.includes("brat")) return "playful";
  if (
    companion.role === "Dominant" ||
    tags.some((x) => x.includes("domme") || x.includes("dominant") || x.includes("daddy") || x.includes("mommy"))
  ) {
    return "dominant";
  }
  return "default";
}
