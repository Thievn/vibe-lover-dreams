/**
 * Browser-exposed Supabase configuration
 * VITE_* variables only (never commit real keys)
 */

export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return typeof url === "string" ? url.trim() : "";
}

export function getSupabaseAnonKey(): string {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return (typeof anon === "string" ? anon.trim() : "") ||
         (typeof publishable === "string" ? publishable.trim() : "");
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function assertSupabaseEnv(): void {
  if (!isSupabaseConfigured()) {
    const message = import.meta.env.PROD
      ? "[LustForge] Missing Supabase URL or Anon key"
      : "[LustForge] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file";
    console.warn(message);
    return;
  }
  if (import.meta.env.DEV) {
    const raw = import.meta.env as Record<string, string | undefined>;
    const hasUnprefixed =
      (raw.SUPABASE_URL && !raw.VITE_SUPABASE_URL) || (raw.SUPABASE_ANON_KEY && !raw.VITE_SUPABASE_ANON_KEY);
    if (hasUnprefixed) {
      console.warn(
        "[LustForge] Vite only exposes VITE_* variables. Rename SUPABASE_URL / SUPABASE_ANON_KEY in .env to VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY or the browser build will not see them.",
      );
    }
  }
}