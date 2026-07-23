"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BadgeCheck, ChartColumn, LogOut, Newspaper, Shield } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { BrandLogo } from "@/components/BrandLogo";
import { cn } from "@/lib/utils";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.replace("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (
        !isAuthorizedAdmin({
          role: profile?.role,
          email: data.user.email,
        })
      ) {
        router.replace(
          profile?.role === "client" ? "/client-dashboard" : "/dashboard/profile"
        );
        return;
      }
      setEmail(data.user.email ?? null);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (!ready) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-sm text-zinc-500">
        Overujem admin prístup…
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <div className="flex items-center gap-4">
            <BrandLogo size="sm" />
            <nav className="flex items-center gap-1">
              <Link
                href="/admin"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                  pathname === "/admin"
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Shield className="size-3.5" />
                Prehľad
              </Link>
              <Link
                href="/admin/analytics"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                  pathname?.startsWith("/admin/analytics")
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <ChartColumn className="size-3.5" />
                Analytika
              </Link>
              <Link
                href="/admin/verifications"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                  pathname?.startsWith("/admin/verifications")
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <BadgeCheck className="size-3.5" />
                Overenia
              </Link>
              <Link
                href="/admin/blog"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm",
                  pathname?.startsWith("/admin/blog")
                    ? "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                <Newspaper className="size-3.5" />
                Blog
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-zinc-500 sm:inline">
              {email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
            >
              <LogOut className="size-3.5" />
              Odhlásiť
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
