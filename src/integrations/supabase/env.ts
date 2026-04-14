/**
 * Browser-exposed Supabase configuration (Vite: only `VITE_*` vars are available).
 *
 * Supported keys (in order):
 * - URL: `VITE_SUPABASE_URL`
 * - Anon key: `VITE_SUPABASE_ANON_KEY` (common) or `VITE_SUPABASE_PUBLISHABLE_KEY` (dashboard “publishable” naming)
 */

export function getSupabaseUrl(): string {
  const url = import.meta.env.VITE_SUPABASE_URL;
  return typeof url === "string" ? url.trim() : "";
}

/** Public anon / publishable key for the browser client and Edge Function `apikey` header when needed. */
export function getSupabaseAnonKey(): string {
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const publishable = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const a = typeof anon === "string" ? anon.trim() : "";
  if (a) return a;
  const p = typeof publishable === "string" ? publishable.trim() : "";
  return p;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}

export function assertSupabaseEnv(): void {
  if (import.meta.env.PROD && !isSupabaseConfigured()) {
    console.error(
      "[LustForge] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).",
    );
  }
  if (import.meta.env.DEV && !isSupabaseConfigured()) {
    console.warn(
      "[LustForge] Supabase env not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env",
    );
  }
}
