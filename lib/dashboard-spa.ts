import type { ComponentType } from "react";

/**
 * Dashboard routes rendered fully on the client (no Vercel RSC wait on click).
 * Nested routes (chat, live, editors) stay on normal Next navigation.
 */

export const DASHBOARD_SPA_LOADERS: Record<
  string,
  () => Promise<{ default: ComponentType }>
> = {
  "/dashboard/profile": () => import("@/app/dashboard/profile/page"),
  "/dashboard/bookings": () => import("@/app/dashboard/bookings/page"),
  "/dashboard/messages": () => import("@/app/dashboard/messages/page"),
  "/dashboard/calendar": () => import("@/app/dashboard/calendar/page"),
  "/dashboard/page-builder": () => import("@/app/dashboard/page-builder/page"),
  "/dashboard/analytics": () => import("@/app/dashboard/analytics/page"),
  "/dashboard/settings/marketing": () =>
    import("@/app/dashboard/settings/marketing/page"),
  "/dashboard/extras": () => import("@/app/dashboard/extras/page"),
  "/dashboard/program-templates": () =>
    import("@/app/dashboard/program-templates/page"),
  "/dashboard/requirement-templates": () =>
    import("@/app/dashboard/requirement-templates/page"),
  "/dashboard/contracts": () => import("@/app/dashboard/contracts/page"),
  "/dashboard/contracts/generate": () =>
    import("@/app/dashboard/contracts/generate/page"),
  "/dashboard/contracts/tutorial": () =>
    import("@/app/dashboard/contracts/tutorial/page"),
  "/dashboard/invoices/generate": () =>
    import("@/app/dashboard/invoices/generate/page"),
  "/dashboard/invoices/billing": () =>
    import("@/app/dashboard/invoices/billing/page"),
};

export function isDashboardSpaPath(pathname: string): boolean {
  const path = pathname.split("?")[0]?.split("#")[0] ?? pathname;
  return Object.prototype.hasOwnProperty.call(DASHBOARD_SPA_LOADERS, path);
}

export const DASHBOARD_SPA_PATHS = Object.keys(DASHBOARD_SPA_LOADERS);
