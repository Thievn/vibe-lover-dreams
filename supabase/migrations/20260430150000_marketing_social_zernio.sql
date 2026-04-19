-- Marketing / Zernio: settings singleton + post job queue (admin-only via RLS)

CREATE TABLE IF NOT EXISTS public.marketing_social_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  zernio_twitter_account_id text,
  auto_process_forge_queue boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.marketing_social_settings (id) VALUES (1)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.social_post_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('manual', 'auto_forge')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'posted', 'failed', 'skipped')),
  companion_id text,
  content text,
  media_urls jsonb DEFAULT '[]'::jsonb,
  scheduled_for timestamptz,
  zernio_post_id text,
  error text,
  zernio_response jsonb
);

CREATE INDEX IF NOT EXISTS social_post_jobs_status_idx ON public.social_post_jobs (status, created_at DESC);

ALTER TABLE public.marketing_social_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_post_jobs ENABLE ROW LEVEL SECURITY;

-- Admins (user_roles.role = 'admin') may read/write
CREATE POLICY "marketing_social_settings_admin_all"
  ON public.marketing_social_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "social_post_jobs_admin_all"
  ON public.social_post_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

COMMENT ON TABLE public.marketing_social_settings IS 'Singleton row id=1: Zernio X/Twitter account id and automation toggles.';
COMMENT ON TABLE public.social_post_jobs IS 'Queued social posts for Zernio (manual or auto_forge).';
