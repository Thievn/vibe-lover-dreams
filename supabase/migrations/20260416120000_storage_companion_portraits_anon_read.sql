-- Ensure portrait bucket is readable for landing / forge previews (public URLs + img tags).
-- Some projects drift to private buckets or restrictive policies; this normalizes access.

UPDATE storage.buckets
SET public = true
WHERE id = 'companion-portraits';

DROP POLICY IF EXISTS "Anyone can view companion portraits" ON storage.objects;
CREATE POLICY "Anyone can view companion portraits"
ON storage.objects
FOR SELECT
USING (bucket_id = 'companion-portraits');
