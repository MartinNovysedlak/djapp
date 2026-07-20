/**
 * Invoice Engine — separate tables/storage from contracts.
 * Supplier constants (IČO, IBAN…) live hard-coded in the template HTML,
 * not as auto placeholders.
 */
export type InvoicePlaceholderType =
  | "database_field"
  | "manual_input"
  | "client_input";

export type GeneratedInvoiceStatus = "complete" | "pending_fill" | "filled";

export type InvoicePlaceholderRow = {
  id: string;
  template_id: string;
  placeholder_key: string;
  type: InvoicePlaceholderType;
  source_field: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceTemplateRow = {
  id: string;
  dj_id: string;
  template_name: string;
  raw_content: string;
  created_at: string;
  updated_at: string;
};

export type InvoiceTemplateWithCount = InvoiceTemplateRow & {
  placeholder_count: number;
};

export type InvoiceBookingData = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  event_location: string | null;
};

export type InvoiceDjProfileData = {
  full_name: string | null;
  real_first_name: string | null;
  real_last_name: string | null;
  phone: string | null;
  email: string | null;
};

export type DjBillingProfileRow = {
  dj_id: string;
  legal_name: string | null;
  street_address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  ico: string | null;
  dic: string | null;
  ic_dph: string | null;
  is_vat_payer: boolean;
  iban: string | null;
  bank_name: string | null;
  swift: string | null;
  registration_note: string | null;
  invoice_number_prefix: string;
  next_invoice_seq: number;
  default_due_days: number;
  created_at: string;
  updated_at: string;
};

export type InvoiceComputedData = {
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  variableSymbol: string;
};

export type GeneratedInvoiceRow = {
  id: string;
  dj_id: string;
  booking_id: string | null;
  template_id: string | null;
  client_id: string | null;
  client_name: string | null;
  template_name: string | null;
  invoice_number: string;
  file_name: string;
  storage_path: string;
  sent_to_client_at: string | null;
  client_seen_at: string | null;
  status: GeneratedInvoiceStatus;
  dj_manual_values: Record<string, string>;
  client_values: Record<string, string>;
  filled_at: string | null;
  created_at: string;
};

export const GENERATED_INVOICES_LIMIT = 30;
export const INVOICE_PDFS_BUCKET = "invoice-pdfs";
