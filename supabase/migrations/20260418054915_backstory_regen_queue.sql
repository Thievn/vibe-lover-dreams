-- Operator queue: companions with thin backstories pending admin regen (optional tracking).
-- Populate with scripts/thin-backstories/02_queue_for_regen.sql after deploy.
-- Version matches remote (applied via MCP); keep in sync with supabase migration history.

CREATE TABLE IF NOT EXISTS public.backstory_regen_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL CHECK (source_table IN ('custom_characters', 'companions')),
  record_id text NOT NULL,
  name text,
  backstory_chars integer NOT NULL,
  queued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS backstory_regen_queue_unprocessed
  ON public.backstory_regen_queue (queued_at DESC)
  WHERE processed_at IS NULL;

COMMENT ON TABLE public.backstory_regen_queue IS
  'Thin backstory candidates for admin-regenerate backstory; fill via scripts/thin-backstories/02_queue_for_regen.sql';

ALTER TABLE public.backstory_regen_queue ENABLE ROW LEVEL SECURITY;
