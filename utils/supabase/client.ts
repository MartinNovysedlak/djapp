import { createBrowserClient } from "@supabase/ssr";
import { browserAuthCookieOptions } from "@/lib/auth-cookies";

const VERIFIER_BACKUP = "btv_pkce_verifier";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

function readDocumentCookies(): { name: string; value: string }[] {
  if (!document.cookie) return [];
  return document.cookie
    .split(";")
    .map((part) => {
      const idx = part.indexOf("=");
      if (idx === -1) return null;
      const name = part.slice(0, idx).trim();
      const value = decodeURIComponent(part.slice(idx + 1));
      return name ? { name, value } : null;
    })
    .filter((cookie): cookie is { name: string; value: string } => cookie !== null);
}

function writeDocumentCookie(
  name: string,
  value: string,
  options: {
    path?: string;
    maxAge?: number;
    domain?: string;
    secure?: boolean;
    sameSite?: boolean | "lax" | "strict" | "none";
  }
) {
  const sameSite =
    options.sameSite === true || options.sameSite === false || !options.sameSite
      ? "Lax"
      : options.sameSite;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${options.path || "/"}`,
    `SameSite=${sameSite}`,
  ];
  if (typeof options.maxAge === "number") parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.secure) parts.push("Secure");
  document.cookie = parts.join("; ");
}

function readVerifierBackup(): { name: string; value: string } | null {
  try {
    const raw = localStorage.getItem(VERIFIER_BACKUP);
    if (!raw) return null;
    const saved = JSON.parse(raw) as { name?: string; value?: string };
    if (!saved.name || !saved.value) return null;
    return { name: saved.name, value: saved.value };
  } catch {
    return null;
  }
}

/** Singleton browser client. The PKCE verifier is also kept in localStorage so the Google round-trip cannot drop it. */
export function createClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        isSingleton: false,
        cookieOptions: browserAuthCookieOptions(),
        cookies: {
          getAll() {
            const all = readDocumentCookies();
            const backup = readVerifierBackup();
            if (backup && !all.some((cookie) => cookie.name === backup.name)) {
              all.push(backup);
            }
            return all;
          },
          setAll(cookiesToSet) {
            const base = browserAuthCookieOptions();
            for (const cookie of cookiesToSet) {
              writeDocumentCookie(cookie.name, cookie.value, {
                ...base,
                ...cookie.options,
                path: "/",
              });
              if (cookie.name.includes("code-verifier")) {
                if (cookie.value) {
                  localStorage.setItem(
                    VERIFIER_BACKUP,
                    JSON.stringify({ name: cookie.name, value: cookie.value })
                  );
                } else {
                  localStorage.removeItem(VERIFIER_BACKUP);
                }
              }
            }
          },
        },
      }
    );
  }
  return browserClient;
}
