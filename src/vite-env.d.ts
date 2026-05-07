/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
  /** Google Analytics 4 measurement ID, e.g. G-JF1831WS0G */
  readonly VITE_GA_MEASUREMENT_ID?: string;
  /** URL-safe VAPID public key (same value as Edge secret VAPID_PUBLIC_KEY) for Web Push subscribe. */
  readonly VITE_VAPID_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
