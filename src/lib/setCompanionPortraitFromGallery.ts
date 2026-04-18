import { supabase } from "@/integrations/supabase/client";
import { stablePortraitDisplayUrl } from "@/lib/companionMedia";

/**
 * Sets the companion's still portrait used in chat header and profile.
 * For forged companions (`cc-*`), updates `custom_characters`. For catalog stock IDs, uses per-user override row.
 */
export async function setCompanionPortraitFromGalleryUrl(args: {
  userId: string;
  companionId: string;
  imageUrl: string;
}): Promise<void> {
  const { userId, companionId, imageUrl } = args;
  const stable = stablePortraitDisplayUrl(imageUrl) ?? imageUrl.trim();

  if (companionId.startsWith("cc-")) {
    const uuid = companionId.slice(3);
    const { error } = await supabase
      .from("custom_characters")
      .update({
        static_image_url: stable,
        image_url: stable,
        avatar_url: stable,
        animated_image_url: null,
      })
      .eq("id", uuid)
      .eq("user_id", userId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("user_companion_portrait_overrides").upsert(
    {
      user_id: userId,
      companion_id: companionId,
      portrait_url: stable,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,companion_id" },
  );
  if (error) throw error;
}
