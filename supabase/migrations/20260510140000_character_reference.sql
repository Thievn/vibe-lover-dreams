-- Dense physical-only bible for Imagine (face, hair, eyes, skin, body, marks) — no outfit/pose/background.
-- Populated by vision backfill, forge bind, and admin portrait regen; falls back to appearance_reference in prompts when empty.

alter table public.companions
  add column if not exists character_reference text;

alter table public.custom_characters
  add column if not exists character_reference text;

comment on column public.companions.character_reference is
  'Physical appearance lock only (no clothing, pose, or environment). Primary anchor for dilute selfie / chat Imagine when set.';

comment on column public.custom_characters.character_reference is
  'Physical appearance lock only (no clothing, pose, or environment). Primary anchor for chat Imagine when set.';
