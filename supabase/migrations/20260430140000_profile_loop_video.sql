-- Looping profile video: gate public profile + X marketing media preference

ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS profile_loop_video_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS profile_loop_video_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companions.profile_loop_video_enabled IS 'When true and animated_image_url is MP4, public profile shows looping video.';
COMMENT ON COLUMN public.custom_characters.profile_loop_video_enabled IS 'When true and animated_image_url is MP4, public profile shows looping video.';

ALTER TABLE public.marketing_social_settings
  ADD COLUMN IF NOT EXISTS use_looping_video_for_x boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.marketing_social_settings.use_looping_video_for_x IS 'Prefer companion looping MP4 over still for Zernio X media when available.';
