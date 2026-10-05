export const OAUTH_NEXT_COOKIE = "btv_oauth_next";

export type AuthCookieOptions = {
  domain?: string;
  path: string;
  sameSite: "lax";
  secure?: boolean;
};

function isBrandHost(host: string): boolean {
  const name = host.split(":")[0].trim().toLowerCase();
  return name === "bookthevibe.com" || name.endsWith(".bookthevibe.com");
}

/** Shared parent domain so www and apex see the same PKCE and session cookies. */
export function serverAuthCookieOptions(
  host: string | null | undefined
): AuthCookieOptions {
  const raw = (host || "").split(",")[0].trim();
  if (isBrandHost(raw)) {
    return {
      domain: ".bookthevibe.com",
      path: "/",
      sameSite: "lax",
      secure: true,
    };
  }
  return { path: "/", sameSite: "lax" };
}

export function browserAuthCookieOptions(): AuthCookieOptions {
  if (typeof window === "undefined") return { path: "/", sameSite: "lax" };
  return serverAuthCookieOptions(window.location.hostname);
}

export function writeClientCookie(name: string, value: string, maxAge: number) {
  if (typeof document === "undefined") return;
  const options = browserAuthCookieOptions();
  const parts = [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    "SameSite=Lax",
  ];
  if (options.domain) parts.push(`Domain=${options.domain}`);
  if (options.secure || window.location.protocol === "https:") parts.push("Secure");
  document.cookie = parts.join("; ");
}

export function writeOAuthNextCookie(next: string) {
  if (!next.startsWith("/") || next.startsWith("//")) return;
  writeClientCookie(OAUTH_NEXT_COOKIE, encodeURIComponent(next), 600);
}

export function clearOAuthNextCookie() {
  writeClientCookie(OAUTH_NEXT_COOKIE, "", 0);
}

export function readOAuthNext(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    value = raw;
  }
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
