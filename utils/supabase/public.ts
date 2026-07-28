import { createClient } from "@supabase/supabase-js";

/**
 * Cookie-free anon client for public reads (blog, etc.).
 * Avoids `cookies()` so Next.js can statically cache / revalidate the page.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    }
  );
}
