import { createClient } from "@/utils/supabase/client";
import { authErrorMessage } from "@/lib/auth-errors";
import { getPublicSiteUrl, isNonPublicSiteUrl } from "@/lib/site-url";
import {
  clearOAuthNextCookie,
  writeOAuthNextCookie,
} from "@/lib/auth-cookies";
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
  return { error: error ? authErrorMessage(error.message) : null };
}

/** Public Google web client already configured on the Supabase Google provider. */
export const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "428818539814-17i9tmdpqqb6cqjhj0k10l189gqrttl7.apps.googleusercontent.com";

/** Leave localhost / apex before Google, so the session is created on www. */
export function redirectGoogleAuthIfNeeded(
  next?: string,
  intent?: OAuthSignupIntent
): boolean {
  const canonical = getPublicSiteUrl();
  if (
    !isNonPublicSiteUrl(window.location.origin) &&
    window.location.origin === canonical
  ) {
    return false;
  }
  const path = intent ? "/register" : "/login";
  const target = new URL(path, canonical);
  target.searchParams.set("google", "1");
  if (next?.startsWith("/") && !next.startsWith("//")) {
    target.searchParams.set("redirect", next);
  }
  if (intent?.role) target.searchParams.set("role", intent.role);
  if (intent?.artistKind && intent.artistKind !== "dj") {
    target.searchParams.set("kind", intent.artistKind);
  }
  window.location.assign(target.toString());
  return true;
}

export function rememberGoogleIntent(next?: string, intent?: OAuthSignupIntent) {
  if (intent) writeOAuthIntentCookie(intent);
  if (next?.startsWith("/") && !next.startsWith("//")) writeOAuthNextCookie(next);
  else clearOAuthNextCookie();
}

/** Turn a Google ID token into a session and return where to go next. */
export async function completeGoogleSignIn(
  credential: string,
  nonce: string
): Promise<AuthResult & { path?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: credential,
    nonce,
  });
  if (error) return { error: authErrorMessage(error.message) };

  const { finalizeGoogleLogin } = await import("@/app/auth/callback/actions");
  const { next } = await finalizeGoogleLogin();
  const path = await getPostAuthPath(next);
  return { error: null, path };
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
    return { error: authErrorMessage(error.message), needsEmailConfirmation: false };
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
