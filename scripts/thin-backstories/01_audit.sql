-- One-time audit: rows whose saved chronicle is likely a stub (same threshold as forge auto-expand: 500 chars).
-- Run in Supabase SQL Editor (read-only).

-- Forged / vault characters (UUID id; app prefixes with cc-)
SELECT
  'custom_characters' AS source,
  id::text AS raw_id,
  ('cc-' || id::text) AS app_companion_id,
  name,
  length(trim(coalesce(backstory, ''))) AS backstory_chars,
  left(trim(coalesce(backstory, '')), 120) AS backstory_preview
FROM public.custom_characters
WHERE length(trim(coalesce(backstory, ''))) < 500
ORDER BY updated_at DESC NULLS LAST, created_at DESC;

-- Stock roster rows (slug id e.g. lilith-vesper)
SELECT
  'companions' AS source,
  id::text AS raw_id,
  id::text AS app_companion_id,
  name,
  length(trim(coalesce(backstory, ''))) AS backstory_chars,
  left(trim(coalesce(backstory, '')), 120) AS backstory_preview
FROM public.companions
WHERE length(trim(coalesce(backstory, ''))) < 500
ORDER BY name;
