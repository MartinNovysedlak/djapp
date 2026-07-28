import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import {
  ONBOARDING_OK_COOKIE,
  ONBOARDING_OK_MAX_AGE,
} from "@/lib/onboarding-cookie";

export { ONBOARDING_OK_COOKIE } from "@/lib/onboarding-cookie";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value);
  });
}

function redirectWithSession(
  request: NextRequest,
  supabaseResponse: NextResponse,
  pathname: string
) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  copyCookies(supabaseResponse, redirect);
  return redirect;
}

function isAuthPlumbing(pathname: string): boolean {
  if (pathname.startsWith("/auth/")) return true;
  if (pathname.startsWith("/api/stripe/webhook")) return true;
  if (pathname.startsWith("/api/calendar/export/")) return true;
  if (pathname.startsWith("/api/cron/")) return true;
  return false;
}

function isPublicGuestSurface(pathname: string): boolean {
  return (
    pathname.startsWith("/live") ||
    pathname.startsWith("/akcia") ||
    pathname.startsWith("/hodnotenie")
  );
}

/** Marketing / public — never hit Supabase from middleware. */
function isPublicBrowse(pathname: string): boolean {
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/djs") ||
    pathname.startsWith("/blog") ||
    pathname.startsWith("/kontakt") ||
    pathname.startsWith("/podmienky") ||
    pathname.startsWith("/obchodne-podmienky") ||
    pathname.startsWith("/ochrana-udajov") ||
    pathname.startsWith("/p/") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register")
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some(
      (c) =>
        c.name.includes("-auth-token") ||
        (c.name.startsWith("sb-") && c.name.includes("auth"))
    );
}

function setOnboardingOkCookie(response: NextResponse, userId: string) {
  response.cookies.set(ONBOARDING_OK_COOKIE, userId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: ONBOARDING_OK_MAX_AGE,
  });
}

function clearOnboardingOkCookie(response: NextResponse) {
  response.cookies.set(ONBOARDING_OK_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 0,
  });
}

/**
 * Gate incomplete profiles to /onboarding — only on protected app routes.
 *
 * Fast paths (no network):
 * 1. Auth plumbing / guest surfaces
 * 2. Public marketing pages (always)
 * 3. Anonymous visitors
 * 4. Protected app + onboarding cookie already set
 *
 * Session refresh for Server Components happens on the rare path without
 * the onboarding cookie (first dashboard hit after login).
 */
export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isAuthPlumbing(pathname) || isPublicGuestSurface(pathname)) {
    return NextResponse.next({ request });
  }

  // Public site must stay instant — onboarding is enforced only in the app shell.
  if (isPublicBrowse(pathname)) {
    return NextResponse.next({ request });
  }

  const onboardingCookie = request.cookies.get(ONBOARDING_OK_COOKIE)?.value;
  const hasAuth = hasSupabaseAuthCookie(request);

  if (!hasAuth) {
    if (onboardingCookie) {
      const res = NextResponse.next({ request });
      clearOnboardingOkCookie(res);
      return res;
    }
    return NextResponse.next({ request });
  }

  const onOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  // Verified session — never hit Auth/DB (dashboard, APIs, server actions, RSC).
  if (hasAuth && onboardingCookie && !onOnboarding) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  const sessionFresh =
    Boolean(session?.user?.id) && expiresAtMs - Date.now() > 5 * 60 * 1000;

  if (
    sessionFresh &&
    session?.user?.id &&
    onboardingCookie === session.user.id &&
    !onOnboarding
  ) {
    return supabaseResponse;
  }

  if (sessionFresh && session?.user?.id && !onOnboarding) {
    const { data: profile } = await supabase
      .from("profiles")
      .select(
        "role, full_name, real_first_name, real_last_name, phone, artist_kind, location"
      )
      .eq("id", session.user.id)
      .maybeSingle();

    if (
      isAuthorizedAdmin({
        role: profile?.role,
        email: session.user.email,
      })
    ) {
      setOnboardingOkCookie(supabaseResponse, session.user.id);
      return supabaseResponse;
    }

    const complete = isProfileOnboardingComplete(profile);
    if (!complete) {
      clearOnboardingOkCookie(supabaseResponse);
      return redirectWithSession(request, supabaseResponse, "/onboarding");
    }

    setOnboardingOkCookie(supabaseResponse, session.user.id);
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (onboardingCookie) clearOnboardingOkCookie(supabaseResponse);
    return supabaseResponse;
  }

  if (onboardingCookie === user.id && !onOnboarding) {
    return supabaseResponse;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, full_name, real_first_name, real_last_name, phone, artist_kind, location"
    )
    .eq("id", user.id)
    .maybeSingle();

  if (
    isAuthorizedAdmin({
      role: profile?.role,
      email: user.email,
    })
  ) {
    setOnboardingOkCookie(supabaseResponse, user.id);
    return supabaseResponse;
  }

  const complete = isProfileOnboardingComplete(profile);

  if (!complete) {
    clearOnboardingOkCookie(supabaseResponse);
    if (onOnboarding) return supabaseResponse;
    return redirectWithSession(request, supabaseResponse, "/onboarding");
  }

  setOnboardingOkCookie(supabaseResponse, user.id);

  if (onOnboarding) {
    const dest =
      profile?.role === "client" ? "/client-dashboard" : "/dashboard/profile";
    return redirectWithSession(request, supabaseResponse, dest);
  }

  return supabaseResponse;
}
