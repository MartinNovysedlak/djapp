import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  OAUTH_NEXT_COOKIE,
  readOAuthNext,
  serverAuthCookieOptions,
  type AuthCookieOptions,
} from "@/lib/auth-cookies";
import { authErrorCode } from "@/lib/auth-errors";
import {
  OAUTH_INTENT_COOKIE,
  parseOAuthIntentCookieValue,
} from "@/lib/oauth-intent";
import { syncOAuthProfileFromUser } from "@/lib/sync-oauth-profile";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import { createBillingAdminClient } from "@/lib/stripe/config";
import { ONBOARDING_OK_COOKIE, ONBOARDING_OK_MAX_AGE } from "@/lib/onboarding-cookie";
import { getPublicSiteUrl, isNonPublicSiteUrl } from "@/lib/site-url";

type PendingCookie = {
  name: string;
  value: string;
  options?: {
    domain?: string;
    path?: string;
    sameSite?: boolean | "lax" | "strict" | "none";
    secure?: boolean;
    maxAge?: number;
    httpOnly?: boolean;
    expires?: Date;
  };
};

/** Never send the browser to 0.0.0.0 or localhost after Google login. */
function callbackOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  const proto = (
    request.headers.get("x-forwarded-proto") ||
    (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https")
  )
    .split(",")[0]
    .trim();

  if (!host || host.startsWith("0.0.0.0")) return getPublicSiteUrl();
  const origin = `${proto}://${host}`;
  if (isNonPublicSiteUrl(origin)) return getPublicSiteUrl();
  return origin;
}

function expireCookie(
  response: NextResponse,
  name: string,
  options: AuthCookieOptions
) {
  response.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
    secure: options.secure,
    ...(options.domain ? { domain: options.domain } : {}),
  });
}

/**
 * OAuth / email-verification callback. Session cookies are written onto the
 * redirect response itself so the browser keeps the login.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = callbackOrigin(request);
  const code = searchParams.get("code");
  const providerError =
    searchParams.get("error_description") || searchParams.get("error");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const cookieOptions = serverAuthCookieOptions(host);
  const cookieStore = await cookies();
  const pending: PendingCookie[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            const merged = { ...cookieOptions, ...options };
            pending.push({ name, value, options: merged });
            try {
              cookieStore.set(name, value, merged);
            } catch (err) {
              console.error("[auth/callback] cookie", err);
            }
          });
        },
      },
    }
  );

  const redirect = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    for (const cookie of pending) {
      response.cookies.set(cookie.name, cookie.value, cookie.options);
    }
    return response;
  };

  if (!code) {
    const codeKey = providerError ? authErrorCode(providerError) : "missing_code";
    if (providerError) console.error("[auth/callback] provider", providerError);
    return redirect(`/login?error=${codeKey}`);
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    console.error("[auth/callback] exchange", error?.message);
    return redirect(`/login?error=${authErrorCode(error?.message)}`);
  }

  const intent = parseOAuthIntentCookieValue(
    cookieStore.get(OAUTH_INTENT_COOKIE)?.value
  );
  const next =
    readOAuthNext(cookieStore.get(OAUTH_NEXT_COOKIE)?.value) ||
    readOAuthNext(searchParams.get("next"));

  let profile = await syncOAuthProfileFromUser(supabase, data.user, null);

  if (intent && profile && profile.role !== "admin") {
    try {
      const admin = createBillingAdminClient();
      const rolePatch: Record<string, string> = {};
      if (intent.role === "dj" || intent.role === "client") {
        rolePatch.role = intent.role;
      }
      if (intent.role === "dj" && intent.artistKind) {
        rolePatch.artist_kind = intent.artistKind;
      }
      if (Object.keys(rolePatch).length > 0) {
        await admin.from("profiles").update(rolePatch).eq("id", data.user.id);
      }
      profile = await syncOAuthProfileFromUser(supabase, data.user, null);
      const { data: refreshed } = await supabase
        .from("profiles")
        .select(
          "id, role, full_name, real_first_name, real_last_name, phone, avatar_url, artist_kind, public_slug, location"
        )
        .eq("id", data.user.id)
        .maybeSingle();
      if (refreshed) profile = refreshed;
    } catch (err) {
      console.error("[auth/callback] intent", err);
    }
  } else if (!profile) {
    const { data: row } = await supabase
      .from("profiles")
      .select(
        "id, role, full_name, real_first_name, real_last_name, phone, avatar_url, artist_kind, public_slug, location"
      )
      .eq("id", data.user.id)
      .maybeSingle();
    profile = row;
  }

  let destination: string;
  if (
    isAuthorizedAdmin({
      role: profile?.role,
      email: data.user.email,
    })
  ) {
    destination = "/admin";
  } else if (!isProfileOnboardingComplete(profile)) {
    destination = "/onboarding";
  } else if (next) {
    destination = next;
  } else if (profile?.role === "client") {
    destination = "/client-dashboard";
  } else {
    destination = "/dashboard/profile";
  }

  const response = redirect(destination);
  expireCookie(response, OAUTH_INTENT_COOKIE, cookieOptions);
  expireCookie(response, OAUTH_NEXT_COOKIE, cookieOptions);
  if (destination !== "/onboarding" && isProfileOnboardingComplete(profile)) {
    response.cookies.set(ONBOARDING_OK_COOKIE, data.user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: cookieOptions.secure ?? process.env.NODE_ENV === "production",
      maxAge: ONBOARDING_OK_MAX_AGE,
      ...(cookieOptions.domain ? { domain: cookieOptions.domain } : {}),
    });
  }
  return response;
}
