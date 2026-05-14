-- Denormalized parent display names for Nexus veilborn — chat lineage without extra lookups.
ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS lineage_parent_names text[];

COMMENT ON COLUMN public.custom_characters.lineage_parent_names IS
  'When is_nexus_hybrid: [first_parent_name, second_parent_name] aligned with lineage_parent_ids order; for immersive chat references.';
