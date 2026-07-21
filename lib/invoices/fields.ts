import { formatEventTypeLabel } from "@/lib/event-types";
import {
  formatBookingPrice,
  getEffectiveBookingPrice,
} from "@/lib/booking-price";
import type { InvoiceBookingData, InvoiceComputedData } from "./types";

export type InvoiceFieldOption = {
  field: string;
  label: string;
};

export type InvoiceFieldGroup = {
  group: string;
  options: InvoiceFieldOption[];
};

export type InvoiceResolveContext = {
  booking: InvoiceBookingData;
  computed: InvoiceComputedData;
};

/**
 * Auto fields = things that change per invoice / booking.
 * Supplier constants (IČO, IBAN, adresa…) go hard-coded into the Word template —
 * they are NOT placeholders.
 */
export const INVOICE_SOURCE_FIELDS: InvoiceFieldGroup[] = [
  {
    group: "Odberateľ (z rezervácie)",
    options: [
      { field: "client_name", label: "Meno / názov odberateľa" },
      { field: "client_email", label: "E-mail odberateľa" },
    ],
  },
  {
    group: "Akcia",
    options: [
      { field: "event_type_label", label: "Typ akcie" },
      { field: "event_date", label: "Dátum akcie" },
      { field: "event_location", label: "Miesto konania" },
      { field: "price", label: "Cena z rezervácie" },
    ],
  },
  {
    group: "Faktúra (auto)",
    options: [
      { field: "invoice_number", label: "Číslo faktúry" },
      { field: "issue_date", label: "Dátum vystavenia" },
      { field: "due_date", label: "Dátum splatnosti" },
      { field: "variable_symbol", label: "Variabilný symbol" },
      { field: "currency", label: "Mena" },
      { field: "today", label: "Dnešný dátum" },
    ],
  },
];

const AUTO_FIELD_LABELS = new Map(
  INVOICE_SOURCE_FIELDS.flatMap((g) =>
    g.options.map((o) => [o.field, o.label] as const)
  )
);

export function getAutoFieldLabel(field: string): string | null {
  return AUTO_FIELD_LABELS.get(field) ?? null;
}

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

/** Resolves a single catalog field key for an invoice context. */
export function resolveInvoiceFieldValue(
  field: string,
  ctx: InvoiceResolveContext
): string {
  const { booking, computed } = ctx;
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
    case "event_location":
      return booking.event_location ?? "";
    case "price":
    case "cena":
    case "celkova_suma":
    case "jednotkova_cena":
      return formatBookingPrice(getEffectiveBookingPrice(booking));
    case "invoice_number":
      return computed.invoiceNumber;
    case "issue_date":
      return formatDateSk(computed.issueDate);
    case "due_date":
      return formatDateSk(computed.dueDate);
    case "variable_symbol":
      return computed.variableSymbol;
    case "currency":
      return "EUR";
    case "today":
      return formatDateSk(new Date().toISOString().slice(0, 10));
    default:
      return "";
  }
}
