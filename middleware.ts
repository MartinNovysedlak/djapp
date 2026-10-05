import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

const LIVE_ORIGIN = "https://www.bookthevibe.com";

function isLocalHost(host: string): boolean {
  const name = host.split(":")[0].toLowerCase();
  return name === "localhost" || name === "127.0.0.1" || name === "0.0.0.0" || name === "::1";
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim();
  if (isLocalHost(host)) {
    const destination = new URL(
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
      LIVE_ORIGIN
    );
    return NextResponse.redirect(destination);
  }

  const path = request.nextUrl.pathname;
  if (
    path.startsWith("/dashboard") ||
    path.startsWith("/client-dashboard") ||
    path.startsWith("/admin")
  ) {
    return NextResponse.next();
  }

  const code = request.nextUrl.searchParams.get("code");
  if (code && path !== "/auth/callback") {
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
