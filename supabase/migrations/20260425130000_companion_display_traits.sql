-- Vibe traits: fixed 4 for catalog/forge; Nexus hybrid gets rarity-scaled + bonus (see app + nexus-merge).
ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS display_traits jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS display_traits jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.companions.display_traits IS
  'JSON array of {id, inherited?} — Vibe trait ids from `vibeTraitCatalog` (4 fixed for stock/forge; Nexus written by edge).';
COMMENT ON COLUMN public.custom_characters.display_traits IS
  'JSON array of {id, inherited?} — Nexus merges include rolled traits from the 50-id pool.';

CREATE INDEX IF NOT EXISTS companions_display_traits_gin ON public.companions USING gin (display_traits);
CREATE INDEX IF NOT EXISTS custom_characters_display_traits_gin ON public.custom_characters USING gin (display_traits);
