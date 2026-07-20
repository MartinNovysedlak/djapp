/**
 * Maps common placeholder keys / labels used on invoices & contracts
 * to columns on `client_billing_profiles`.
 */
import {
  isCompanyOnlyPlaceholderKey,
  isOptionalClientPlaceholderKey,
} from "@/lib/invoices/classify";

export type ClientPersonType = "individual" | "company";

export type ClientBillingProfileRow = {
  client_id: string;
  person_type: ClientPersonType;
  legal_name: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  is_vat_payer: boolean;
  company_note: string | null;
  created_at: string;
  updated_at: string;
};

export type ClientBillingFieldKey =
  | "legal_name"
  | "street_address"
  | "city"
  | "postal_code"
  | "country"
  | "ico"
  | "dic"
  | "ic_dph"
  | "company_note";

/** Placeholder key → billing column (for save-prompt + prefill). */
export const CLIENT_BILLING_KEY_MAP: Record<string, ClientBillingFieldKey> = {
  odberatel_adresa: "street_address",
  odberatel_adresa_ulica: "street_address",
  adresa_odberatela: "street_address",
  client_address: "street_address",
  client_street: "street_address",
  odberatel_ico: "ico",
  ico_odberatela: "ico",
  client_ico: "ico",
  odberatel_dic: "dic",
  dic_odberatela: "dic",
  client_dic: "dic",
  odberatel_ic_dph: "ic_dph",
  ic_dph_odberatela: "ic_dph",
  client_ic_dph: "ic_dph",
  odberatel_nazov: "legal_name",
  nazov_odberatela: "legal_name",
  client_legal_name: "legal_name",
  firma: "legal_name",
  odberatel_mesto: "city",
  client_city: "city",
  odberatel_psc: "postal_code",
  client_postal_code: "postal_code",
  odberatel_krajina: "country",
  client_country: "country",
};

export const CLIENT_BILLING_FIELD_LABELS: Record<ClientBillingFieldKey, string> = {
  legal_name: "Názov / meno odberateľa",
  street_address: "Adresa (ulica)",
  city: "Mesto",
  postal_code: "PSČ",
  country: "Krajina",
  ico: "IČO",
  dic: "DIČ",
  ic_dph: "IČ DPH",
  company_note: "Poznámka",
};

export const COMPANY_ONLY_BILLING_FIELDS = new Set<ClientBillingFieldKey>([
  "ico",
  "dic",
  "ic_dph",
]);

const PHONE_PLACEHOLDER_KEYS = new Set([
  "odberatel_telefon",
  "telefon_odberatela",
  "odberatel_tel",
  "client_phone_input",
  "client_phone",
]);

/** Extract saveable billing values from filled placeholder key→value map. */
export function extractBillingFromValues(
  values: Record<string, string>
): Partial<Record<ClientBillingFieldKey, string>> {
  const out: Partial<Record<ClientBillingFieldKey, string>> = {};
  for (const [key, raw] of Object.entries(values)) {
    const value = raw?.trim();
    if (!value || value === "—") continue;
    const field = CLIENT_BILLING_KEY_MAP[key.toLowerCase()];
    if (field) out[field] = value;
  }
  return out;
}

export type PrefillExtras = {
  phone?: string | null;
  clientName?: string | null;
};

/** Prefill client_input keys from a billing profile (+ optional booking extras). */
export function prefillFromBilling(
  placeholderKeys: string[],
  billing: ClientBillingProfileRow | null,
  extras: PrefillExtras = {}
): Record<string, string> {
  const out: Record<string, string> = {};
  const isIndividual =
    (billing?.person_type ?? "individual") === "individual";
  const phone = extras.phone?.trim() || "";
  const clientName = extras.clientName?.trim() || "";

  for (const key of placeholderKeys) {
    const lower = key.toLowerCase();
    const field = CLIENT_BILLING_KEY_MAP[lower];

    if (
      PHONE_PLACEHOLDER_KEYS.has(lower) ||
      (isOptionalClientPlaceholderKey(key) &&
        (lower.includes("telefon") ||
          lower.includes("phone") ||
          lower.includes("_tel")))
    ) {
      if (phone) out[key] = phone;
      continue;
    }

    if (!field) {
      if (
        (lower.includes("nazov") || lower.includes("meno") || lower === "firma") &&
        clientName
      ) {
        out[key] = clientName;
      }
      continue;
    }

    if (isIndividual && COMPANY_ONLY_BILLING_FIELDS.has(field)) {
      out[key] = "—";
      continue;
    }

    const value = billing?.[field];
    if (typeof value === "string" && value.trim()) {
      out[key] = value.trim();
    } else if (field === "legal_name" && clientName) {
      out[key] = clientName;
    }
  }
  return out;
}

/**
 * Keys that still need the client to type a value before PDF can be finished.
 * Optional fields (phone…) never appear here — empty stays empty.
 */
export function missingClientFillKeys(
  clientPlaceholderKeys: string[],
  clientValues: Record<string, string>,
  personType: ClientPersonType = "individual"
): string[] {
  return clientPlaceholderKeys.filter((key) => {
    if (isOptionalClientPlaceholderKey(key)) return false;

    const mapped = CLIENT_BILLING_KEY_MAP[key.toLowerCase()];
    if (
      personType === "individual" &&
      mapped &&
      COMPANY_ONLY_BILLING_FIELDS.has(mapped)
    ) {
      return false;
    }
    if (personType === "individual" && isCompanyOnlyPlaceholderKey(key)) {
      return false;
    }
    const v = clientValues[key]?.trim();
    return !v;
  });
}

/** Optional empty keys — may be offered on the fill form, never required. */
export function optionalEmptyClientKeys(
  clientPlaceholderKeys: string[],
  clientValues: Record<string, string>
): string[] {
  return clientPlaceholderKeys.filter((key) => {
    if (!isOptionalClientPlaceholderKey(key)) return false;
    return !clientValues[key]?.trim();
  });
}
