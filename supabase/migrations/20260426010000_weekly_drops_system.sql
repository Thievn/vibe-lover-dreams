-- Weekly drops: scheduling metadata + per-drop analytics/click attribution

ALTER TABLE public.marketing_social_settings
  ADD COLUMN IF NOT EXISTS weekly_drop_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS weekly_drops_per_week integer NOT NULL DEFAULT 2 CHECK (weekly_drops_per_week BETWEEN 1 AND 14),
  ADD COLUMN IF NOT EXISTS weekly_drop_interval_days integer NOT NULL DEFAULT 3 CHECK (weekly_drop_interval_days BETWEEN 1 AND 30),
  ADD COLUMN IF NOT EXISTS weekly_drop_source_mode text NOT NULL DEFAULT 'mixed' CHECK (weekly_drop_source_mode IN ('mixed', 'catalog_only', 'forge_only')),
  ADD COLUMN IF NOT EXISTS weekly_drop_last_run_at timestamptz;

CREATE TABLE IF NOT EXISTS public.weekly_drop_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  companion_id text NOT NULL,
  companion_name text NOT NULL,
  rarity text,
  landing_url text NOT NULL,
  x_post_url text,
  posted_at timestamptz NOT NULL DEFAULT now(),
  social_post_job_id uuid REFERENCES public.social_post_jobs (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS weekly_drop_posts_posted_at_idx
  ON public.weekly_drop_posts (posted_at DESC);

CREATE INDEX IF NOT EXISTS weekly_drop_posts_companion_idx
  ON public.weekly_drop_posts (companion_id, posted_at DESC);

CREATE TABLE IF NOT EXISTS public.weekly_drop_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  weekly_drop_post_id uuid NOT NULL REFERENCES public.weekly_drop_posts (id) ON DELETE CASCADE,
  user_agent text,
  referer text,
  ip_hash text
);

CREATE INDEX IF NOT EXISTS weekly_drop_clicks_post_idx
  ON public.weekly_drop_clicks (weekly_drop_post_id, created_at DESC);

ALTER TABLE public.weekly_drop_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_drop_clicks ENABLE ROW LEVEL SECURITY;

-- Admins may read/write weekly drops and click events.
CREATE POLICY "weekly_drop_posts_admin_all"
  ON public.weekly_drop_posts
  FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

CREATE POLICY "weekly_drop_clicks_admin_read"
  ON public.weekly_drop_clicks
  FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Public insert for anonymous click attribution via edge function/client.
CREATE POLICY "weekly_drop_clicks_public_insert"
  ON public.weekly_drop_clicks
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (weekly_drop_post_id IS NOT NULL);

COMMENT ON TABLE public.weekly_drop_posts IS 'Published weekly companion drops posted to X; one row per posted drop.';
COMMENT ON TABLE public.weekly_drop_clicks IS 'Attributed landing-click events from X links for weekly drops.';

CREATE OR REPLACE FUNCTION public.get_weekly_drop_stats()
RETURNS TABLE (
  id uuid,
  posted_at timestamptz,
  companion_id text,
  companion_name text,
  rarity text,
  landing_url text,
  x_post_url text,
  total_clicks bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.posted_at,
    p.companion_id,
    p.companion_name,
    p.rarity,
    p.landing_url,
    p.x_post_url,
    COUNT(c.id)::bigint AS total_clicks
  FROM public.weekly_drop_posts p
  LEFT JOIN public.weekly_drop_clicks c
    ON c.weekly_drop_post_id = p.id
  GROUP BY p.id
  ORDER BY p.posted_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_drop_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_drop_stats() TO authenticated;
