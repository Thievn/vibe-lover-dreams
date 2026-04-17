-- The Nexus: premium companion merge (lineage, merge stats, parent cooldown)

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS nexus_cooldown_until timestamptz,
  ADD COLUMN IF NOT EXISTS lineage_parent_ids uuid[],
  ADD COLUMN IF NOT EXISTS merge_stats jsonb,
  ADD COLUMN IF NOT EXISTS is_nexus_hybrid boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.custom_characters.nexus_cooldown_until IS 'After a merge, both parents cannot merge again until this instant.';
COMMENT ON COLUMN public.custom_characters.lineage_parent_ids IS 'Up to two custom_characters.id UUIDs (parents) when born from The Nexus.';
COMMENT ON COLUMN public.custom_characters.merge_stats IS 'Nexus signature metrics: compatibility, resonance, pulse, affinity (0-100).';
COMMENT ON COLUMN public.custom_characters.is_nexus_hybrid IS 'True when this row was created by The Nexus merge.';
