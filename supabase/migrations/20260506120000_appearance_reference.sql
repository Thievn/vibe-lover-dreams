-- Core physical appearance (face, hair, body, species) without outfit/scene — drives chat selfie/lewd consistency.
ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS appearance_reference text;

COMMENT ON COLUMN public.custom_characters.appearance_reference IS
  'Vision- or LLM-derived core appearance only (no outfit/pose/background). Used as primary likeness anchor for in-chat stills.';

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS appearance_reference text;

COMMENT ON COLUMN public.companions.appearance_reference IS
  'Same as custom_characters.appearance_reference for catalog stock rows.';
