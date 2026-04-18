-- Per-user portrait override for catalog (stock) companions; forged companions use custom_characters URLs.
CREATE TABLE IF NOT EXISTS public.user_companion_portrait_overrides (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  portrait_url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, companion_id)
);

CREATE INDEX IF NOT EXISTS user_companion_portrait_overrides_user_id_idx
  ON public.user_companion_portrait_overrides (user_id);

ALTER TABLE public.user_companion_portrait_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portrait overrides"
  ON public.user_companion_portrait_overrides
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.user_companion_portrait_overrides IS
  'Optional still portrait URL chosen by the user from chat gallery (catalog companions). Forged cc-* uses custom_characters.static_image_url.';
