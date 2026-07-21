import { createClient } from "@/utils/supabase/client";

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
 * Kicks off the Google OAuth flow client-side. Supabase redirects the
 * browser to Google, then back to our callback route which exchanges the
 * `code` for a session. `next` is forwarded so the callback knows where to
 * send the user afterwards (e.g. a booking page they were redirected from).
 */
export async function signInWithGoogle(next?: string): Promise<AuthResult> {
  const supabase = createClient();

  const redirectTo = new URL("/auth/callback", window.location.origin);
  if (next) redirectTo.searchParams.set("next", next);

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() },
  });

  return { error: error?.message ?? null };
}

export type SignUpDetails = {
  displayName: string;
  role: "dj" | "client";
  firstName: string;
  lastName: string;
  phone: string;
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

  return { error: null, needsEmailConfirmation };
}

/** Looks up the signed-in user's role so we know where to redirect them. */
export async function getOwnRole(): Promise<"dj" | "client" | null> {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.role === "client" ? "client" : "dj";
}