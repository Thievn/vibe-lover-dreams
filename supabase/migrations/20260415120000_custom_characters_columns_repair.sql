-- Repair drift: some hosted DBs skipped earlier migrations or were created before companion fields existed.
-- App expects `appearance` (not appearance_description). Idempotent — safe to re-run.

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS tagline text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS gender text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS orientation text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS kinks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS appearance text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS bio text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS system_prompt text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS fantasy_starters jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS gradient_from text NOT NULL DEFAULT '#7B2D8E',
  ADD COLUMN IF NOT EXISTS gradient_to text NOT NULL DEFAULT '#FF2D7B',
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_prompt text,
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS backstory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS static_image_url text,
  ADD COLUMN IF NOT EXISTS animated_image_url text,
  ADD COLUMN IF NOT EXISTS rarity_border_overlay_url text,
  ADD COLUMN IF NOT EXISTS gallery_credit_name text;
