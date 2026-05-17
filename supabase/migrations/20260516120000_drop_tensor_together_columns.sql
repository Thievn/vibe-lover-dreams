-- Retire Tensor.art + Together per-user overrides (Grok-only media stack).
alter table public.profiles
  drop column if exists together_image_model,
  drop column if exists together_video_model;

alter table public.companions
  drop column if exists nude_tensor_render_group;

alter table public.custom_characters
  drop column if exists nude_tensor_render_group;
