import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminHardDeleteTarget =
  | { kind: "forge"; uuid: string; publicId: string }
  | { kind: "stock"; catalogId: string };

/**
 * Admin-only: remove a companion id and dependent rows. `publicId` is what the app stores in
 * `chat_messages.companion_id` / `generated_images.companion_id` (`cc-{uuid}` for forge, catalog id for stock).
 */
export async function adminHardDeleteCompanion(
  supabase: SupabaseClient,
  target: AdminHardDeleteTarget,
  opts?: { forgePortraitCleanup?: { userId: string; portraitName: string } },
): Promise<{ ok: true } | { ok: false; message: string }> {
  const publicId = target.kind === "forge" ? target.publicId : target.catalogId;

  const satelliteTables = [
    "chat_messages",
    "generated_images",
    "companion_gifts",
    "companion_relationships",
    "companion_vibration_patterns",
    "companion_discovery_votes",
    "user_discover_pins",
    "user_companion_portrait_overrides",
  ] as const;

  for (const table of satelliteTables) {
    const { error } = await supabase.from(table).delete().eq("companion_id", publicId);
    if (error) return { ok: false, message: `${table}: ${error.message}` };
  }

  const { error: jobsErr } = await supabase.from("social_post_jobs").delete().eq("companion_id", publicId);
  if (jobsErr) return { ok: false, message: `social_post_jobs: ${jobsErr.message}` };

  const sourceTable = target.kind === "forge" ? "custom_characters" : "companions";
  const recordId = target.kind === "forge" ? target.uuid : target.catalogId;
  const { error: regenErr } = await supabase
    .from("backstory_regen_queue")
    .delete()
    .eq("source_table", sourceTable)
    .eq("record_id", recordId);
  if (regenErr) return { ok: false, message: `backstory_regen_queue: ${regenErr.message}` };

  const wd = await supabase.from("weekly_drop_posts").delete().eq("companion_id", publicId);
  if (wd.error && !/relation|does not exist|Could not find/i.test(wd.error.message)) {
    return { ok: false, message: `weekly_drop_posts: ${wd.error.message}` };
  }

  if (opts?.forgePortraitCleanup) {
    const { userId, portraitName } = opts.forgePortraitCleanup;
    const pn = portraitName.trim();
    if (pn) {
      const cp = await supabase.from("companion_portraits").delete().eq("user_id", userId).eq("name", pn);
      if (cp.error && !/relation|does not exist/i.test(cp.error.message)) {
        return { ok: false, message: `companion_portraits: ${cp.error.message}` };
      }
    }
  }

  if (target.kind === "forge") {
    const { error } = await supabase.from("custom_characters").delete().eq("id", target.uuid);
    if (error) return { ok: false, message: `custom_characters: ${error.message}` };
  } else {
    const { error } = await supabase.from("companions").delete().eq("id", target.catalogId);
    if (error) return { ok: false, message: `companions: ${error.message}` };
  }

  return { ok: true };
}
