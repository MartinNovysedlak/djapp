/** Agreed / offered booking amount for UI + PDF prefill. */
export function getEffectiveBookingPrice(booking: {
  price?: number | null;
  dj_offer_price?: number | null;
  base_price?: number | null;
}): number | null {
  for (const raw of [booking.price, booking.dj_offer_price, booking.base_price]) {
    if (raw == null) continue;
    const n = Number(raw);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

export function formatBookingPrice(price: number | null | undefined): string {
  if (price == null || !Number.isFinite(Number(price))) return "";
  return `${Number(price).toLocaleString("sk-SK", {
    maximumFractionDigits: 2,
  })} €`;
}

/** Numeric-only string for form inputs (still locale-aware). */
export function formatBookingPriceInput(
  price: number | null | undefined
): string {
  if (price == null || !Number.isFinite(Number(price))) return "";
  return Number(price).toLocaleString("sk-SK", { maximumFractionDigits: 2 });
}

const CONTRACT_PRICE_KEYS = new Set(["cena", "price"]);

const INVOICE_PRICE_KEYS = new Set([
  "cena",
  "price",
  "celkova_suma",
  "jednotkova_cena",
]);

export function isContractPricePlaceholderKey(key: string): boolean {
  return CONTRACT_PRICE_KEYS.has(key.trim().toLowerCase());
}

export function isInvoicePricePlaceholderKey(key: string): boolean {
  return INVOICE_PRICE_KEYS.has(key.trim().toLowerCase());
}
