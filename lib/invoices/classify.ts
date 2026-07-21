import type { InvoicePlaceholderType } from "./types";

/**
 * Invoice placeholder roles:
 * - DJ fills at generate time (amounts, service line, payment method…)
 * - Client fills (or has on profile) — buyer/odberateľ details
 * - Auto = booking/invoice number dates (handled via database_field)
 */

export type InvoiceManualPaletteItem = {
  key: string;
  label: string;
  /** Default type when DJ inserts this chip into the template. */
  defaultType: Extract<InvoicePlaceholderType, "manual_input" | "client_input">;
  /** Optional client fields never block PDF / pending_fill. */
  optional?: boolean;
};

/** DJ fills these when generating the invoice. */
export const INVOICE_DJ_MANUAL_FIELDS: InvoiceManualPaletteItem[] = [
  { key: "cena", label: "Cena", defaultType: "manual_input" },
  { key: "celkova_suma", label: "Celková suma k úhrade", defaultType: "manual_input" },
  { key: "cena_bez_dph", label: "Suma bez DPH", defaultType: "manual_input" },
  { key: "sadzba_dph", label: "Sadzba DPH", defaultType: "manual_input" },
  { key: "suma_dph", label: "Suma DPH", defaultType: "manual_input" },
  { key: "jednotkova_cena", label: "Jednotková cena", defaultType: "manual_input" },
  { key: "nazov_sluzby", label: "Popis fakturovanej služby", defaultType: "manual_input" },
  { key: "mnozstvo", label: "Množstvo", defaultType: "manual_input" },
  { key: "jednotka", label: "Jednotka", defaultType: "manual_input" },
  { key: "forma_uhrady", label: "Forma úhrady", defaultType: "manual_input" },
  { key: "poznamka", label: "Poznámka", defaultType: "manual_input" },
];

/** Customer (odberateľ) fills these — usually from profile or fill form. */
export const INVOICE_CLIENT_FIELDS: InvoiceManualPaletteItem[] = [
  { key: "odberatel_nazov", label: "Názov / meno odberateľa", defaultType: "client_input" },
  { key: "odberatel_adresa", label: "Adresa odberateľa", defaultType: "client_input" },
  { key: "odberatel_mesto", label: "Mesto odberateľa", defaultType: "client_input" },
  { key: "odberatel_psc", label: "PSČ odberateľa", defaultType: "client_input" },
  { key: "odberatel_krajina", label: "Krajina odberateľa", defaultType: "client_input" },
  { key: "odberatel_ico", label: "IČO odberateľa", defaultType: "client_input" },
  { key: "odberatel_dic", label: "DIČ odberateľa", defaultType: "client_input" },
  { key: "odberatel_ic_dph", label: "IČ DPH odberateľa", defaultType: "client_input" },
  {
    key: "odberatel_telefon",
    label: "Telefón odberateľa",
    defaultType: "client_input",
    optional: true,
  },
];

const CLIENT_KEY_SET = new Set(
  INVOICE_CLIENT_FIELDS.map((f) => f.key.toLowerCase())
);
const DJ_KEY_SET = new Set(
  INVOICE_DJ_MANUAL_FIELDS.map((f) => f.key.toLowerCase())
);

/** Extra aliases that should always default to client fill. */
const CLIENT_KEY_ALIASES = new Set([
  "adresa_odberatela",
  "odberatel_adresa_ulica",
  "client_address",
  "client_street",
  "ico_odberatela",
  "client_ico",
  "dic_odberatela",
  "client_dic",
  "ic_dph_odberatela",
  "client_ic_dph",
  "nazov_odberatela",
  "client_legal_name",
  "firma",
  "client_city",
  "client_postal_code",
  "client_country",
  "telefon_odberatela",
  "odberatel_tel",
  "client_phone_input",
  "client_phone",
]);

/** Keys that only apply to právnická osoba (skip for fyzická). */
export const COMPANY_ONLY_PLACEHOLDER_KEYS = new Set([
  "odberatel_ico",
  "ico_odberatela",
  "client_ico",
  "odberatel_dic",
  "dic_odberatela",
  "client_dic",
  "odberatel_ic_dph",
  "ic_dph_odberatela",
  "client_ic_dph",
]);

/** Never block PDF / pending_fill — empty stays empty. */
export const OPTIONAL_CLIENT_PLACEHOLDER_KEYS = new Set([
  "odberatel_telefon",
  "telefon_odberatela",
  "odberatel_tel",
  "client_phone_input",
  "client_phone",
  "odberatel_email",
  "email_odberatela",
]);

/**
 * Auto/database fields that must NOT ask the DJ when empty —
 * they belong to the customer (optional fill / profile).
 */
export const CLIENT_OWNED_SOURCE_FIELDS = new Set([
  "client_phone",
]);

export function isLikelyClientInvoiceKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  if (CLIENT_KEY_SET.has(k) || CLIENT_KEY_ALIASES.has(k)) return true;
  if (DJ_KEY_SET.has(k)) return false;
  return (
    k.includes("odberatel") ||
    k.startsWith("client_") ||
    k.includes("odberatela")
  );
}

export function defaultTypeForInvoiceKey(
  key: string
): Extract<InvoicePlaceholderType, "manual_input" | "client_input"> {
  return isLikelyClientInvoiceKey(key) ? "client_input" : "manual_input";
}

export function isCompanyOnlyPlaceholderKey(key: string): boolean {
  return COMPANY_ONLY_PLACEHOLDER_KEYS.has(key.trim().toLowerCase());
}

export function isOptionalClientPlaceholderKey(key: string): boolean {
  const k = key.trim().toLowerCase();
  if (OPTIONAL_CLIENT_PLACEHOLDER_KEYS.has(k)) return true;
  return (
    k.includes("telefon") ||
    k.includes("_tel") ||
    k === "client_phone" ||
    (k.endsWith("phone") && k.includes("client"))
  );
}

/** Should this auto source_field be remapped to client_input instead of DJ gap? */
export function isClientOwnedSourceField(sourceField: string | null): boolean {
  if (!sourceField) return false;
  return CLIENT_OWNED_SOURCE_FIELDS.has(sourceField.trim().toLowerCase());
}

/** Heal buyer/phone fields wrongly saved as database_field or manual_input. */
export function normalizeInvoicePlaceholderType<
  T extends {
    placeholder_key: string;
    type: InvoicePlaceholderType;
    source_field: string | null;
    label?: string | null;
  },
>(p: T): T {
  if (
    p.type === "database_field" &&
    (isClientOwnedSourceField(p.source_field) ||
      isOptionalClientPlaceholderKey(p.placeholder_key))
  ) {
    return {
      ...p,
      type: "client_input" as T["type"],
      source_field: null,
      label: p.label?.trim() || "Telefón odberateľa",
    };
  }
  if (
    (p.type === "manual_input" || p.type === "database_field") &&
    defaultTypeForInvoiceKey(p.placeholder_key) === "client_input" &&
    isLikelyClientInvoiceKey(p.placeholder_key)
  ) {
    // Don't remapped true auto fields like client_name / client_email.
    if (
      p.type === "database_field" &&
      (p.source_field === "client_name" || p.source_field === "client_email")
    ) {
      return p;
    }
    if (p.type === "database_field" && !isClientOwnedSourceField(p.source_field)) {
      return p;
    }
    return {
      ...p,
      type: "client_input" as T["type"],
      source_field: null,
    };
  }
  return p;
}
