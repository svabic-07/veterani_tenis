import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Javni Supabase klijent bez sesije/cookie-ja — za javne read-only podatke
 * na stranicama koje mogu da se keširaju (ISR). Ne koristi cookies() pa ne
 * forsira dinamički render.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
