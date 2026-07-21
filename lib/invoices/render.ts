import {
  formatBookingPrice,
  getEffectiveBookingPrice,
  isInvoicePricePlaceholderKey,
} from "@/lib/booking-price";
import { resolveInvoiceFieldValue, type InvoiceResolveContext } from "./fields";
import type { InvoicePlaceholderRow } from "./types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves every placeholder:
 * - database_field → booking/computed (+ optional DJ override)
 * - manual_input → DJ values at generate time (cena/sumy fall back to booking price)
 * - client_input → values the client submits later
 */
export function resolveInvoiceValues(
  placeholders: InvoicePlaceholderRow[],
  ctx: InvoiceResolveContext,
  manualValues: Record<string, string> = {},
  clientValues: Record<string, string> = {}
): Record<string, string> {
  const bookingPrice = formatBookingPrice(
    getEffectiveBookingPrice(ctx.booking)
  );
  const resolved: Record<string, string> = {};
  for (const placeholder of placeholders) {
    if (placeholder.type === "database_field") {
      const auto = placeholder.source_field
        ? resolveInvoiceFieldValue(placeholder.source_field, ctx)
        : "";
      resolved[placeholder.placeholder_key] =
        auto || manualValues[placeholder.placeholder_key]?.trim() || "";
    } else if (placeholder.type === "client_input") {
      resolved[placeholder.placeholder_key] =
        clientValues[placeholder.placeholder_key]?.trim() ?? "";
    } else {
      const typed = manualValues[placeholder.placeholder_key]?.trim() ?? "";
      if (typed) {
        resolved[placeholder.placeholder_key] = typed;
      } else if (isInvoicePricePlaceholderKey(placeholder.placeholder_key)) {
        resolved[placeholder.placeholder_key] = bookingPrice;
      } else {
        resolved[placeholder.placeholder_key] = "";
      }
    }
  }
  return resolved;
}

const PLACEHOLDER_TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

export function renderInvoiceHtml(
  rawHtml: string,
  values: Record<string, string>
): string {
  return rawHtml.replace(PLACEHOLDER_TOKEN_RE, (match, key: string) => {
    const trimmed = key.trim();
    const value = values[trimmed];
    return value !== undefined ? escapeHtml(value) : match;
  });
}
