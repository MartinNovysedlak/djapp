/** Query keys for restoring DJ bookings list scroll/expand state. */
export const BOOKINGS_TAB_PARAM = "tab";
export const BOOKINGS_OPEN_PARAM = "open";
/** Where Live / chat should return (same values as BookingsTab). */
export const BOOKINGS_FROM_PARAM = "from";

export type BookingsTab = "new" | "confirmed" | "history";

export function isBookingsTab(value: string | null | undefined): value is BookingsTab {
  return value === "new" || value === "confirmed" || value === "history";
}

/** Deep-link back to a specific booking card on the DJ bookings page. */
export function bookingsReturnHref(opts: {
  bookingId: string;
  tab?: BookingsTab;
}): string {
  const params = new URLSearchParams();
  params.set(BOOKINGS_TAB_PARAM, opts.tab ?? "confirmed");
  params.set(BOOKINGS_OPEN_PARAM, opts.bookingId);
  return `/dashboard/bookings?${params.toString()}`;
}

export function liveBoothHref(bookingId: string, from?: BookingsTab): string {
  const base = `/dashboard/bookings/${bookingId}/live`;
  if (!from) return base;
  const params = new URLSearchParams();
  params.set(BOOKINGS_FROM_PARAM, from);
  return `${base}?${params.toString()}`;
}

export function readBookingsQueryFromLocation(): {
  tab: BookingsTab;
  open: string | null;
} {
  if (typeof window === "undefined") {
    return { tab: "new", open: null };
  }
  const sp = new URLSearchParams(window.location.search);
  const tabRaw = sp.get(BOOKINGS_TAB_PARAM);
  return {
    tab: isBookingsTab(tabRaw) ? tabRaw : "new",
    open: sp.get(BOOKINGS_OPEN_PARAM),
  };
}

export function writeBookingsQuery(tab: BookingsTab, open: string | null) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  params.set(BOOKINGS_TAB_PARAM, tab);
  if (open) params.set(BOOKINGS_OPEN_PARAM, open);
  const q = params.toString();
  const url = `/dashboard/bookings?${q}`;
  window.history.replaceState(null, "", url);
}
