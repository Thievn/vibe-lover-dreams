-- Multi-device Lovense registry (per-user). Commands target device_uid from this table.

CREATE TABLE IF NOT EXISTS public.user_lovense_toys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_uid text NOT NULL,
  display_name text NOT NULL,
  toy_type text NOT NULL DEFAULT 'unknown',
  nickname text,
  image_url text,
  capabilities text[] NOT NULL DEFAULT ARRAY['vibrate']::text[],
  enabled boolean NOT NULL DEFAULT true,
  battery int,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_uid)
);

CREATE INDEX IF NOT EXISTS idx_user_lovense_toys_user_id ON public.user_lovense_toys(user_id);

ALTER TABLE public.user_lovense_toys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own toys"
  ON public.user_lovense_toys FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own toys"
  ON public.user_lovense_toys FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own toys"
  ON public.user_lovense_toys FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own toys"
  ON public.user_lovense_toys FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_user_lovense_toys_updated_at
  BEFORE UPDATE ON public.user_lovense_toys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill from legacy single-device column on profiles
INSERT INTO public.user_lovense_toys (user_id, device_uid, display_name, toy_type, capabilities, enabled)
SELECT p.user_id, p.device_uid, 'Connected device', 'unknown', ARRAY['vibrate']::text[], true
FROM public.profiles p
WHERE p.device_uid IS NOT NULL AND trim(p.device_uid) <> ''
ON CONFLICT (user_id, device_uid) DO NOTHING;
