"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  User,
  Calendar,
  CalendarCheck,
  FileText,
  FileSignature,
  LayoutTemplate,
  Lock,
  LogOut,
  Menu,
  Megaphone,
  MessageCircle,
  Receipt,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  DashboardUserProvider,
  useDashboardUser,
} from "@/components/DashboardUserContext";
import { NewMessageToaster } from "@/components/chat/NewMessageToaster";
import { clearDashboardAuthCache } from "@/lib/nav-cache";
import { BrandLogo } from "@/components/BrandLogo";
import { countUnreadBookingMessages } from "@/app/actions/booking-messages";
import { PremiumUpgradeGate } from "@/components/PremiumUpgradeGate";
import {
  hasPremiumAccess,
  isPremiumDashboardPath,
  getTrialDaysLeft,
  isTrialActive,
  isPaidPremiumActive,
} from "@/lib/plans";
import { cn } from "@/lib/utils";

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
  const [unreadMessages, setUnreadMessages] = useState(0);
  const { user, profile, loading } = useDashboardUser();
  const premium = hasPremiumAccess(profile);
  const trialDays = getTrialDaysLeft(profile);
  const onTrial = isTrialActive(profile) && !isPaidPremiumActive(profile);

  useEffect(() => {
    if (!user) {
      setUnreadMessages(0);
      return;
    }
    if (!premium) {
      setUnreadMessages(0);
      return;
    }
    const refresh = () => {
      void countUnreadBookingMessages().then((r) => {
        if (r.ok) setUnreadMessages(r.count);
      });
    };
    refresh();
    const id = window.setInterval(refresh, 10000);
    return () => window.clearInterval(id);
  }, [user, pathname, premium]);

  const navItems = [
    {
      label: "Môj profil",
      href: "/dashboard/profile",
      icon: <User className="size-4" />,
      premium: false,
    },
    {
      label: "Moja stránka",
      href: "/dashboard/page-builder",
      icon: <LayoutTemplate className="size-4" />,
      premium: true,
    },
    {
      label: "Rezervácie",
      href: "/dashboard/bookings",
      icon: <CalendarCheck className="size-4" />,
      premium: true,
    },
    {
      label: "Správy",
      href: "/dashboard/messages",
      icon: <MessageCircle className="size-4" />,
      premium: true,
    },
    {
      label: "Analytika",
      href: "/dashboard/analytics",
      icon: <TrendingUp className="size-4" />,
      premium: true,
    },
    {
      label: "Kalendár",
      href: "/dashboard/calendar",
      icon: <Calendar className="size-4" />,
      premium: true,
    },
    {
      label: "Marketing",
      href: "/dashboard/settings/marketing",
      icon: <Megaphone className="size-4" />,
      premium: true,
    },
    {
      label: "Špeciálna ponuka",
      href: "/dashboard/extras",
      icon: <Sparkles className="size-4" />,
      premium: true,
    },
    {
      label: "Šablóny",
      href: "/dashboard/contracts",
      icon: <FileText className="size-4" />,
      premium: true,
    },
    {
      label: "PDF zmluvy",
      href: "/dashboard/contracts/generate",
      icon: <FileSignature className="size-4" />,
      premium: true,
    },
    {
      label: "PDF faktúry",
      href: "/dashboard/invoices/generate",
      icon: <Receipt className="size-4" />,
      premium: true,
    },
  ];

  const isLiveBooth = Boolean(pathname?.includes("/live"));
  const isPageBuilderEdit = Boolean(
    pathname?.startsWith("/dashboard/page-builder/edit")
  );
  const blocked =
    !loading &&
    !!user &&
    !premium &&
    isPremiumDashboardPath(pathname ?? "");

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

  if (isLiveBooth || isPageBuilderEdit) {
    return (
      <div className="relative min-h-svh bg-background">
        {loading && !user ? (
          <div className="flex min-h-svh items-center justify-center">
            <p className="text-muted-foreground">Načítavam…</p>
          </div>
        ) : blocked ? (
          <div className="p-6 md:p-10">
            <PremiumUpgradeGate profile={profile} />
          </div>
        ) : (
          children
        )}
        {!isPageBuilderEdit ? (
          <NewMessageToaster
            chatBasePath="/dashboard/bookings"
            inboxHref="/dashboard/messages"
          />
        ) : null}
      </div>
    );
  }

  const sidebar = (
    <aside
      className={[
        "btv-app-sidebar fixed bottom-0 left-0 top-[76px] z-40 flex w-[17rem] shrink-0 flex-col p-4",
        "transition-transform duration-300 ease-out",
        "md:sticky md:top-0 md:h-svh md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      <div className="glass flex h-full w-full flex-col overflow-hidden rounded-3xl shadow-[0_24px_70px_-30px_oklch(0_0_0/0.8)]">
        <div className="flex h-[4.5rem] shrink-0 items-center border-b border-white/5 px-3">
          <Link href="/dashboard/bookings" className="inline-flex min-w-0 items-center">
            <BrandLogo size="md" />
          </Link>
        </div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
          {navItems.map((item) => {
            // Chat under /bookings/:id/chat belongs to Správy, not Rezervácie.
            const isChatRoute =
              pathname?.includes("/bookings/") && pathname.includes("/chat");
            let isActive = false;
            if (isChatRoute) {
              isActive = item.href === "/dashboard/messages";
            } else {
              const bestMatch = navItems
                .filter(
                  (i) =>
                    pathname === i.href || pathname?.startsWith(`${i.href}/`)
                )
                .sort((a, b) => b.href.length - a.href.length)[0];
              isActive = bestMatch?.href === item.href;
            }
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 font-medium text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_8px_24px_-12px_oklch(0.6_0.26_295/0.5)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-all duration-200",
                    isActive
                      ? "text-violet-300"
                      : "group-hover:scale-110 group-hover:text-violet-300"
                  )}
                >
                  {item.icon}
                </span>
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {item.premium && !premium ? (
                  <Lock className="size-3.5 shrink-0 text-zinc-600" />
                ) : null}
                {item.href === "/dashboard/messages" &&
                unreadMessages > 0 &&
                !isActive ? (
                  <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {unreadMessages > 9 ? "9+" : unreadMessages}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-white/5 px-4 py-4">
          <div className="mb-2 flex items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-500 text-[11px] font-bold text-white">
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

      <main className="relative min-w-0 flex-1">
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
          {onTrial && trialDays !== null ? (
            <div className="mb-6 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-3 text-sm text-violet-200">
              Premium trial: zostáva {trialDays}{" "}
              {trialDays === 1 ? "deň" : "dní"}. Potom potrebuješ Premium predplatné.
            </div>
          ) : null}
          {loading && !user ? (
            <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
              <div className="h-8 w-48 rounded-xl bg-white/5" />
              <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
              <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
              <div className="h-40 rounded-3xl bg-white/[0.03]" />
            </div>
          ) : blocked ? (
            <PremiumUpgradeGate profile={profile} />
          ) : (
            children
          )}
        </div>
      </main>
      <NewMessageToaster
        chatBasePath="/dashboard/bookings"
        inboxHref="/dashboard/messages"
      />
    </div>
  );
}
