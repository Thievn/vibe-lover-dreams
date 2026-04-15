-- Multi-select forge metadata: personality archetypes (1–3) and vibe/theme picks (up to 3)
ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS personality_archetypes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS vibe_theme_selections text[] NOT NULL DEFAULT '{}';
