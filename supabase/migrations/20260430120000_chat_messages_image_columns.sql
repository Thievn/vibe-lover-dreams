-- Persist assistant image lines in chat history (reload / new devices).
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS image_prompt text,
  ADD COLUMN IF NOT EXISTS generated_image_id uuid REFERENCES public.generated_images(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_generated_image_id ON public.chat_messages(generated_image_id)
  WHERE generated_image_id IS NOT NULL;
