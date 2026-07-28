/**
 * In-memory caches that survive Next.js client navigations (layout remounts
 * within the same browser tab). Keeps dashboard switches feeling instant.
 */

type AuthUser = { id: string; email?: string };

type DashboardAuthCache = {
  user: AuthUser;
  profile: unknown;
  at: number;
};

type ClientAuthCache = {
  user: AuthUser;
  profile: unknown;
  at: number;
};

type BookingsCache = {
  djId: string;
  rows: unknown[];
  at: number;
};

type CatalogCache = {
  djs: unknown[];
  ratings: Record<string, { avg: number; count: number }>;
  at: number;
};

const AUTH_TTL_MS = 5 * 60 * 1000;
const BOOKINGS_TTL_MS = 3 * 60 * 1000;
const CATALOG_TTL_MS = 2 * 60 * 1000;

let dashboardAuth: DashboardAuthCache | null = null;
let clientAuth: ClientAuthCache | null = null;
let bookingsCache: BookingsCache | null = null;
let catalogCache: CatalogCache | null = null;

function fresh(at: number, ttl: number) {
  return Date.now() - at < ttl;
}

export function getDashboardAuthCache<TProfile = unknown>(): {
  user: AuthUser;
  profile: TProfile;
} | null {
  if (!dashboardAuth || !fresh(dashboardAuth.at, AUTH_TTL_MS)) return null;
  return {
    user: dashboardAuth.user,
    profile: dashboardAuth.profile as TProfile,
  };
}

export function setDashboardAuthCache(user: AuthUser, profile: unknown) {
  dashboardAuth = { user, profile, at: Date.now() };
}

export function clearDashboardAuthCache() {
  dashboardAuth = null;
  bookingsCache = null;
}

export function getClientAuthCache<TProfile = unknown>(): {
  user: AuthUser;
  profile: TProfile;
} | null {
  if (!clientAuth || !fresh(clientAuth.at, AUTH_TTL_MS)) return null;
  return {
    user: clientAuth.user,
    profile: clientAuth.profile as TProfile,
  };
}

export function setClientAuthCache(user: AuthUser, profile: unknown) {
  clientAuth = { user, profile, at: Date.now() };
}

export function clearClientAuthCache() {
  clientAuth = null;
}

export function getBookingsCache<T = unknown>(djId: string): T[] | null {
  if (!bookingsCache || bookingsCache.djId !== djId) return null;
  if (!fresh(bookingsCache.at, BOOKINGS_TTL_MS)) return null;
  return bookingsCache.rows as T[];
}

export function setBookingsCache(djId: string, rows: unknown[]) {
  bookingsCache = { djId, rows, at: Date.now() };
}

export function patchBookingsCache(
  djId: string,
  updater: (rows: unknown[]) => unknown[]
) {
  if (!bookingsCache || bookingsCache.djId !== djId) return;
  bookingsCache = {
    ...bookingsCache,
    rows: updater(bookingsCache.rows),
    at: Date.now(),
  };
}

export function clearBookingsCache() {
  bookingsCache = null;
}

export function getCatalogCache<TDj = unknown>(): {
  djs: TDj[];
  ratings: Record<string, { avg: number; count: number }>;
} | null {
  if (!catalogCache || !fresh(catalogCache.at, CATALOG_TTL_MS)) return null;
  return {
    djs: catalogCache.djs as TDj[],
    ratings: catalogCache.ratings,
  };
}

export function setCatalogCache(
  djs: unknown[],
  ratings: Record<string, { avg: number; count: number }>
) {
  catalogCache = { djs, ratings, at: Date.now() };
}
