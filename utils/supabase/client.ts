import { createBrowserClient } from "@supabase/ssr";
import { browserAuthCookieOptions } from "@/lib/auth-cookies";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

/** Singleton browser client — avoids re-creating GoTrue on every call. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookieOptions: browserAuthCookieOptions() }
    );
  }
  return browserClient;
}
