-- Heal Nexus hybrids (and other cc-*) with complete loop jobs but missing row/gallery wiring.

UPDATE public.custom_characters c
SET
  animated_image_url = j.public_url,
  profile_loop_video_enabled = true
FROM (
  SELECT DISTINCT ON (companion_id)
    companion_id,
    public_url
  FROM public.profile_loop_video_jobs
  WHERE status = 'complete'
    AND btrim(coalesce(public_url, '')) <> ''
    AND companion_id LIKE 'cc-%'
  ORDER BY companion_id, created_at DESC
) j
WHERE ('cc-' || c.id::text) = j.companion_id
  AND c.is_nexus_hybrid = true
  AND (
    btrim(coalesce(c.animated_image_url, '')) = ''
    OR c.profile_loop_video_enabled = false
  );

INSERT INTO public.generated_images (
  user_id,
  companion_id,
  image_url,
  prompt,
  is_video,
  saved_to_companion_gallery,
  saved_to_personal_gallery
)
SELECT
  j.user_id,
  j.companion_id,
  j.public_url,
  'Profile loop video (Grok I2V) · backfill',
  true,
  true,
  false
FROM public.profile_loop_video_jobs j
INNER JOIN public.custom_characters c ON ('cc-' || c.id::text) = j.companion_id
WHERE j.status = 'complete'
  AND c.is_nexus_hybrid = true
  AND btrim(coalesce(j.public_url, '')) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.generated_images g
    WHERE g.companion_id = j.companion_id
      AND g.is_video = true
      AND g.image_url = j.public_url
  );
