-- Backfill: companions with a saved loop MP4 but profile_loop_video_enabled still false never show the hero video.
UPDATE public.companions
SET profile_loop_video_enabled = true
WHERE btrim(coalesce(animated_image_url, '')) <> ''
  AND profile_loop_video_enabled = false
  AND (
    animated_image_url ~* '\.(mp4|webm|mov)(\?|$)'
    OR animated_image_url LIKE '%/profile-loops/%'
  );

UPDATE public.custom_characters
SET profile_loop_video_enabled = true
WHERE btrim(coalesce(animated_image_url, '')) <> ''
  AND profile_loop_video_enabled = false
  AND (
    animated_image_url ~* '\.(mp4|webm|mov)(\?|$)'
    OR animated_image_url LIKE '%/profile-loops/%'
  );

UPDATE public.user_companion_portrait_overrides
SET profile_loop_video_enabled = true
WHERE btrim(coalesce(animated_portrait_url, '')) <> ''
  AND profile_loop_video_enabled = false
  AND (
    animated_portrait_url ~* '\.(mp4|webm|mov)(\?|$)'
    OR animated_portrait_url LIKE '%/profile-loops/%'
  );
