import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";

/** Cookie: value = auth user id when onboarding is complete. Avoids a profiles round-trip on every navigation. */
export const ONBOARDING_OK_COOKIE = "btv_pc";

const ONBOARDING_OK_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

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

function setOnboardingOkCookie(
  response: NextResponse,
  userId: string
) {
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
 * Refresh auth cookies and hard-gate incomplete profiles to /onboarding
 * so they cannot browse the rest of the site.
 *
 * Fast path: fresh local session + onboarding cookie → no Auth/DB round-trips.
 * Otherwise validate with getUser() and (when needed) profiles.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

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
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const pathname = request.nextUrl.pathname;
  const onOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  // Local JWT read (no network). Prefer this when token is still fresh.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const expiresAtMs = (session?.expires_at ?? 0) * 1000;
  const sessionFresh =
    Boolean(session?.user?.id) && expiresAtMs - Date.now() > 5 * 60 * 1000;

  if (
    sessionFresh &&
    session?.user?.id &&
    !isAuthPlumbing(pathname) &&
    !isPublicGuestSurface(pathname) &&
    !onOnboarding &&
    request.cookies.get(ONBOARDING_OK_COOKIE)?.value === session.user.id
  ) {
    return supabaseResponse;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (request.cookies.has(ONBOARDING_OK_COOKIE)) {
      clearOnboardingOkCookie(supabaseResponse);
    }
    return supabaseResponse;
  }

  if (isAuthPlumbing(pathname) || isPublicGuestSurface(pathname)) {
    return supabaseResponse;
  }

  const cachedOk =
    request.cookies.get(ONBOARDING_OK_COOKIE)?.value === user.id;

  // Validated user + onboarding cookie — skip profiles query.
  if (cachedOk && !onOnboarding) {
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
