import { createClient } from "@/utils/supabase/client";
import {
  writeOAuthIntentCookie,
  type OAuthSignupIntent,
} from "@/lib/oauth-intent";

export type AuthResult = {
  error: string | null;
};

export async function signInWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  const supabase = createClient();

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

/**
 * Kicks off the Google OAuth flow client-side. Optional `intent` is stored
 * in a short-lived cookie so /auth/callback can set role (dj|client) safely.
 */
export async function signInWithGoogle(
  next?: string,
  intent?: OAuthSignupIntent
): Promise<AuthResult> {
  const supabase = createClient();

  if (intent) {
    writeOAuthIntentCookie(intent);
  }

  const redirectTo = new URL("/auth/callback", window.location.origin);
  if (next) redirectTo.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo.toString(),
    },
  });

  return { error: error?.message ?? null };
}

export type SignUpDetails = {
  displayName: string;
  role: "dj" | "client";
  firstName: string;
  lastName: string;
  phone: string;
  /** Required for DJ — miesto pôsobenia. */
  location?: string | null;
  /** When true, the DJ's real first/last name may appear publicly. */
  showRealName?: boolean;
  /** Artist subtype — only for role === "dj". */
  artistKind?: "dj" | "band" | "dj_band";
};

export type SignUpResult = AuthResult & {
  /** True when Supabase requires e-mail confirmation before a session exists. */
  needsEmailConfirmation: boolean;
};

export async function signUpWithEmail(
  email: string,
  password: string,
  details: SignUpDetails
): Promise<SignUpResult> {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: details.displayName,
        role: details.role,
        first_name: details.firstName,
        last_name: details.lastName,
        phone: details.phone,
        location:
          details.role === "dj" ? details.location?.trim() || null : null,
        show_real_name: details.showRealName ?? false,
        artist_kind:
          details.role === "dj" ? details.artistKind ?? "dj" : undefined,
      },
    },
  });

  if (error) {
    return { error: error.message, needsEmailConfirmation: false };
  }

  // With "Confirm email" enabled in Supabase, signUp succeeds but returns
  // no session until the user clicks the confirmation link.
  const needsEmailConfirmation = !!data.user && !data.session;

  // Fallback if the DB trigger did not yet pick up location from metadata.
  if (
    data.session &&
    data.user &&
    details.role === "dj" &&
    details.location?.trim()
  ) {
    await supabase
      .from("profiles")
      .update({ location: details.location.trim() })
      .eq("id", data.user.id);
  }

  return { error: null, needsEmailConfirmation };
}

/** Looks up the signed-in user's role so we know where to redirect them. */
export async function getOwnRole(): Promise<"dj" | "client" | "admin" | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profile?.role === "client") return "client";
  if (profile?.role === "admin") {
    const { isAuthorizedAdmin } = await import("@/lib/admin-auth");
    if (isAuthorizedAdmin({ role: "admin", email: data.user.email })) {
      return "admin";
    }
    // Stale / unauthorized admin role — treat as DJ for routing.
    return "dj";
  }
  return profile ? "dj" : null;
}

/**
 * Post-login destination. Incomplete profiles always go to /onboarding first.
 */
export async function getPostAuthPath(
  redirectParam?: string | null
): Promise<string> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return "/login";

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "role, full_name, real_first_name, real_last_name, phone, artist_kind, location"
    )
    .eq("id", data.user.id)
    .maybeSingle();

  const { isAuthorizedAdmin } = await import("@/lib/admin-auth");
  if (
    isAuthorizedAdmin({
      role: profile?.role,
      email: data.user.email,
    })
  ) {
    return "/admin";
  }

  const { isProfileOnboardingComplete } = await import(
    "@/lib/profile-completeness"
  );
  if (!isProfileOnboardingComplete(profile)) {
    return "/onboarding";
  }

  if (profile?.role === "client") {
    if (redirectParam?.startsWith("/")) return redirectParam;
    return "/client-dashboard";
  }

  return "/dashboard/bookings";
}
