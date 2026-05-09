-- Discover-listed forge templates share one `custom_characters` row; looping portrait video
-- must live only in `user_companion_portrait_overrides` per user (never on the shared row).

UPDATE public.custom_characters c
SET
  animated_image_url = NULL,
  profile_loop_video_enabled = false,
  updated_at = now()
WHERE
  c.is_public = true
  AND c.approved = true
  AND (
    c.animated_image_url IS NOT NULL
    AND btrim(c.animated_image_url) <> ''
    OR c.profile_loop_video_enabled = true
  );
