import { formatEventTypeLabel } from "@/lib/event-types";
import {
  formatBookingPrice,
  getEffectiveBookingPrice,
} from "@/lib/booking-price";
import type { ContractBookingData, ContractDjProfileData } from "./types";

export type ContractFieldOption = {
  field: string;
  label: string;
};

export type ContractFieldGroup = {
  group: string;
  options: ContractFieldOption[];
};

/** Catalog of DB-backed values, grouped for the mapping dropdown / field palette. */
export const CONTRACT_SOURCE_FIELDS: ContractFieldGroup[] = [
  {
    group: "Rezervácia",
    options: [
      { field: "client_name", label: "Meno klienta" },
      { field: "client_email", label: "E-mail klienta" },
      { field: "client_phone", label: "Telefón klienta" },
      { field: "event_type_label", label: "Typ akcie" },
      { field: "event_date", label: "Dátum akcie (od)" },
      { field: "end_date", label: "Dátum akcie (do)" },
      { field: "start_time", label: "Čas od" },
      { field: "end_time", label: "Čas do" },
      { field: "event_location", label: "Miesto konania" },
      { field: "price", label: "Cena" },
      { field: "message", label: "Poznámka klienta" },
    ],
  },
  {
    group: "Umelec / Profil",
    options: [
      { field: "dj_full_name", label: "Umelecké meno" },
      { field: "dj_real_name", label: "Skutočné meno" },
      { field: "dj_phone", label: "Telefón umelca" },
    ],
  },
  {
    group: "Ostatné",
    options: [{ field: "today", label: "Dnešný dátum (deň podpisu)" }],
  },
];

const AUTO_FIELD_LABELS = new Map(
  CONTRACT_SOURCE_FIELDS.flatMap((g) =>
    g.options.map((o) => [o.field, o.label] as const)
  )
);

/**
 * Slovak display names for well-known placeholder keys — including legacy keys
 * like `price` / `Price` that older templates still carry after we moved Cena
 * out of the automatic field catalog.
 */
const KNOWN_KEY_LABELS: Record<string, string> = {
  price: "Cena",
  cena: "Cena",
  zaloha: "Výška zálohy",
  vyska_zalohy: "Výška zálohy",
};

/** Human label for an auto-fill field key (e.g. `client_name` → `Meno klienta`). */
export function getAutoFieldLabel(field: string): string | null {
  return AUTO_FIELD_LABELS.get(field) ?? null;
}

/**
 * Label shown to the DJ in the generate form / editor chips.
 * Prefer the DJ-chosen `label`, then auto-field catalog, then known Slovak
 * aliases — never raw English keys like `price`.
 */
export function getPlaceholderDisplayLabel(placeholder: {
  placeholder_key: string;
  label?: string | null;
  source_field?: string | null;
}): string {
  const custom = placeholder.label?.trim();
  if (custom) return custom;

  if (placeholder.source_field) {
    const fromSource = getAutoFieldLabel(placeholder.source_field);
    if (fromSource) return fromSource;
  }

  const key = placeholder.placeholder_key.trim();
  const known = KNOWN_KEY_LABELS[key.toLowerCase()];
  if (known) return known;

  const asAuto = getAutoFieldLabel(key);
  if (asAuto) return asAuto;

  return key;
}

function formatDateSk(iso: string | null) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** Resolves a single catalog field key to its display value for a booking + profile. */
export function resolveFieldValue(
  field: string,
  booking: ContractBookingData,
  djProfile: ContractDjProfileData
): string {
  switch (field) {
    case "client_name":
      return booking.client_name ?? "";
    case "client_email":
      return booking.client_email ?? "";
    case "client_phone":
      return booking.client_phone ?? "";
    case "event_type_label":
      return formatEventTypeLabel(booking.event_type);
    case "event_date":
      return formatDateSk(booking.event_date);
    case "end_date":
      return formatDateSk(booking.end_date ?? booking.event_date);
    case "start_time":
      return booking.start_time?.slice(0, 5) ?? "";
    case "end_time":
      return booking.end_time?.slice(0, 5) ?? "";
    case "event_location":
      return booking.event_location ?? "";
    case "price":
    case "cena":
      return formatBookingPrice(getEffectiveBookingPrice(booking));
    case "message":
      return booking.message ?? "";
    case "dj_full_name":
      return djProfile.full_name ?? "";
    case "dj_real_name":
      return (
        [djProfile.real_first_name, djProfile.real_last_name]
          .filter(Boolean)
          .join(" ") ||
        djProfile.full_name ||
        ""
      );
    case "dj_phone":
      return djProfile.phone ?? "";
    case "today":
      return formatDateSk(new Date().toISOString().slice(0, 10));
    default:
      return "";
  }
}
