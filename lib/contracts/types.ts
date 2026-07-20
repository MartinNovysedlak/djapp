export type ContractPlaceholderType =
  | "database_field"
  | "manual_input"
  | "client_input";

/** Lifecycle of a generated PDF in the DJ ↔ client inbox. */
export type GeneratedContractStatus = "complete" | "pending_fill" | "filled";

/** One row of `contract_placeholders` — how a single `{{placeholder}}` resolves. */
export type ContractPlaceholderRow = {
  id: string;
  template_id: string;
  placeholder_key: string;
  type: ContractPlaceholderType;
  source_field: string | null;
  /** DJ-chosen display name for a manual/client placeholder, e.g. "Výška zálohy v EUR". */
  label: string | null;
  created_at: string;
  updated_at: string;
};

export type ContractTemplateRow = {
  id: string;
  dj_id: string;
  template_name: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
};

/** Template list row enriched with its placeholder count (from a nested count query). */
export type ContractTemplateWithCount = ContractTemplateRow & {
  placeholder_count: number;
};

/** Minimal booking shape the contract engine needs — a subset of `bookings`. */
export type ContractBookingData = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_location: string | null;
  message: string | null;
  price: number | null;
};

/** Minimal DJ profile shape the contract engine needs — a subset of `profiles`. */
export type ContractDjProfileData = {
  full_name: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  phone: string | null;
};

/** One stored PDF generation (kept last 30 per DJ). */
export type GeneratedContractRow = {
  id: string;
  dj_id: string;
  booking_id: string | null;
  template_id: string | null;
  client_id: string | null;
  client_name: string | null;
  template_name: string | null;
  file_name: string;
  storage_path: string;
  sent_to_client_at: string | null;
  /** Null = unread in the client's Dokumenty inbox. */
  client_seen_at: string | null;
  /** complete = ready PDF; pending_fill = waiting on client; filled = client done. */
  status: GeneratedContractStatus;
  /** DJ manual values captured at generation (needed to regenerate after client fill). */
  dj_manual_values: Record<string, string>;
  /** Values the client submitted for `client_input` placeholders. */
  client_values: Record<string, string>;
  filled_at: string | null;
  created_at: string;
};

export const GENERATED_CONTRACTS_LIMIT = 30;
export const CONTRACT_PDFS_BUCKET = "contract-pdfs";
