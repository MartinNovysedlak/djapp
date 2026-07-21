import {
  formatBookingPrice,
  getEffectiveBookingPrice,
  isContractPricePlaceholderKey,
} from "@/lib/booking-price";
import { resolveFieldValue } from "./fields";
import type {
  ContractBookingData,
  ContractDjProfileData,
  ContractPlaceholderRow,
} from "./types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Resolves every placeholder row to a display string:
 * - `database_field` → booking/DJ profile (`source_field`), with optional DJ override
 * - `manual_input` → DJ values from the generate form (price/cena falls back to booking)
 * - `client_input` → values the client submits later (or blank until then)
 */
export function resolveContractValues(
  placeholders: ContractPlaceholderRow[],
  booking: ContractBookingData,
  djProfile: ContractDjProfileData,
  manualValues: Record<string, string> = {},
  clientValues: Record<string, string> = {}
): Record<string, string> {
  const bookingPrice = formatBookingPrice(getEffectiveBookingPrice(booking));
  const resolved: Record<string, string> = {};
  for (const placeholder of placeholders) {
    if (placeholder.type === "database_field") {
      const auto = placeholder.source_field
        ? resolveFieldValue(placeholder.source_field, booking, djProfile)
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
      } else if (isContractPricePlaceholderKey(placeholder.placeholder_key)) {
        resolved[placeholder.placeholder_key] = bookingPrice;
      } else {
        resolved[placeholder.placeholder_key] = "";
      }
    }
  }
  return resolved;
}

const PLACEHOLDER_TOKEN_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Replaces every `{{key}}` token in the template HTML with its resolved (HTML-escaped) value. */
export function renderContractHtml(
  rawHtml: string,
  values: Record<string, string>
): string {
  return rawHtml.replace(PLACEHOLDER_TOKEN_RE, (match, key: string) => {
    const trimmed = key.trim();
    const value = values[trimmed];
    return value !== undefined ? escapeHtml(value) : match;
  });
}
