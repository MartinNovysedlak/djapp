import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";

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
  return false;
}

/**
 * Refresh auth cookies and hard-gate incomplete profiles to /onboarding
 * so they cannot browse the rest of the site.
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user || isAuthPlumbing(pathname)) {
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
    return supabaseResponse;
  }

  const complete = isProfileOnboardingComplete(profile);
  const onOnboarding =
    pathname === "/onboarding" || pathname.startsWith("/onboarding/");

  if (!complete) {
    if (onOnboarding) return supabaseResponse;
    return redirectWithSession(request, supabaseResponse, "/onboarding");
  }

  if (onOnboarding) {
    const dest =
      profile?.role === "client" ? "/client-dashboard" : "/dashboard/profile";
    return redirectWithSession(request, supabaseResponse, dest);
  }

  return supabaseResponse;
}
