/**
 * xAI console API key from Supabase Edge Function secrets.
 * Either name works; same string from https://console.x.ai/
 */
export function resolveXaiApiKey(getEnv: (name: string) => string | undefined): string | null {
  return (
    getEnv("XAI_API_KEY")?.trim() ||
    getEnv("GROK_API_KEY")?.trim() ||
    null
  );
}
