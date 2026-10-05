"use server";

import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import {
  OAUTH_INTENT_COOKIE,
  parseOAuthIntentCookieValue,
} from "@/lib/oauth-intent";
import {
  OAUTH_NEXT_COOKIE,
  readOAuthNext,
  serverAuthCookieOptions,
} from "@/lib/auth-cookies";
import { syncOAuthProfileFromUser } from "@/lib/sync-oauth-profile";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { createBillingAdminClient } from "@/lib/stripe/config";
import { ONBOARDING_OK_COOKIE, ONBOARDING_OK_MAX_AGE } from "@/lib/onboarding-cookie";
import { headers } from "next/headers";

export async function finalizeGoogleLogin(): Promise<{ next: string | null }> {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const host = headerStore.get("x-forwarded-host") || headerStore.get("host");
  const cookieOptions = serverAuthCookieOptions(host);
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return { next: null };

  const intent = parseOAuthIntentCookieValue(
    cookieStore.get(OAUTH_INTENT_COOKIE)?.value
  );
  const next = readOAuthNext(cookieStore.get(OAUTH_NEXT_COOKIE)?.value);

  let profile = await syncOAuthProfileFromUser(supabase, user, null);

  if (intent && profile && profile.role !== "admin") {
    try {
      const admin = createBillingAdminClient();
      const rolePatch: Record<string, string> = {};
      if (intent.role === "dj" || intent.role === "client") rolePatch.role = intent.role;
      if (intent.role === "dj" && intent.artistKind) {
        rolePatch.artist_kind = intent.artistKind;
      }
      if (Object.keys(rolePatch).length > 0) {
        await admin.from("profiles").update(rolePatch).eq("id", user.id);
      }
      const { data: refreshed } = await supabase
        .from("profiles")
        .select(
          "id, role, full_name, real_first_name, real_last_name, phone, avatar_url, artist_kind, public_slug, location"
        )
        .eq("id", user.id)
        .maybeSingle();
      if (refreshed) profile = refreshed;
    } catch (err) {
      console.error("[auth/callback] intent", err);
    }
  }

  cookieStore.set(OAUTH_INTENT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    ...(cookieOptions.domain ? { domain: cookieOptions.domain } : {}),
  });
  cookieStore.set(OAUTH_NEXT_COOKIE, "", {
    path: "/",
    maxAge: 0,
    ...(cookieOptions.domain ? { domain: cookieOptions.domain } : {}),
  });

  if (
    profile &&
    isProfileOnboardingComplete(profile) &&
    !isAuthorizedAdmin({ role: profile.role, email: user.email })
  ) {
    cookieStore.set(ONBOARDING_OK_COOKIE, user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: cookieOptions.secure ?? false,
      maxAge: ONBOARDING_OK_MAX_AGE,
      ...(cookieOptions.domain ? { domain: cookieOptions.domain } : {}),
    });
  }

  return { next };
}
