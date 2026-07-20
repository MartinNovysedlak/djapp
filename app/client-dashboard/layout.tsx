"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  LayoutDashboard,
  Star,
  User,
} from "lucide-react";
import {
  ClientUserProvider,
  useClientUser,
} from "@/components/ClientUserContext";
import { countClientUnreadContracts } from "@/app/actions/contracts";
import { countClientUnreadInvoices } from "@/app/actions/invoices";
import { cn } from "@/lib/utils";

export default function ClientDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClientUserProvider>
      <ClientDashboardShell>{children}</ClientDashboardShell>
    </ClientUserProvider>
  );
}

const NAV_ITEMS = [
  {
    href: "/client-dashboard",
    label: "Rezervácie",
    icon: CalendarCheck,
    match: (path: string) => path === "/client-dashboard",
  },
  {
    href: "/client-dashboard/documents",
    label: "Dokumenty",
    icon: FileText,
    match: (path: string) => path.startsWith("/client-dashboard/documents"),
  },
  {
    href: "/client-dashboard/reviews",
    label: "Recenzie",
    icon: Star,
    match: (path: string) => path.startsWith("/client-dashboard/reviews"),
  },
  {
    href: "/client-dashboard/profile",
    label: "Profil",
    icon: User,
    match: (path: string) => path.startsWith("/client-dashboard/profile"),
  },
] as const;

function ClientDashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading } = useClientUser();
  const [unreadDocs, setUnreadDocs] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadDocs(0);
      return;
    }
    const [contracts, invoices] = await Promise.all([
      countClientUnreadContracts(),
      countClientUnreadInvoices(),
    ]);
    const count =
      (contracts.ok ? contracts.count : 0) +
      (invoices.ok ? invoices.count : 0);
    setUnreadDocs(count);
  }, [user]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread, pathname]);

  useEffect(() => {
    function onFocus() {
      void refreshUnread();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  if (!loading && !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-background">
        <p className="text-muted-foreground">Presmerovanie na prihlásenie…</p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[calc(100svh-76px)] flex-col bg-background">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_70%_-10%,oklch(0.5_0.25_295/0.14),transparent_65%)]"
      />

      <div className="relative z-10 px-4 pb-3 pt-1">
        <div className="mx-auto max-w-3xl">
          <div className="mb-3 flex items-center gap-2 px-1">
            <LayoutDashboard className="size-3.5 text-zinc-500" />
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
              Dashboard
            </p>
          </div>

          <nav className="glass flex gap-1 overflow-x-auto rounded-2xl p-1.5 scrollbar-none">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              const Icon = item.icon;
              const showBadge =
                item.href === "/client-dashboard/documents" &&
                unreadDocs > 0 &&
                !active;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  className={cn(
                    "flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/8 font-medium text-white"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  <Icon className="size-3.5" />
                  {item.label}
                  {showBadge ? (
                    <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {unreadDocs > 9 ? "9+" : unreadDocs}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      <main className="relative z-10 flex-1 px-4 pb-24 md:px-8">
        {loading && !user ? (
          <div className="mx-auto max-w-3xl space-y-4 animate-pulse pt-6">
            <div className="h-8 w-40 rounded-xl bg-white/5" />
            <div className="h-32 rounded-3xl bg-white/[0.03]" />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
