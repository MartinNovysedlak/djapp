import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import {
  OAUTH_INTENT_COOKIE,
  parseOAuthIntentCookieValue,
} from "@/lib/oauth-intent";
import { syncOAuthProfileFromUser } from "@/lib/sync-oauth-profile";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import { createBillingAdminClient } from "@/lib/stripe/config";

/**
 * OAuth / email-verification callback. Prefills Google profile data,
 * applies signup intent (dj|client), then routes incomplete users to onboarding.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  const next = rawNext && rawNext.startsWith("/") ? rawNext : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const cookieStore = await cookies();
  const intent = parseOAuthIntentCookieValue(
    cookieStore.get(OAUTH_INTENT_COOKIE)?.value
  );

  // Clear intent cookie on the response later
  let profile = await syncOAuthProfileFromUser(supabase, data.user, null);

  // Apply dj|client intent via service role (role column is otherwise locked)
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
      // Re-sync non-role Google fields
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

  const response = NextResponse.redirect(`${origin}${destination}`);
  response.cookies.set(OAUTH_INTENT_COOKIE, "", {
    path: "/",
    maxAge: 0,
  });
  return response;
}
