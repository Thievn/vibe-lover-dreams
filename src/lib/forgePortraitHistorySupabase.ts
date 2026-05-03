import { supabase } from "@/integrations/supabase/client";
import type { ForgePreviewHistoryEntry, ForgeStashPayload } from "@/lib/forgeDraftStash";

function rowToEntry(row: {
  id: string;
  canonical_url: string;
  display_url: string;
  snapshot: unknown;
  created_at: string;
}): ForgePreviewHistoryEntry {
  const snap = row.snapshot && typeof row.snapshot === "object" ? (row.snapshot as Omit<ForgeStashPayload, "previewHistory">) : undefined;
  return {
    id: row.id,
    canonical: row.canonical_url,
    display: row.display_url,
    savedAt: row.created_at,
    snapshot: snap,
  };
}

/** Merge local + remote history by canonical URL; newest `savedAt` wins; cap at 10. */
export function mergeForgePreviewHistory(
  local: ForgePreviewHistoryEntry[],
  remote: ForgePreviewHistoryEntry[],
): ForgePreviewHistoryEntry[] {
  const byCanon = new Map<string, ForgePreviewHistoryEntry>();
  for (const e of [...remote, ...local]) {
    const prev = byCanon.get(e.canonical);
    if (!prev || String(e.savedAt).localeCompare(String(prev.savedAt)) > 0) {
      byCanon.set(e.canonical, e);
    }
  }
  return [...byCanon.values()].sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt))).slice(0, 10);
}

export async function fetchForgePortraitHistoryFromSupabase(
  userId: string,
  forgeMode: "user" | "admin",
): Promise<ForgePreviewHistoryEntry[]> {
  const { data, error } = await supabase
    .from("forge_portrait_history")
    .select("id, canonical_url, display_url, snapshot, created_at")
    .eq("user_id", userId)
    .eq("forge_mode", forgeMode)
    .order("created_at", { ascending: false })
    .limit(10);
  if (error || !data?.length) return [];
  return data.map((row) =>
    rowToEntry({
      id: row.id,
      canonical_url: row.canonical_url,
      display_url: row.display_url,
      snapshot: row.snapshot,
      created_at: row.created_at,
    }),
  );
}

/** Insert one preview row and delete older rows so at most 10 remain for this user + mode. */
export async function recordForgePortraitHistoryToSupabase(args: {
  userId: string;
  forgeMode: "user" | "admin";
  entry: ForgePreviewHistoryEntry;
}): Promise<void> {
  const snap = (args.entry.snapshot ?? {}) as Record<string, unknown>;
  const { error: insErr } = await supabase.from("forge_portrait_history").insert({
    user_id: args.userId,
    forge_mode: args.forgeMode,
    canonical_url: args.entry.canonical,
    display_url: args.entry.display,
    snapshot: snap,
  });
  if (insErr) {
    console.warn("forge_portrait_history insert:", insErr.message);
    return;
  }
  const { data: rows, error: selErr } = await supabase
    .from("forge_portrait_history")
    .select("id")
    .eq("user_id", args.userId)
    .eq("forge_mode", args.forgeMode)
    .order("created_at", { ascending: false });
  if (selErr || !rows || rows.length <= 10) return;
  const excess = rows.slice(10).map((r) => r.id).filter(Boolean);
  if (!excess.length) return;
  const { error: delErr } = await supabase.from("forge_portrait_history").delete().in("id", excess);
  if (delErr) console.warn("forge_portrait_history prune:", delErr.message);
}
