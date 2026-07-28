import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
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
