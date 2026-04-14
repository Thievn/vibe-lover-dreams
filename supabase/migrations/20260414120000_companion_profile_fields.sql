-- Companion profile system: rarity, backstory, static vs animated portraits, optional custom border overlay URL

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS backstory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS static_image_url text,
  ADD COLUMN IF NOT EXISTS animated_image_url text,
  ADD COLUMN IF NOT EXISTS rarity_border_overlay_url text;

COMMENT ON COLUMN public.companions.rarity IS 'common | rare | epic | legendary | mythic | abyssal';
COMMENT ON COLUMN public.companions.static_image_url IS 'Still portrait for gallery cards and chat chrome';
COMMENT ON COLUMN public.companions.animated_image_url IS 'Animated portrait (gif/webp/mp4) — profile page only';
COMMENT ON COLUMN public.companions.rarity_border_overlay_url IS 'Optional transparent PNG/SVG frame URL; defaults to app /rarity-borders/{rarity}.svg';

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS rarity text NOT NULL DEFAULT 'common',
  ADD COLUMN IF NOT EXISTS backstory text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS static_image_url text,
  ADD COLUMN IF NOT EXISTS animated_image_url text,
  ADD COLUMN IF NOT EXISTS rarity_border_overlay_url text;
