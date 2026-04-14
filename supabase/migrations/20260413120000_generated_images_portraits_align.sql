-- Align DB with generate-image Edge Function (style, nullable companion_id, companion_portraits table)

ALTER TABLE public.generated_images
  ADD COLUMN IF NOT EXISTS style text;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generated_images'
      AND column_name = 'companion_id'
  ) THEN
    ALTER TABLE public.generated_images
      ALTER COLUMN companion_id DROP NOT NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.companion_portraits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  prompt text NOT NULL,
  style text,
  name text,
  subtitle text,
  is_public boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy / drifted companion_portraits (table exists without full columns)
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS style text;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS subtitle text;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE public.companion_portraits ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

ALTER TABLE public.companion_portraits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view companion_portraits they own or that are public" ON public.companion_portraits;
CREATE POLICY "Users can view companion_portraits they own or that are public"
  ON public.companion_portraits FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR is_public = true);

DROP POLICY IF EXISTS "Users can insert own companion_portraits" ON public.companion_portraits;
CREATE POLICY "Users can insert own companion_portraits"
  ON public.companion_portraits FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own companion_portraits" ON public.companion_portraits;
CREATE POLICY "Users can update own companion_portraits"
  ON public.companion_portraits FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own companion_portraits" ON public.companion_portraits;
CREATE POLICY "Users can delete own companion_portraits"
  ON public.companion_portraits FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_companion_portraits_user_id ON public.companion_portraits(user_id);
CREATE INDEX IF NOT EXISTS idx_companion_portraits_created_at ON public.companion_portraits(created_at DESC);
