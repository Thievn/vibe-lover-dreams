-- TTS voice preferences + replay URLs for assistant lines

ALTER TABLE public.companion_relationships
  ADD COLUMN IF NOT EXISTS tts_voice_preset TEXT NOT NULL DEFAULT 'velvet_whisper';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tts_voice_global_override TEXT;

ALTER TABLE public.custom_characters
  ADD COLUMN IF NOT EXISTS tts_voice_preset TEXT;

ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS tts_audio_url TEXT;

-- Short-lived TTS clips (public read; uploads via Edge Function service role)
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-tts', 'chat-tts', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can view chat tts audio" ON storage.objects;
CREATE POLICY "Anyone can view chat tts audio"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-tts');
