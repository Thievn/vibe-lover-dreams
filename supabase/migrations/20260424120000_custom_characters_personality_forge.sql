-- Structured forge personality matrix (Personalities section in Companion Creator).
alter table public.custom_characters
  add column if not exists personality_forge jsonb not null default '{}';
