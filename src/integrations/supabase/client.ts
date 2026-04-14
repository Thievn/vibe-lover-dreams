import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { assertSupabaseEnv, getSupabaseAnonKey, getSupabaseUrl } from "./env";

const supabaseUrl = getSupabaseUrl();
const supabaseAnonKey = getSupabaseAnonKey();

assertSupabaseEnv();

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[LustForge] Supabase URL or anon key is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env",
  );
}

// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
