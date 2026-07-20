"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Disc3, Home, Users, User, ArrowRight, LogOut, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type AuthUser = { id: string; email?: string };

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<"dj" | "client">("dj");
  const [authReady, setAuthReady] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const applySession = async (userId: string | undefined, email?: string) => {
      if (cancelled) return;
      if (!userId) {
        setUser(null);
        setRole("dj");
        setAuthReady(true);
        return;
      }

      setUser({ id: userId, email });
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      setRole(profile?.role === "client" ? "client" : "dj");
      setAuthReady(true);
    };

    // Fast local session first, then keep in sync with auth events
    // (login/logout/token refresh) so the nav never sticks in a logged-out state.
    supabase.auth.getSession().then(({ data }) => {
      const session = data.session;
      applySession(session?.user?.id, session?.user?.email);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user?.id, session?.user?.email);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const dashboardHref =
    role === "client" ? "/client-dashboard" : "/dashboard/profile";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  const handleSignOut = async () => {
    const { clearClientAuthCache, clearDashboardAuthCache } = await import(
      "@/lib/nav-cache"
    );
    clearClientAuthCache();
    clearDashboardAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const linkClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm transition-all duration-300 ${
      active
        ? "bg-white/10 text-white font-medium shadow-[inset_0_1px_0_oklch(1_0_0/0.08)]"
        : "text-zinc-400 hover:text-white hover:bg-white/5"
    }`;

  const isLiveGuest = pathname.startsWith("/live");
  const isLiveBooth = pathname.includes("/bookings/") && pathname.endsWith("/live");

  if (isLiveGuest || isLiveBooth) {
    return null;
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
        <nav
          className={`pointer-events-auto flex w-full max-w-5xl items-center justify-between gap-4 rounded-2xl border px-4 py-2.5 transition-all duration-500 ${
            scrolled
              ? "border-white/10 bg-background/70 shadow-[0_16px_50px_-20px_oklch(0.5_0.25_295/0.45),0_4px_18px_-8px_oklch(0_0_0/0.6)] backdrop-blur-2xl"
              : "border-transparent bg-transparent"
          }`}
        >
          <Link href="/" className="group flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 shadow-[0_0_24px_-6px_oklch(0.6_0.26_295/0.5)] transition-transform duration-500 group-hover:rotate-180">
              <Disc3 className="size-5 text-violet-300" strokeWidth={1.5} />
            </div>
            <span className="text-base font-semibold tracking-tight text-white">
              DJ App
            </span>
          </Link>

          <div className="hidden items-center gap-1 sm:flex">
            <Link href="/" className={linkClass(pathname === "/")}>
              <Home className="size-3.5" />
              Domov
            </Link>
            <Link href="/djs" className={linkClass(isActive("/djs"))}>
              <Users className="size-3.5" />
              Katalóg
            </Link>
            <Link href="/kontakt" className={linkClass(isActive("/kontakt"))}>
              <Mail className="size-3.5" />
              Kontakt
            </Link>
            {authReady && user && (
              <Link
                href={dashboardHref}
                className={linkClass(
                  isActive(role === "client" ? "/client-dashboard" : "/dashboard")
                )}
              >
                <User className="size-3.5" />
                Dashboard
              </Link>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!authReady ? (
              <div className="h-8 w-24 animate-pulse rounded-full bg-white/5" />
            ) : user ? (
              <button
                onClick={handleSignOut}
                className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-zinc-300 transition-all duration-300 hover:border-white/20 hover:bg-white/10 sm:inline-flex"
              >
                <LogOut className="size-3.5" />
                Odhlásiť
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-full px-3 py-1.5 text-sm text-zinc-400 transition-colors duration-300 hover:text-white sm:block"
                >
                  Prihlásiť sa
                </Link>
                <Link
                  href="/register"
                  className="group inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4.5 py-2 text-sm font-medium text-white shadow-[0_8px_30px_-8px_oklch(0.6_0.26_295/0.7)] transition-all duration-300 hover:shadow-[0_8px_40px_-6px_oklch(0.6_0.26_295/0.9)] hover:brightness-110"
                >
                  Pridať sa
                  <ArrowRight className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </div>

      <div className="h-[76px]" aria-hidden />

      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/10 bg-background/80 px-3 py-2 shadow-[0_16px_50px_-12px_oklch(0_0_0/0.7)] backdrop-blur-2xl sm:hidden">
        <Link
          href="/"
          className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] transition-all duration-300 ${
            pathname === "/" ? "text-violet-300" : "text-zinc-500"
          }`}
        >
          <Home className="size-4" />
          Domov
        </Link>
        <Link
          href="/djs"
          className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] transition-all duration-300 ${
            isActive("/djs") ? "text-violet-300" : "text-zinc-500"
          }`}
        >
          <Users className="size-4" />
          Katalóg
        </Link>
        <Link
          href="/kontakt"
          className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] transition-all duration-300 ${
            isActive("/kontakt") ? "text-violet-300" : "text-zinc-500"
          }`}
        >
          <Mail className="size-4" />
          Kontakt
        </Link>
        {authReady && user && (
          <Link
            href={dashboardHref}
            className={`flex flex-col items-center gap-0.5 rounded-full px-3 py-1 text-[10px] transition-all duration-300 ${
              isActive(role === "client" ? "/client-dashboard" : "/dashboard")
                ? "text-violet-300"
                : "text-zinc-500"
            }`}
          >
            <User className="size-4" />
            Dashboard
          </Link>
        )}
      </div>
    </>
  );
}
