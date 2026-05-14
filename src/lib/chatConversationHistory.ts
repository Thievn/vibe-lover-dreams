import { supabase } from "@/integrations/supabase/client";

/** Rows loaded into chat UI (matches server grok-chat window scale). */
export const CHAT_SHARED_HISTORY_UI_LIMIT = 100;

export type SharedChatTurn = { role: "user" | "assistant"; content: string };

/**
 * Recent messages for `(userId, companionId)` — single thread for Classic, in-chat Live Voice, and Live Call.
 */
export async function fetchRecentChatMessages(
  userId: string,
  companionId: string,
  limit = CHAT_SHARED_HISTORY_UI_LIMIT,
): Promise<SharedChatTurn[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("role, content")
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error || !data?.length) return [];

  return data
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: String(m.content ?? "").trim(),
    }))
    .filter((m) => m.content.length > 0);
}

const LIVE_CALL_MEMORY_MAX_CHARS = 14_000;
const LIVE_CALL_MEMORY_PER_LINE = 1_800;

/**
 * Compact transcript block for xAI Realtime instructions (bounded size).
 */
export function formatRecentDialogueForLiveCallInstructions(turns: SharedChatTurn[]): string {
  if (!turns.length) return "";

  const lines: string[] = [];
  let total = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    const t = turns[i]!;
    const label = t.role === "user" ? "User" : "Companion";
    let body = t.content.replace(/\s+/g, " ").trim();
    if (body.length > LIVE_CALL_MEMORY_PER_LINE) {
      body = `${body.slice(0, LIVE_CALL_MEMORY_PER_LINE - 1)}…`;
    }
    const line = `${label}: ${body}`;
    if (total + line.length + 1 > LIVE_CALL_MEMORY_MAX_CHARS) break;
    lines.push(line);
    total += line.length + 1;
  }
  if (!lines.length) return "";
  lines.reverse();
  return lines.join("\n");
}

const TOY_UI_ONLY_LINE = /^<toy_ui\b[\s\S]*\/>\s*$/i;

/** Persist a Live Call transcript line into the same `chat_messages` thread as Classic / in-chat Live Voice. */
export async function persistLiveCallChatMessage(args: {
  userId: string;
  companionId: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void> {
  const trimmed = args.content.trim();
  if (!trimmed) return;
  if (args.role === "user" && TOY_UI_ONLY_LINE.test(trimmed)) return;

  const { error } = await supabase.from("chat_messages").insert({
    user_id: args.userId,
    companion_id: args.companionId,
    role: args.role,
    content: trimmed,
    message_source: "live_call",
  });
  if (error) {
    console.warn("[persistLiveCallChatMessage]", error.message);
  }
}
