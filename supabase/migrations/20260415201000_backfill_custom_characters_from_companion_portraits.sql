-- One-time backfill: copy portrait URL from companion_portraits into custom_characters when the forge row
-- never got image_url but a preview exists with the same user_id + character name (latest portrait wins).
-- Safe to re-run: only updates rows where custom_characters.image_url IS NULL.

WITH latest_portrait AS (
  SELECT DISTINCT ON (cp.user_id, lower(trim(cp.name)))
    cp.user_id,
    cp.name AS portrait_name,
    cp.image_url,
    cp.created_at
  FROM public.companion_portraits cp
  WHERE cp.image_url IS NOT NULL
    AND cp.name IS NOT NULL
    AND trim(cp.name) <> ''
  ORDER BY cp.user_id, lower(trim(cp.name)), cp.created_at DESC
)
UPDATE public.custom_characters cc
SET
  image_url = lp.image_url,
  avatar_url = COALESCE(cc.avatar_url, lp.image_url)
FROM latest_portrait lp
WHERE cc.image_url IS NULL
  AND cc.user_id = lp.user_id
  AND lower(trim(cc.name)) = lower(trim(lp.portrait_name));
