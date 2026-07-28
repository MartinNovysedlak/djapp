"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type NavPendingContextValue = {
  pendingHref: string | null;
  isNavigating: boolean;
  markPending: (href: string) => void;
};

const NavPendingContext = createContext<NavPendingContextValue>({
  pendingHref: null,
  isNavigating: false,
  markPending: () => {},
});

export function useDashboardNavPending() {
  return useContext(NavPendingContext);
}

/**
 * Instant click feedback for dashboard soft-nav — shows skeleton immediately
 * while Next.js still fetches the RSC payload from Vercel.
 */
export function DashboardNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const markPending = useCallback(
    (href: string) => {
      const path = href.split("?")[0]?.split("#")[0] ?? href;
      if (path === pathname) return;
      startTransition(() => setPendingHref(path));
    },
    [pathname, startTransition]
  );

  const value = useMemo(
    () => ({
      pendingHref,
      isNavigating: Boolean(pendingHref && pendingHref !== pathname),
      markPending,
    }),
    [pendingHref, pathname, markPending]
  );

  return (
    <NavPendingContext.Provider value={value}>
      {children}
    </NavPendingContext.Provider>
  );
}

export function DashboardNavLink({
  href,
  className,
  children,
  onClick,
  prefetch = true,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  prefetch?: boolean;
}) {
  const { markPending } = useDashboardNavPending();

  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={className}
      onClick={(e) => {
        markPending(href);
        onClick?.(e);
      }}
    >
      {children}
    </Link>
  );
}

export function DashboardNavPendingShell({
  children,
}: {
  children: ReactNode;
}) {
  const { isNavigating } = useDashboardNavPending();

  return (
    <div className={cn("relative min-w-0 flex-1")}>
      {children}
      {isNavigating ? (
        <div
          className="absolute inset-0 z-20 bg-background/70 p-4 backdrop-blur-[2px] md:p-8 lg:p-10"
          aria-busy
          aria-live="polite"
        >
          <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
            <div className="h-8 w-48 rounded-xl bg-white/5" />
            <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
            <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
            <div className="h-40 rounded-3xl bg-white/[0.03]" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
