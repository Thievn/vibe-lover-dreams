/**
 * Six UX-facing voice presets map to xAI’s five backend `voice_id` values
 * (`ara` | `eve` | `rex` | `sal` | `leo`). Two presets may share one id with different labels.
 *
 * | UX id            | xAI voice_id | Notes              |
 * |------------------|--------------|--------------------|
 * | velvet_whisper   | eve          | Soft default       |
 * | siren            | ara          | Brighter           |
 * | obsidian         | sal          | Deeper             |
 * | gravel           | rex          | Raspy edge         |
 * | midnight         | leo          | Warm low           |
 * | eclipse          | eve          | Shares id w/ velvet|
 */
export const TTS_UX_VOICE_IDS = [
  "velvet_whisper",
  "siren",
  "obsidian",
  "gravel",
  "midnight",
  "eclipse",
] as const;

export type TtsUxVoiceId = (typeof TTS_UX_VOICE_IDS)[number];

export type XaiVoiceId = "ara" | "eve" | "rex" | "sal" | "leo";

const UX_TO_XAI: Record<TtsUxVoiceId, XaiVoiceId> = {
  velvet_whisper: "eve",
  siren: "ara",
  obsidian: "sal",
  gravel: "rex",
  midnight: "leo",
  eclipse: "eve",
};

export const TTS_UX_LABELS: Record<TtsUxVoiceId, string> = {
  velvet_whisper: "Velvet Whisper",
  siren: "Siren",
  obsidian: "Obsidian",
  gravel: "Gravel",
  midnight: "Midnight",
  eclipse: "Eclipse",
};

export function resolveUxVoiceId(raw: string | null | undefined): TtsUxVoiceId {
  const v = String(raw || "").trim() as TtsUxVoiceId;
  if (TTS_UX_VOICE_IDS.includes(v)) return v;
  return "velvet_whisper";
}

export function uxVoiceToXaiVoice(ux: TtsUxVoiceId): XaiVoiceId {
  return UX_TO_XAI[ux];
}
