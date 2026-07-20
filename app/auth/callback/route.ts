import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * OAuth / email-verification callback. Supabase (Google OAuth, e-mail
 * confirmation, magic links) redirects the browser here with a `code`
 * param that we exchange for a session cookie via @supabase/ssr.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next");
  // Only allow relative paths to avoid open-redirect via a crafted `next` param.
  const next = rawNext && rawNext.startsWith("/") ? rawNext : null;

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  if (next) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  const destination =
    profile?.role === "client" ? "/client-dashboard" : "/dashboard/profile";

  return NextResponse.redirect(`${origin}${destination}`);
}
