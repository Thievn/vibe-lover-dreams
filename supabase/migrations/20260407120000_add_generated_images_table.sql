-- Create generated_images table for storing user-generated images
CREATE TABLE IF NOT EXISTS public.generated_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  companion_id text NOT NULL,
  image_url text NOT NULL,
  prompt text NOT NULL,
  original_prompt text,
  saved_to_companion_gallery boolean DEFAULT false,
  saved_to_personal_gallery boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Legacy / drifted DBs may already have generated_images without full columns; add any missing ones
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS companion_id text;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS prompt text;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS original_prompt text;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS saved_to_companion_gallery boolean DEFAULT false;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS saved_to_personal_gallery boolean DEFAULT false;
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.generated_images ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Enable RLS
ALTER TABLE public.generated_images ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Users can view their own generated images" ON public.generated_images;
CREATE POLICY "Users can view their own generated images"
  ON public.generated_images FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own generated images" ON public.generated_images;
CREATE POLICY "Users can insert their own generated images"
  ON public.generated_images FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own generated images" ON public.generated_images;
CREATE POLICY "Users can update their own generated images"
  ON public.generated_images FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own generated images" ON public.generated_images;
CREATE POLICY "Users can delete their own generated images"
  ON public.generated_images FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_images_user_id ON public.generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_companion_id ON public.generated_images(companion_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_created_at ON public.generated_images(created_at);
