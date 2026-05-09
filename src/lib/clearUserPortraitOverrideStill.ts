import { supabase } from "@/integrations/supabase/client";

/**
 * Clears only the user-chosen still on `user_companion_portrait_overrides` so profile/chat fall back to the
 * canonical card portrait (`custom_characters` / `companions`). Does not remove a stored looping MP4.
 * @returns whether a row existed and was updated.
 */
export async function clearUserPortraitOverrideStill(userId: string, companionId: string): Promise<boolean> {
  const { data: row, error: selErr } = await supabase
    .from("user_companion_portrait_overrides")
    .select("user_id")
    .eq("user_id", userId)
    .eq("companion_id", companionId)
    .maybeSingle();
  if (selErr) throw selErr;
  if (!row) return false;

  const { error } = await supabase
    .from("user_companion_portrait_overrides")
    .update({
      portrait_url: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("companion_id", companionId);
  if (error) throw error;
  return true;
}
