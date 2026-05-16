-- Async xAI I2V for profile loop videos: Edge cannot block for minutes inside one invocation
-- (Supabase wall clock ~150s free / ~400s paid) or the worker is killed with "compute resources" errors.

CREATE TABLE IF NOT EXISTS public.profile_loop_video_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  xai_request_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'finalizing', 'complete', 'failed')),
  charge_fc integer NOT NULL DEFAULT 0,
  refunded boolean NOT NULL DEFAULT false,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  xai_video_url text,
  duration_seconds integer,
  public_url text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_loop_video_jobs_user_created_idx
  ON public.profile_loop_video_jobs (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS profile_loop_video_jobs_status_created_idx
  ON public.profile_loop_video_jobs (status, created_at DESC);

COMMENT ON TABLE public.profile_loop_video_jobs IS
  'Tracks Grok Imagine I2V request_id for profile loops; client polls until status=complete.';

ALTER TABLE public.profile_loop_video_jobs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.profile_loop_video_jobs FROM anon;
REVOKE ALL ON TABLE public.profile_loop_video_jobs FROM authenticated;
GRANT ALL ON TABLE public.profile_loop_video_jobs TO service_role;
