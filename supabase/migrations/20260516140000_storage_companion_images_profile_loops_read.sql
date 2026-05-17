-- Profile loop MP4s live in companion-images/profile-loops/ — ensure browser can load them on hero + gallery.

UPDATE storage.buckets
SET public = true
WHERE id = 'companion-images';

DROP POLICY IF EXISTS "Anyone can view companion loop videos" ON storage.objects;
CREATE POLICY "Anyone can view companion loop videos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'companion-images'
  AND (storage.foldername(name))[1] = 'profile-loops'
);
