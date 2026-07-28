"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentType,
  type MouseEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  DASHBOARD_SPA_LOADERS,
  isDashboardSpaPath,
} from "@/lib/dashboard-spa";
import { cn } from "@/lib/utils";

type SpaContextValue = {
  viewPath: string;
  navigating: boolean;
  navigate: (href: string) => void;
  outlet: ReactNode | null;
  useOutlet: boolean;
};

const SpaContext = createContext<SpaContextValue>({
  viewPath: "/dashboard/profile",
  navigating: false,
  navigate: () => {},
  outlet: null,
  useOutlet: false,
});

export function useDashboardSpa() {
  return useContext(SpaContext);
}

type CacheEntry = { Comp: ComponentType };

/**
 * Instant dashboard navigation: show the client page immediately, keep Next
 * router in sync via router.push (never raw history.pushState — Next patches
 * it and was resetting spa mode on the first click).
 */
export function DashboardSpaProvider({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "/dashboard/profile";
  const router = useRouter();
  const [viewPath, setViewPath] = useState(pathname);
  const [cache, setCache] = useState<Record<string, CacheEntry>>({});
  const [navigating, setNavigating] = useState(false);
  const [spaMode, setSpaMode] = useState(false);
  const [, startTransition] = useTransition();
  const preloaded = useRef(false);
  /** Path we intentionally SPA-navigated to — don't drop spaMode when it lands. */
  const pendingSpaPath = useRef<string | null>(null);

  const ensureLoaded = useCallback(async (path: string) => {
    const loader = DASHBOARD_SPA_LOADERS[path];
    if (!loader) return null;
    const mod = await loader();
    const Comp = mod.default;
    setCache((prev) => {
      if (prev[path]?.Comp === Comp) return prev;
      return { ...prev, [path]: { Comp } };
    });
    return Comp;
  }, []);

  useEffect(() => {
    if (preloaded.current) return;
    preloaded.current = true;
    const paths = Object.keys(DASHBOARD_SPA_LOADERS);
    let i = 0;
    const tick = () => {
      if (i >= paths.length) return;
      const path = paths[i++];
      void ensureLoaded(path).finally(() => {
        window.setTimeout(tick, 25);
      });
    };
    window.setTimeout(tick, 40);
  }, [ensureLoaded]);

  useEffect(() => {
    const path = pathname.split("?")[0] ?? pathname;

    // Our SPA click finished syncing — keep rendering the client page.
    if (pendingSpaPath.current && pendingSpaPath.current === path) {
      pendingSpaPath.current = null;
      startTransition(() => {
        setSpaMode(true);
        setViewPath(path);
        setNavigating(false);
      });
      void ensureLoaded(path);
      return;
    }

    // Nested route (chat / live / editor) or hard navigation.
    if (!isDashboardSpaPath(path)) {
      pendingSpaPath.current = null;
      startTransition(() => {
        setSpaMode(false);
        setViewPath(path);
        setNavigating(false);
      });
      return;
    }

    // Landed on a sidebar page via Next (refresh, external link, first paint).
    // Show RSC children — do not force spaMode (avoids remount flash).
    pendingSpaPath.current = null;
    startTransition(() => {
      setViewPath(path);
      setNavigating(false);
    });
    void ensureLoaded(path);
  }, [pathname, ensureLoaded, startTransition]);

  const navigate = useCallback(
    (href: string) => {
      const path = href.split("?")[0]?.split("#")[0] ?? href;
      if (!isDashboardSpaPath(path)) {
        router.push(href);
        return;
      }
      if (path === viewPath && spaMode && cache[path]) return;

      pendingSpaPath.current = path;
      const cached = Boolean(cache[path]);
      startTransition(() => {
        setSpaMode(true);
        setViewPath(path);
        setNavigating(!cached);
      });

      void ensureLoaded(path).then(() => setNavigating(false));
      router.push(href);
    },
    [viewPath, spaMode, cache, ensureLoaded, startTransition, router]
  );

  const useOutlet = spaMode && isDashboardSpaPath(viewPath);
  const Active = cache[viewPath]?.Comp;
  const outlet = useOutlet ? (
    Active ? (
      <Active />
    ) : (
      <div className="mx-auto max-w-4xl space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
        <div className="h-40 rounded-3xl bg-white/[0.03]" />
      </div>
    )
  ) : null;

  const value = useMemo(
    () => ({ viewPath, navigating, navigate, outlet, useOutlet }),
    [viewPath, navigating, navigate, outlet, useOutlet]
  );

  return (
    <SpaContext.Provider value={value}>{children}</SpaContext.Provider>
  );
}

export function DashboardSpaOutlet({ children }: { children: ReactNode }) {
  const { useOutlet, outlet } = useDashboardSpa();
  return <>{useOutlet ? outlet : children}</>;
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
  const { navigate, viewPath } = useDashboardSpa();
  const path = href.split("?")[0] ?? href;
  const spa = isDashboardSpaPath(path);

  if (!spa) {
    return (
      <Link
        href={href}
        prefetch={prefetch}
        className={className}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      className={className}
      aria-current={viewPath === path ? "page" : undefined}
      onClick={(e) => {
        if (
          e.metaKey ||
          e.ctrlKey ||
          e.shiftKey ||
          e.altKey ||
          e.button !== 0
        ) {
          return;
        }
        e.preventDefault();
        navigate(href);
        onClick?.(e);
      }}
    >
      {children}
    </a>
  );
}

export function DashboardNavProvider({ children }: { children: ReactNode }) {
  return <DashboardSpaProvider>{children}</DashboardSpaProvider>;
}

export function DashboardNavPendingShell({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={cn("relative min-w-0 flex-1")}>{children}</div>;
}

export function useDashboardNavPending() {
  return { pendingHref: null, isNavigating: false, markPending: () => {} };
}
