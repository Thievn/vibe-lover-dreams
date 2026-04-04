
-- Create companions table
CREATE TABLE public.companions (
  id text PRIMARY KEY,
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  gender text NOT NULL DEFAULT '',
  orientation text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT '',
  tags text[] NOT NULL DEFAULT '{}',
  kinks text[] NOT NULL DEFAULT '{}',
  appearance text NOT NULL DEFAULT '',
  personality text NOT NULL DEFAULT '',
  bio text NOT NULL DEFAULT '',
  system_prompt text NOT NULL DEFAULT '',
  fantasy_starters jsonb NOT NULL DEFAULT '[]',
  gradient_from text NOT NULL DEFAULT '#7B2D8E',
  gradient_to text NOT NULL DEFAULT '#FF2D7B',
  image_url text,
  image_prompt text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.companions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view active companions
CREATE POLICY "Users can view active companions"
ON public.companions
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins have full access to companions"
ON public.companions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Update timestamp trigger
CREATE TRIGGER update_companions_updated_at
BEFORE UPDATE ON public.companions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for companion portraits
INSERT INTO storage.buckets (id, name, public)
VALUES ('companion-portraits', 'companion-portraits', true);

-- Public read access for portraits
CREATE POLICY "Anyone can view companion portraits"
ON storage.objects
FOR SELECT
USING (bucket_id = 'companion-portraits');

-- Admin-only write access for portraits
CREATE POLICY "Admins can upload companion portraits"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'companion-portraits' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update companion portraits"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'companion-portraits' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete companion portraits"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'companion-portraits' AND public.has_role(auth.uid(), 'admin'));
