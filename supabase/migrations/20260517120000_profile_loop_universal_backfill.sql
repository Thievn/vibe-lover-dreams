-- Universal heal: wire complete profile_loop_video_jobs to overrides, private forge rows, and gallery.

-- Private forge rows only (not discover-listed templates — shared catalog must not get per-user loops).
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
  AND NOT (c.is_public = true AND c.approved = true)
  AND (
    btrim(coalesce(c.animated_image_url, '')) = ''
    OR c.profile_loop_video_enabled = false
    OR c.animated_image_url IS DISTINCT FROM j.public_url
  );

-- Per-user override + portrait still (all complete jobs with cc-* or catalog companions).
INSERT INTO public.user_companion_portrait_overrides (
  user_id,
  companion_id,
  portrait_url,
  animated_portrait_url,
  profile_loop_video_enabled,
  updated_at
)
SELECT
  j.user_id,
  j.companion_id,
  coalesce(
    nullif(btrim(ov.portrait_url), ''),
    nullif(btrim(c.static_image_url), ''),
    nullif(btrim(c.image_url), ''),
    nullif(btrim(c.avatar_url), ''),
    nullif(btrim(comp.static_image_url), ''),
    nullif(btrim(comp.image_url), '')
  ),
  j.public_url,
  true,
  now()
FROM (
  SELECT DISTINCT ON (user_id, companion_id)
    user_id,
    companion_id,
    public_url
  FROM public.profile_loop_video_jobs
  WHERE status = 'complete'
    AND btrim(coalesce(public_url, '')) <> ''
  ORDER BY user_id, companion_id, created_at DESC
) j
LEFT JOIN public.user_companion_portrait_overrides ov
  ON ov.user_id = j.user_id AND ov.companion_id = j.companion_id
LEFT JOIN public.custom_characters c
  ON j.companion_id LIKE 'cc-%' AND ('cc-' || c.id::text) = j.companion_id
LEFT JOIN public.companions comp
  ON j.companion_id NOT LIKE 'cc-%' AND comp.id::text = j.companion_id
WHERE coalesce(
  nullif(btrim(ov.portrait_url), ''),
  nullif(btrim(c.static_image_url), ''),
  nullif(btrim(c.image_url), ''),
  nullif(btrim(c.avatar_url), ''),
  nullif(btrim(comp.static_image_url), ''),
  nullif(btrim(comp.image_url), '')
) IS NOT NULL
ON CONFLICT (user_id, companion_id) DO UPDATE SET
  animated_portrait_url = EXCLUDED.animated_portrait_url,
  profile_loop_video_enabled = true,
  portrait_url = coalesce(
    nullif(btrim(user_companion_portrait_overrides.portrait_url), ''),
    EXCLUDED.portrait_url
  ),
  updated_at = now();

-- Gallery video rows for companion history.
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
FROM (
  SELECT DISTINCT ON (user_id, companion_id, public_url)
    user_id,
    companion_id,
    public_url
  FROM public.profile_loop_video_jobs
  WHERE status = 'complete'
    AND btrim(coalesce(public_url, '')) <> ''
  ORDER BY user_id, companion_id, public_url, created_at DESC
) j
WHERE NOT EXISTS (
  SELECT 1
  FROM public.generated_images g
  WHERE g.companion_id = j.companion_id
    AND g.is_video = true
    AND g.image_url = j.public_url
);
