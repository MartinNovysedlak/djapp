import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * SSR-aware Supabase client for Server Actions / Route Handlers — reads the
 * caller's auth session from cookies, so queries run with their real
 * `auth.uid()` and are correctly scoped by Row Level Security (no service
 * role needed for user-owned reads/writes).
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render — safe to ignore since
            // middleware (or the client) already refreshes the session.
          }
        },
      },
    }
  );
}
