CREATE TABLE public.lovense_pairings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  pairing_token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);

ALTER TABLE public.lovense_pairings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own pairings"
  ON public.lovense_pairings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own pairings"
  ON public.lovense_pairings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);