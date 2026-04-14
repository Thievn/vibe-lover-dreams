-- Optional display of creator name on public gallery cards for user-forged companions
ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS gallery_credit_name text;

COMMENT ON COLUMN public.custom_characters.gallery_credit_name IS
  'When set, shown on public gallery (e.g. creator display name). Null means anonymous public listing.';
