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
  if (typeof document === "undefined") return;
  const value = encodeURIComponent(JSON.stringify(intent));
  document.cookie = `${OAUTH_INTENT_COOKIE}=${value}; Path=/; Max-Age=600; SameSite=Lax`;
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
  if (typeof document === "undefined") return;
  document.cookie = `${OAUTH_INTENT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
