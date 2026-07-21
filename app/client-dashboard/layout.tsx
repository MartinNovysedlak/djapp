"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarCheck,
  FileText,
  LogOut,
  Menu,
  MessageCircle,
  MessagesSquare,
  Star,
  User,
} from "lucide-react";
import {
  ClientUserProvider,
  useClientUser,
} from "@/components/ClientUserContext";
import { BrandLogo } from "@/components/BrandLogo";
import { countClientUnreadContracts } from "@/app/actions/contracts";
import { countClientUnreadInvoices } from "@/app/actions/invoices";
import { countUnreadBookingMessages } from "@/app/actions/booking-messages";
import { NewMessageToaster } from "@/components/chat/NewMessageToaster";
import { createClient } from "@/utils/supabase/client";
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
    match: (path: string) => {
      if (path === "/client-dashboard") return true;
      if (!path.startsWith("/client-dashboard/bookings")) return false;
      // Chat lives under bookings URL but belongs to Správy
      return !path.includes("/chat");
    },
  },
  {
    href: "/client-dashboard/messages",
    label: "Správy",
    icon: MessageCircle,
    match: (path: string) =>
      path.startsWith("/client-dashboard/messages") ||
      (path.startsWith("/client-dashboard/bookings/") &&
        path.includes("/chat")),
  },
  {
    href: "/client-dashboard/inquiries",
    label: "Dopyty",
    icon: MessagesSquare,
    match: (path: string) => path.startsWith("/client-dashboard/inquiries"),
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
  const router = useRouter();
  const { user, loading } = useClientUser();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadDocs, setUnreadDocs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadDocs(0);
      setUnreadMessages(0);
      return;
    }
    const [contracts, invoices, messages] = await Promise.all([
      countClientUnreadContracts(),
      countClientUnreadInvoices(),
      countUnreadBookingMessages(),
    ]);
    const count =
      (contracts.ok ? contracts.count : 0) +
      (invoices.ok ? invoices.count : 0);
    setUnreadDocs(count);
    setUnreadMessages(messages.ok ? messages.count : 0);
  }, [user]);

  useEffect(() => {
    void refreshUnread();
    const id = window.setInterval(() => void refreshUnread(), 10000);
    return () => window.clearInterval(id);
  }, [refreshUnread, pathname]);

  useEffect(() => {
    function onFocus() {
      void refreshUnread();
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshUnread]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  if (!loading && !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Presmerovanie na prihlásenie…</p>
      </div>
    );
  }

  const sidebar = (
    <aside
      className={cn(
        "fixed bottom-0 left-0 top-[76px] z-40 flex w-68 flex-col p-4",
        "transition-transform duration-300 ease-out md:relative md:top-0 md:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="glass flex h-full flex-col rounded-3xl shadow-[0_24px_70px_-30px_oklch(0_0_0/0.8)]">
        <div className="flex h-[4.5rem] items-center border-b border-white/5 px-3">
          <Link href="/" className="inline-flex min-w-0 items-center">
            <BrandLogo size="md" />
          </Link>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5">
          {NAV_ITEMS.map((item) => {
            const active = item.match(pathname ?? "");
            const Icon = item.icon;
            const showBadge =
              (item.href === "/client-dashboard/documents" &&
                unreadDocs > 0 &&
                !active) ||
              (item.href === "/client-dashboard/messages" &&
                unreadMessages > 0 &&
                !active);
            const badgeCount =
              item.href === "/client-dashboard/documents"
                ? unreadDocs
                : unreadMessages;

            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm transition-all duration-200",
                  active
                    ? "bg-gradient-to-r from-violet-500/20 to-fuchsia-500/10 font-medium text-white shadow-[inset_0_1px_0_oklch(1_0_0/0.08),0_8px_24px_-12px_oklch(0.6_0.26_295/0.5)]"
                    : "text-zinc-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-all duration-200",
                    active
                      ? "text-violet-300"
                      : "group-hover:scale-110 group-hover:text-violet-300"
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span className="flex-1">{item.label}</span>
                {showBadge ? (
                  <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                    {badgeCount > 9 ? "9+" : badgeCount}
                  </span>
                ) : null}
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
            type="button"
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
    <div className="relative flex min-h-[calc(100svh-76px)] bg-background md:min-h-svh">
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
            type="button"
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
            </div>
          ) : (
            children
          )}
        </div>
      </main>

      <NewMessageToaster
        chatBasePath="/client-dashboard/bookings"
        inboxHref="/client-dashboard/messages"
      />
    </div>
  );
}
