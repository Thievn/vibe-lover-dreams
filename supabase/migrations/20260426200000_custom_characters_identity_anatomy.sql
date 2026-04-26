-- Optional anatomy presentation tag for forged companions (pre_op / post_op / futa).
-- Combined with `gender` for prompts, chat, and image consistency.

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS identity_anatomy_detail text NULL;

ALTER TABLE public.custom_characters
  DROP CONSTRAINT IF EXISTS custom_characters_identity_anatomy_detail_check;

ALTER TABLE public.custom_characters
  ADD CONSTRAINT custom_characters_identity_anatomy_detail_check
  CHECK (identity_anatomy_detail IS NULL OR identity_anatomy_detail IN ('pre_op', 'post_op', 'futa'));

COMMENT ON COLUMN public.custom_characters.identity_anatomy_detail IS
  'Optional: pre_op, post_op, or futa — combined with gender for in-character and portrait consistency.';
