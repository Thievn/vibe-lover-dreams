-- Optional still used only for Discover grid / marketing tiles (admin-controlled).
-- When null, UI falls back to static_image_url / image_url as today.

alter table public.custom_characters
  add column if not exists discover_tile_image_url text;

alter table public.companions
  add column if not exists discover_tile_image_url text;

comment on column public.custom_characters.discover_tile_image_url is
  'Optional HTTPS still for Discover; does not replace in-app portrait unless also set in image_url/static.';

comment on column public.companions.discover_tile_image_url is
  'Optional HTTPS still for Discover listing; falls back to static_image_url / image_url when null.';
