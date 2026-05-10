-- Align catalog `companions` with forge: optional anatomy tag for prompts (nullable for all stock rows).

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS identity_anatomy_detail text NULL;

ALTER TABLE public.companions
  DROP CONSTRAINT IF EXISTS companions_identity_anatomy_detail_check;

ALTER TABLE public.companions
  ADD CONSTRAINT companions_identity_anatomy_detail_check
  CHECK (identity_anatomy_detail IS NULL OR identity_anatomy_detail IN ('pre_op', 'post_op', 'futa'));

COMMENT ON COLUMN public.companions.identity_anatomy_detail IS
  'Optional: pre_op, post_op, or futa — combined with gender for prompts and portrait consistency (catalog).';
