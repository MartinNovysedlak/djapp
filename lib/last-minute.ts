export type LastMinuteOffer = {
  id: string;
  dj_id: string;
  event_date: string;
  discounted_price: number;
  original_price: number | null;
  book_within_days: number;
  expires_at: string;
  note: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

/** Public catalog summary — nearest active deal per DJ. */
export type LastMinuteCatalogHit = {
  dj_id: string;
  offer_id: string;
  event_date: string;
  discounted_price: number;
  original_price: number | null;
  expires_at: string;
  offer_count: number;
};

export function addDaysIso(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export function todayIsoLocal(): string {
  const n = new Date();
  const yy = n.getFullYear();
  const mm = String(n.getMonth() + 1).padStart(2, "0");
  const dd = String(n.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** Offer ends on min(event_date, today + book_within_days). */
export function computeOfferExpiresAt(
  eventDate: string,
  bookWithinDays: number,
  today = todayIsoLocal()
): string {
  const soft = addDaysIso(today, bookWithinDays);
  return soft < eventDate ? soft : eventDate;
}

export function formatLastMinutePrice(price: number) {
  return `${Number(price).toLocaleString("sk-SK", {
    maximumFractionDigits: 0,
  })} €`;
}

export function isOfferLive(
  offer: Pick<LastMinuteOffer, "is_active" | "event_date" | "expires_at">,
  today = todayIsoLocal()
) {
  return (
    offer.is_active &&
    offer.event_date >= today &&
    offer.expires_at >= today
  );
}
