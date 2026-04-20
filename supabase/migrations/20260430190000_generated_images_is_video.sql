-- Distinguish companion gallery rows that store MP4 URLs (chat clips) from still images.
ALTER TABLE public.generated_images
  ADD COLUMN IF NOT EXISTS is_video boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.generated_images.is_video IS 'True when image_url points to a generated video (e.g. chat clip MP4).';
