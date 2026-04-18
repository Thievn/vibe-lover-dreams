export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  lovenseCommand?: unknown;
  timestamp: Date;
  imageUrl?: string;
  imageId?: string;
  imagePrompt?: string;
  generatedImageId?: string;
  savedToCompanionGallery?: boolean;
  savedToPersonalGallery?: boolean;
  /** Persisted replay URL from Grok TTS (assistant text lines). */
  tts_audio_url?: string | null;
}
