import { writeClientCookie } from "@/lib/auth-cookies";

export type OAuthSignupIntent = {
  role: "dj" | "client";
  artistKind?: "dj" | "band" | "dj_band";
};

export const OAUTH_INTENT_COOKIE = "btv_oauth_intent";

export function parseOAuthIntent(raw: string | undefined | null): OAuthSignupIntent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<OAuthSignupIntent>;
    const role = parsed.role === "client" ? "client" : parsed.role === "dj" ? "dj" : null;
    if (!role) return null;
    const artistKind =
      parsed.artistKind === "band" || parsed.artistKind === "dj_band"
        ? parsed.artistKind
        : "dj";
    return { role, artistKind };
  } catch {
    return null;
  }
}

/** Client-side: persist intent before redirecting to Google. */
export function writeOAuthIntentCookie(intent: OAuthSignupIntent) {
  const value = encodeURIComponent(JSON.stringify(intent));
  writeClientCookie(OAUTH_INTENT_COOKIE, value, 600);
}

export function parseOAuthIntentCookieValue(
  raw: string | undefined | null
): OAuthSignupIntent | null {
  if (!raw) return null;
  try {
    return parseOAuthIntent(decodeURIComponent(raw));
  } catch {
    return parseOAuthIntent(raw);
  }
}

export function clearOAuthIntentCookie() {
  writeClientCookie(OAUTH_INTENT_COOKIE, "", 0);
}
