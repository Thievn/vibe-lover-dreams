-- Universal heal: wire complete profile_loop_video_jobs to overrides, private forge rows, and gallery.

WITH latest_jobs AS (
  SELECT DISTINCT ON (user_id, companion_id)
    user_id,
    companion_id,
    public_url,
    created_at
  FROM public.profile_loop_video_jobs
  WHERE status = 'complete'
    AND btrim(coalesce(public_url, '')) <> ''
  ORDER BY user_id, companion_id, created_at DESC
),
cc_enriched AS (
  SELECT
    j.user_id,
    j.companion_id,
    j.public_url,
    c.id AS cc_uuid,
    c.is_public,
    c.approved,
    c.static_image_url,
    c.image_url,
    c.avatar_url
  FROM latest_jobs j
  INNER JOIN public.custom_characters c ON ('cc-' || c.id::text) = j.companion_id
),
portrait_pick AS (
  SELECT
    j.user_id,
    j.companion_id,
    j.public_url,
    coalesce(
      nullif(btrim(ov.portrait_url), ''),
      nullif(btrim(cc.static_image_url), ''),
      nullif(btrim(cc.image_url), ''),
      nullif(btrim(cc.avatar_url), ''),
      nullif(btrim(c.static_image_url), ''),
      nullif(btrim(c.image_url), ''),
      nullif(btrim(c.avatar_url), '')
    ) AS portrait_still
  FROM latest_jobs j
  LEFT JOIN public.custom_characters cc ON ('cc-' || cc.id::text) = j.companion_id
  LEFT JOIN public.companions c ON c.id = j.companion_id
  LEFT JOIN public.user_companion_portrait_overrides ov
    ON ov.user_id = j.user_id AND ov.companion_id = j.companion_id
)
INSERT INTO public.user_companion_portrait_overrides (
  user_id,
  companion_id,
  portrait_url,
  animated_portrait_url,
  profile_loop_video_enabled,
  updated_at
)
SELECT
  p.user_id,
  p.companion_id,
  p.portrait_still,
  p.public_url,
  true,
  now()
FROM portrait_pick p
ON CONFLICT (user_id, companion_id) DO UPDATE SET
  animated_portrait_url = EXCLUDED.animated_portrait_url,
  profile_loop_video_enabled = true,
  portrait_url = coalesce(
    public.user_companion_portrait_overrides.portrait_url,
    EXCLUDED.portrait_url
  ),
  updated_at = now();

-- Private forge rows only (discover-listed templates keep loop on override, not shared row).
UPDATE public.custom_characters c
SET
  animated_image_url = j.public_url,
  profile_loop_video_enabled = true
FROM latest_jobs j
WHERE ('cc-' || c.id::text) = j.companion_id
  AND NOT (coalesce(c.is_public, false) AND coalesce(c.approved, false))
  AND (
    btrim(coalesce(c.animated_image_url, '')) = ''
    OR c.profile_loop_video_enabled = false
    OR c.animated_image_url IS DISTINCT FROM j.public_url
  );

-- Catalog companions (non cc-*).
UPDATE public.companions c
SET
  animated_image_url = j.public_url,
  profile_loop_video_enabled = true
FROM latest_jobs j
WHERE c.id = j.companion_id
  AND j.companion_id NOT LIKE 'cc-%'
  AND (
    btrim(coalesce(c.animated_image_url, '')) = ''
    OR c.profile_loop_video_enabled = false
    OR c.animated_image_url IS DISTINCT FROM j.public_url
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
  'Profile loop video (Grok I2V) · universal backfill',
  true,
  true,
  false
FROM latest_jobs j
WHERE NOT EXISTS (
  SELECT 1
  FROM public.generated_images g
  WHERE g.companion_id = j.companion_id
    AND g.is_video = true
    AND g.image_url = j.public_url
);
