ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS video_url text;
