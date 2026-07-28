import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";
import { isProfileOnboardingComplete } from "@/lib/profile-completeness";
import {
  ONBOARDING_OK_COOKIE,
  ONBOARDING_OK_MAX_AGE,
} from "@/lib/onboarding-cookie";

/**
 * Sets the onboarding-ok cookie after client-side login (email/password)
 * so middleware can skip Auth on subsequent navigations.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, full_name, real_first_name, real_last_name, phone, artist_kind, location"
    )
    .eq("id", user.id)
    .maybeSingle();

  const admin = isAuthorizedAdmin({
    role: profile?.role,
    email: user.email,
  });
  const complete = admin || isProfileOnboardingComplete(profile);

  const res = NextResponse.json({ ok: true, complete });
  if (complete) {
    res.cookies.set(ONBOARDING_OK_COOKIE, user.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: ONBOARDING_OK_MAX_AGE,
    });
  } else {
    res.cookies.set(ONBOARDING_OK_COOKIE, "", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  }
  return res;
}
