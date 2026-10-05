import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && request.nextUrl.pathname !== "/auth/callback") {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Skip static assets AND the logged-in app shells.
     * Dashboard / client-dashboard / admin auth is enforced client-side;
     * excluding them from middleware removes Edge latency on every click.
     */
    "/((?!_next/static|_next/image|favicon.ico|dashboard|client-dashboard|admin|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
