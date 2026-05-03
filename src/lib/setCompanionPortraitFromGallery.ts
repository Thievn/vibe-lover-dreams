import { supabase } from "@/integrations/supabase/client";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";

/**
 * Sets the companion still portrait for **this user only** (profile + chat).
 * Never mutates public `companions` / `custom_characters` art used on discover / landing.
 * Clears any private looping portrait on the override row when changing the still.
 */
export async function setCompanionPortraitFromGalleryUrl(args: {
  userId: string;
  companionId: string;
  imageUrl: string;
}): Promise<void> {
  const { userId, companionId, imageUrl } = args;
  const stable = stablePortraitDisplayUrl(imageUrl) ?? imageUrl.trim();

  const { error } = await supabase.from("user_companion_portrait_overrides").upsert(
    {
      user_id: userId,
      companion_id: companionId,
      portrait_url: stable,
      animated_portrait_url: null,
      profile_loop_video_enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,companion_id" },
  );
  if (error) throw error;
}
