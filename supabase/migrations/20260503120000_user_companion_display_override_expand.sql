-- Per-user profile/chat display (still + loop video) without mutating public catalog rows.
ALTER TABLE public.user_companion_portrait_overrides
  ADD COLUMN IF NOT EXISTS animated_portrait_url text,
  ADD COLUMN IF NOT EXISTS profile_loop_video_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_companion_portrait_overrides
  ALTER COLUMN portrait_url DROP NOT NULL;

COMMENT ON COLUMN public.user_companion_portrait_overrides.portrait_url IS
  'User-chosen still portrait (optional when only loop video is stored).';
COMMENT ON COLUMN public.user_companion_portrait_overrides.animated_portrait_url IS
  'User-private looping portrait video URL; not shown on public discover cards.';
COMMENT ON COLUMN public.user_companion_portrait_overrides.profile_loop_video_enabled IS
  'When true and animated_portrait_url set, profile/chat use the private loop for this user.';
