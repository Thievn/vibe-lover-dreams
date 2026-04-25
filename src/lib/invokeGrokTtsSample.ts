import { supabase } from "@/integrations/supabase/client";
import { uxVoiceToXaiVoice, type TtsUxVoiceId } from "@/lib/ttsVoicePresets";
import { messageFromFunctionsInvoke } from "@/lib/supabaseFunctionsError";

/** Short line so previews stay fast and cheap. */
export const LIVE_CALL_TTS_SAMPLE_TEXT =
  "Hey — it's me. Just a quick hi so you can hear how I sound.";

/**
 * Requests a one-off MP3 via `grok-tts` (same stack as chat TTS) for voice previews.
 * Returns a public URL suitable for `new Audio(url).play()`.
 */
export async function fetchTtsSampleAudioUrl(uxVoice: TtsUxVoiceId): Promise<string> {
  const voiceId = uxVoiceToXaiVoice(uxVoice);
  const { data, error } = await supabase.functions.invoke("grok-tts", {
    body: {
      text: LIVE_CALL_TTS_SAMPLE_TEXT,
      voiceId,
    },
  });
  if (error) {
    throw new Error(await messageFromFunctionsInvoke(error, data));
  }
  const url =
    data && typeof data === "object" && typeof (data as { audioUrl?: unknown }).audioUrl === "string"
      ? (data as { audioUrl: string }).audioUrl.trim()
      : "";
  if (!url) throw new Error("No audio URL from TTS");
  return url;
}
