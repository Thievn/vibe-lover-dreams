-- Cached art-style bucket for Tensor.art nude (image) + nude I2V: realistic vs anime/stylized.
-- Set on first nude request when absent (text heuristics, else vision, else default realistic).
ALTER TABLE public.companions
  ADD COLUMN IF NOT EXISTS nude_tensor_render_group text
  CHECK (nude_tensor_render_group IS NULL OR nude_tensor_render_group IN ('realistic', 'stylized'));

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS nude_tensor_render_group text
  CHECK (nude_tensor_render_group IS NULL OR nude_tensor_render_group IN ('realistic', 'stylized'));

COMMENT ON COLUMN public.companions.nude_tensor_render_group IS
  'LustForge: which Tensor.art model family to use for nude stills/videos (realistic vs stylized), cached to avoid re-classification.';
COMMENT ON COLUMN public.custom_characters.nude_tensor_render_group IS
  'LustForge: which Tensor.art model family to use for nude stills/videos (realistic vs stylized), cached.';
