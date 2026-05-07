-- X Marketing Hub: optional discover-style frame baked into media attached to X (Zernio).

ALTER TABLE public.marketing_social_settings
  ADD COLUMN IF NOT EXISTS use_framed_card_for_x_video boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.marketing_social_settings.use_framed_card_for_x_video IS 'When true with looping video preference, Zernio uses a baked framed-card URL; still heroes auto-prepare a framed PNG.';

INSERT INTO storage.buckets (id, name, public)
VALUES ('x-marketing-framed', 'x-marketing-framed', true)
ON CONFLICT (id) DO NOTHING;

UPDATE storage.buckets SET public = true WHERE id = 'x-marketing-framed';

DROP POLICY IF EXISTS "Anyone can view x marketing framed media" ON storage.objects;
CREATE POLICY "Anyone can view x marketing framed media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'x-marketing-framed');

DROP POLICY IF EXISTS "Admins can upload x marketing framed media" ON storage.objects;
CREATE POLICY "Admins can upload x marketing framed media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'x-marketing-framed' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update x marketing framed media" ON storage.objects;
CREATE POLICY "Admins can update x marketing framed media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'x-marketing-framed' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete x marketing framed media" ON storage.objects;
CREATE POLICY "Admins can delete x marketing framed media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'x-marketing-framed' AND public.has_role(auth.uid(), 'admin'));
