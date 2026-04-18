-- One-time (or repeat): refill the queue from current DB rows with thin backstories.
-- Requires migration: supabase/migrations/20260429130000_backstory_regen_queue.sql (or `supabase db push`).

TRUNCATE public.backstory_regen_queue;

INSERT INTO public.backstory_regen_queue (source_table, record_id, name, backstory_chars)
SELECT
  'custom_characters',
  id::text,
  name,
  length(trim(coalesce(backstory, '')))
FROM public.custom_characters
WHERE length(trim(coalesce(backstory, ''))) < 500;

INSERT INTO public.backstory_regen_queue (source_table, record_id, name, backstory_chars)
SELECT
  'companions',
  id::text,
  name,
  length(trim(coalesce(backstory, '')))
FROM public.companions
WHERE length(trim(coalesce(backstory, ''))) < 500;

SELECT * FROM public.backstory_regen_queue ORDER BY source_table, name;
