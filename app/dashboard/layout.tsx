"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Calendar,
  CalendarCheck,
  FileText,
  FileSignature,
  LogOut,
  Menu,
  Megaphone,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  DashboardUserProvider,
  useDashboardUser,
} from "@/components/DashboardUserContext";
import { clearDashboardAuthCache } from "@/lib/nav-cache";
import { BrandLogo } from "@/components/BrandLogo";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardUserProvider>
      <DashboardShell>{children}</DashboardShell>
    </DashboardUserProvider>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading } = useDashboardUser();

  const navItems = [
    {
      label: "Môj profil",
      href: "/dashboard/profile",
      icon: <User className="size-4" />,
    },
    {
      label: "Rezervácie",
      href: "/dashboard/bookings",
      icon: <CalendarCheck className="size-4" />,
    },
    {
      label: "Analytika",
      href: "/dashboard/analytics",
      icon: <TrendingUp className="size-4" />,
    },
    {
      label: "Kalendár",
      href: "/dashboard/calendar",
      icon: <Calendar className="size-4" />,
    },
    {
      label: "Marketing",
      href: "/dashboard/settings/marketing",
      icon: <Megaphone className="size-4" />,
    },
    {
      label: "Špeciálna ponuka",
      href: "/dashboard/extras",
      icon: <Sparkles className="size-4" />,
    },
    {
      label: "Šablóny",
      href: "/dashboard/contracts",
      icon: <FileText className="size-4" />,
    },
    {
      label: "PDF zmluvy",
      href: "/dashboard/contracts/generate",
      icon: <FileSignature className="size-4" />,
    },
    {
      label: "PDF faktúry",
      href: "/dashboard/invoices/generate",
      icon: <Receipt className="size-4" />,
    },
  ];

  const isLiveBooth = Boolean(pathname?.includes("/live"));

  const handleSignOut = async () => {
    clearDashboardAuthCache();
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Keep chrome visible while auth resolves — never blank the whole app.
  if (!loading && !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Presmerovanie na prihlásenie…</p>
      </div>
    );
  }

  if (isLiveBooth) {
    return (
      <div className="relative min-h-svh bg-background">
        {loading && !user ? (
          <div className="flex min-h-svh items-center justify-center">
            <p className="text-muted-foreground">Načítavam…</p>
          </div>
        ) : (
          children
        )}
      </div>
    );
  }

  const sidebar = (
    <aside
      className={[
        "fixed bottom-0 left-0 top-[76px] z-40 flex w-68 flex-col p-4",
        "transition-transform duration-300 ease-out md:relative md:top-0 md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="glass flex h-full flex-col rounded-3xl shadow-[0_24px_70px_-30px_oklch(0_0_0/0.8)]">
        <div className="flex h-[4.5rem] items-center border-b border-white/5 px-3">
          <Link href="/" className="inline-flex min-w-0 items-center">
            <BrandLogo size="md" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {navItems.map((item) => {
            // Longest-prefix match so e.g. "/dashboard/contracts/generate" only
            // highlights "PDF zmluvy", not the shorter "Šablóny" href it also starts with.
            const bestMatch = navItems
              .filter(
                (i) =>
                  pathname === i.href || pathname?.startsWith(`${i.href}/`)
              )
              .sort((a, b) => b.href.length - a.href.length)[0];
            const isActive = bestMatch?.href === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setSidebarOpen(false)}
                className={[
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 font-medium text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_8px_24px_-12px_oklch(0.6_0.26_295/0.5)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white",
                ].join(" ")}
              >
                <span
                  className={`shrink-0 transition-all duration-200 ${
                    isActive
                      ? "text-violet-300"
                      : "group-hover:scale-110 group-hover:text-violet-300"
                  }`}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[11px] font-bold text-white">
              {(user?.email ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1 truncate text-xs text-zinc-500">
              {user?.email ?? (loading ? "Načítavam…" : "")}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-2xl px-2.5 py-2 text-sm text-zinc-400 transition-all duration-200 hover:bg-white/5 hover:text-white"
          >
            <LogOut className="size-3.5" />
            Odhlásiť sa
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="relative flex min-h-svh bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_-10%,oklch(0.5_0.25_295/0.14),transparent_65%)]"
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {sidebar}

      <main className="relative flex-1 overflow-auto">
        <div className="flex items-center gap-3 px-4 py-3 md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-300 transition-colors duration-200 hover:bg-white/10"
          >
            <Menu className="size-4" />
          </button>
          <span className="text-sm font-medium text-white">Menu</span>
        </div>
        <div className="p-4 md:p-8 lg:p-10">
          {loading && !user ? (
            <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
              <div className="h-8 w-48 rounded-xl bg-white/5" />
              <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
              <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
              <div className="h-40 rounded-3xl bg-white/[0.03]" />
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}
