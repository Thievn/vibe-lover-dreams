-- Per-user Together.ai model overrides (image now; video reserved for future I2V on Together).
alter table public.profiles
  add column if not exists together_image_model text,
  add column if not exists together_video_model text;

comment on column public.profiles.together_image_model is
  'Optional Together.ai image model slug (e.g. black-forest-labs/FLUX.2-dev). Empty = use Edge secret TOGETHER_IMAGE_MODEL or code default.';

comment on column public.profiles.together_video_model is
  'Optional Together.ai video model slug for future use. Empty = use Edge secret TOGETHER_VIDEO_MODEL when wired.';
