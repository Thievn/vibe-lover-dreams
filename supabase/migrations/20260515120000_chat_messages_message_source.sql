-- Provenance for shared thread: Classic / in-chat vs full-screen Live Call transcripts.
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS message_source text NOT NULL DEFAULT 'chat';

ALTER TABLE public.chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_source_check;

ALTER TABLE public.chat_messages
  ADD CONSTRAINT chat_messages_message_source_check
  CHECK (message_source IN ('chat', 'live_call'));

COMMENT ON COLUMN public.chat_messages.message_source IS 'chat = classic / in-chat live voice; live_call = full-screen Realtime transcripts (same thread).';
