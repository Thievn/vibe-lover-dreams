-- Client-reported PWA install / prompt telemetry (admin reads; anon + auth may insert own rows).

CREATE TABLE IF NOT EXISTS public.pwa_install_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL CHECK (
    event_type IN (
      'appinstalled',
      'install_prompt_accept',
      'install_prompt_dismiss',
      'install_prompt_shown'
    )
  ),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

ALTER TABLE public.pwa_install_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone may insert pwa install events" ON public.pwa_install_events;
CREATE POLICY "Anyone may insert pwa install events"
  ON public.pwa_install_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    user_id IS NULL OR user_id = auth.uid()
  );

DROP POLICY IF EXISTS "Admins can read pwa install events" ON public.pwa_install_events;
CREATE POLICY "Admins can read pwa install events"
  ON public.pwa_install_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS pwa_install_events_created_at_idx
  ON public.pwa_install_events (created_at DESC);

CREATE INDEX IF NOT EXISTS pwa_install_events_type_idx
  ON public.pwa_install_events (event_type);
