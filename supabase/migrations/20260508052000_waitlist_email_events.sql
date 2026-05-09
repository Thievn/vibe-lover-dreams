CREATE TABLE IF NOT EXISTS public.waitlist_email_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  waitlist_email text NOT NULL,
  signup_status text NOT NULL CHECK (signup_status IN ('created', 'duplicate')),
  provider text NOT NULL DEFAULT 'resend',
  admin_delivery_ok boolean NOT NULL DEFAULT false,
  admin_message_id text,
  admin_error text,
  confirmation_delivery_ok boolean NOT NULL DEFAULT false,
  confirmation_message_id text,
  confirmation_error text
);

ALTER TABLE public.waitlist_email_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read waitlist email events" ON public.waitlist_email_events;
CREATE POLICY "Admins can read waitlist email events"
  ON public.waitlist_email_events
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'admin'
    )
  );

CREATE INDEX IF NOT EXISTS waitlist_email_events_created_at_idx
  ON public.waitlist_email_events (created_at DESC);

CREATE INDEX IF NOT EXISTS waitlist_email_events_waitlist_email_idx
  ON public.waitlist_email_events (waitlist_email);
