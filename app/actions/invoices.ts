"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  resolveInvoiceFieldValue,
  getPlaceholderDisplayLabel,
} from "@/lib/invoices/fields";
import { resolveInvoiceValues, renderInvoiceHtml } from "@/lib/invoices/render";
import { renderHtmlToPdfBuffer } from "@/lib/contracts/pdf";
import { normalizeContractHtmlForPdf } from "@/lib/contracts/normalize-html";
import { parsePageSettingsFromHtml } from "@/lib/contracts/page-spacers";
import { sendContractDocumentEmail, sendContractFilledEmail } from "@/lib/email";
import { getPublicSiteUrl } from "@/lib/site-url";
import {
  prefillFromBilling,
  missingClientFillKeys,
  optionalEmptyClientKeys,
  type ClientBillingProfileRow,
  type ClientPersonType,
} from "@/lib/client-billing";
import {
  isCompanyOnlyPlaceholderKey,
  isOptionalClientPlaceholderKey,
  isClientOwnedSourceField,
  normalizeInvoicePlaceholderType,
} from "@/lib/invoices/classify";
import { resolveAndLinkBookingClient } from "@/lib/link-booking-client";
import {
  GENERATED_INVOICES_LIMIT,
  INVOICE_PDFS_BUCKET,
  type DjBillingProfileRow,
  type GeneratedInvoiceRow,
  type InvoiceBookingData,
  type InvoicePlaceholderRow,
  type InvoicePlaceholderType,
  type InvoiceTemplateRow,
  type InvoiceTemplateWithCount,
} from "@/lib/invoices/types";

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function normalizeGeneratedInvoice(row: GeneratedInvoiceRow): GeneratedInvoiceRow {
  return {
    ...row,
    status: row.status ?? "complete",
    client_id: row.client_id ?? null,
    sent_to_client_at: row.sent_to_client_at ?? null,
    client_seen_at: row.client_seen_at ?? null,
    filled_at: row.filled_at ?? null,
    dj_manual_values: asStringRecord(row.dj_manual_values),
    client_values: asStringRecord(row.client_values),
  };
}

function storageAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

type RequireDjResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createSSRClient>>; userId: string }
  | { ok: false; error: string };

async function requireDj(): Promise<RequireDjResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    return { ok: false, error: "Len umelecké účty môžu spravovať faktúry." };
  }

  return { ok: true, supabase, userId: authData.user.id };
}

export type ListInvoiceTemplatesResult =
  | { ok: true; templates: InvoiceTemplateWithCount[] }
  | { ok: false; error: string };

export async function listInvoiceTemplates(): Promise<ListInvoiceTemplatesResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("invoice_templates")
    .select("*, invoice_placeholders(count)")
    .eq("dj_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listInvoiceTemplates]", error);
    return { ok: false, error: error.message };
  }

  const templates = (data ?? []).map((row) => {
    const { invoice_placeholders, ...rest } = row as InvoiceTemplateRow & {
      invoice_placeholders: { count: number }[];
    };
    return {
      ...rest,
      placeholder_count: invoice_placeholders?.[0]?.count ?? 0,
    };
  });

  return { ok: true, templates };
}

export type GetInvoiceTemplateResult =
  | { ok: true; template: InvoiceTemplateRow }
  | { ok: false; error: string };

export async function getInvoiceTemplate(
  templateId: string
): Promise<GetInvoiceTemplateResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("invoice_templates")
    .select("*")
    .eq("id", templateId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  return { ok: true, template: data as InvoiceTemplateRow };
}

export type GetInvoicePlaceholdersResult =
  | { ok: true; placeholders: InvoicePlaceholderRow[] }
  | { ok: false; error: string };

export async function getInvoicePlaceholders(
  templateId: string
): Promise<GetInvoicePlaceholdersResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: template } = await supabase
    .from("invoice_templates")
    .select("id")
    .eq("id", templateId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (!template) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  const { data, error } = await supabase
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", templateId)
    .order("placeholder_key", { ascending: true });

  if (error) {
    console.error("[getInvoicePlaceholders]", error);
    return { ok: false, error: error.message };
  }

  const placeholders = ((data ?? []) as InvoicePlaceholderRow[]).map(
    normalizeInvoicePlaceholderType
  );

  return { ok: true, placeholders };
}

export type PlaceholderInput = {
  placeholderKey: string;
  type: InvoicePlaceholderType;
  sourceField: string | null;
  label: string | null;
};

export type SaveInvoiceTemplateResult =
  | { ok: true; template: InvoiceTemplateRow; placeholders: InvoicePlaceholderRow[] }
  | { ok: false; error: string };

/** Saves the Invoice Builder's editor content + placeholder mapping in one go. */
export async function saveInvoiceTemplate(
  templateId: string,
  payload: {
    templateName: string;
    rawContent: string;
    placeholders: PlaceholderInput[];
  }
): Promise<SaveInvoiceTemplateResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const name = payload.templateName.trim();
  if (!name) return { ok: false, error: "Názov šablóny nemôže byť prázdny." };

  const { data: template, error: templateError } = await supabase
    .from("invoice_templates")
    .update({
      template_name: name,
      raw_content: payload.rawContent,
      updated_at: new Date().toISOString(),
    })
    .eq("id", templateId)
    .eq("dj_id", userId)
    .select("*")
    .single();

  if (templateError || !template) {
    console.error("[saveInvoiceTemplate]", templateError);
    return {
      ok: false,
      error: templateError?.message ?? "Šablóna sa nenašla.",
    };
  }

  const keys = payload.placeholders.map((p) => p.placeholderKey);

  if (keys.length > 0) {
    const { error: upsertError } = await supabase
      .from("invoice_placeholders")
      .upsert(
        payload.placeholders.map((p) => ({
          template_id: templateId,
          placeholder_key: p.placeholderKey,
          type: p.type,
          source_field: p.type === "database_field" ? p.sourceField : null,
          label:
            p.type === "manual_input" || p.type === "client_input"
              ? p.label?.trim() || null
              : null,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: "template_id,placeholder_key" }
      );

    if (upsertError) {
      console.error("[saveInvoiceTemplate:upsert]", upsertError);
      return { ok: false, error: upsertError.message };
    }
  }

  const cleanupQuery = supabase
    .from("invoice_placeholders")
    .delete()
    .eq("template_id", templateId);

  const { error: deleteError } =
    keys.length > 0
      ? await cleanupQuery.not(
          "placeholder_key",
          "in",
          `(${keys.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(",")})`
        )
      : await cleanupQuery;

  if (deleteError) {
    console.error("[saveInvoiceTemplate:cleanup]", deleteError);
    return { ok: false, error: deleteError.message };
  }

  const { data: placeholders, error: fetchError } = await supabase
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", templateId)
    .order("placeholder_key", { ascending: true });

  if (fetchError) {
    console.error("[saveInvoiceTemplate:fetch]", fetchError);
    return { ok: false, error: fetchError.message };
  }

  return {
    ok: true,
    template: template as InvoiceTemplateRow,
    placeholders: (placeholders ?? []) as InvoicePlaceholderRow[],
  };
}

export type InvoiceGap = { placeholderKey: string; label: string };

export type GetInvoiceGapsResult =
  | { ok: true; gaps: InvoiceGap[] }
  | { ok: false; error: string };

/** Auto fields that would resolve empty for this booking — asks the DJ to fill them in instead. */
export async function getInvoiceGaps(
  templateId: string,
  bookingId: string
): Promise<GetInvoiceGapsResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: placeholders, error: phError } = await supabase
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", templateId);

  if (phError) {
    console.error("[getInvoiceGaps]", phError);
    return { ok: false, error: phError.message };
  }

  const autoPlaceholders = ((placeholders ?? []) as InvoicePlaceholderRow[]).filter(
    (p) => p.type === "database_field" && p.source_field
  );
  if (autoPlaceholders.length === 0) return { ok: true, gaps: [] };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, dj_id, client_name, client_email, client_phone, event_type, event_date, end_date, event_location, price, dj_offer_price, base_price"
    )
    .eq("id", bookingId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: "Rezervácia sa nenašla." };
  }

  const now = new Date().toISOString().slice(0, 10);
  const gaps: InvoiceGap[] = [];
  for (const p of autoPlaceholders) {
    // Skip fields that always resolve at generate time (invoice number / dates).
    if (
      p.source_field === "invoice_number" ||
      p.source_field === "issue_date" ||
      p.source_field === "due_date" ||
      p.source_field === "variable_symbol" ||
      p.source_field === "currency" ||
      p.source_field === "today"
    ) {
      continue;
    }
    // Contact details owned by the customer — never ask DJ via gaps.
    if (isClientOwnedSourceField(p.source_field)) {
      continue;
    }
    if (isOptionalClientPlaceholderKey(p.placeholder_key)) {
      continue;
    }
    const value = resolveInvoiceFieldValue(p.source_field as string, {
      booking: booking as InvoiceBookingData,
      computed: {
        invoiceNumber: "",
        issueDate: now,
        dueDate: now,
        variableSymbol: "",
      },
    });
    if (!value) {
      gaps.push({
        placeholderKey: p.placeholder_key,
        label: getPlaceholderDisplayLabel(p),
      });
    }
  }

  return { ok: true, gaps };
}

export type ClientFillPreviewField = {
  placeholderKey: string;
  label: string;
  status: "from_profile" | "required" | "optional";
};

export type GetInvoiceClientFillPreviewResult =
  | {
      ok: true;
      needsClientFill: boolean;
      personType: ClientPersonType;
      fields: ClientFillPreviewField[];
      requiredLabels: string[];
      coveredLabels: string[];
      optionalLabels: string[];
    }
  | { ok: false; error: string };

/**
 * Live check: which client_input fields are already on the customer's profile
 * vs still required vs optional (phone…). Used by the generate UI.
 */
export async function getInvoiceClientFillPreview(
  templateId: string,
  bookingId: string
): Promise<GetInvoiceClientFillPreviewResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: placeholders, error: phError } = await supabase
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", templateId);

  if (phError) {
    return { ok: false, error: phError.message };
  }

  const clientPlaceholders = (
    (placeholders ?? []) as InvoicePlaceholderRow[]
  )
    .map(normalizeInvoicePlaceholderType)
    .filter((p) => p.type === "client_input");

  if (clientPlaceholders.length === 0) {
    return {
      ok: true,
      needsClientFill: false,
      personType: "individual",
      fields: [],
      requiredLabels: [],
      coveredLabels: [],
      optionalLabels: [],
    };
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select("id, client_id, client_name, client_email, client_phone")
    .eq("id", bookingId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: "Rezervácia sa nenašla." };
  }

  let clientId = booking.client_id as string | null;
  if (!clientId && booking.client_email) {
    const linked = await resolveAndLinkBookingClient(supabase, {
      id: booking.id,
      client_id: booking.client_id,
      client_email: booking.client_email,
    });
    if (linked.ok) clientId = linked.clientId;
  }

  let billing: ClientBillingProfileRow | null = null;
  let profilePhone: string | null = null;
  if (clientId) {
    const [{ data: billingRow }, { data: profile }] = await Promise.all([
      supabase
        .from("client_billing_profiles")
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select("phone")
        .eq("id", clientId)
        .maybeSingle(),
    ]);
    billing = (billingRow as ClientBillingProfileRow | null) ?? null;
    profilePhone = profile?.phone ?? null;
  }

  const personType = billing?.person_type ?? "individual";
  const keys = clientPlaceholders.map((p) => p.placeholder_key);
  const prefilled = prefillFromBilling(keys, billing, {
    phone: booking.client_phone || profilePhone,
    clientName: booking.client_name,
  });

  if (personType === "individual") {
    for (const key of keys) {
      if (isCompanyOnlyPlaceholderKey(key) && !prefilled[key]) {
        prefilled[key] = "—";
      }
    }
  }

  const requiredMissing = new Set(
    missingClientFillKeys(keys, prefilled, personType)
  );
  const optionalMissing = new Set(optionalEmptyClientKeys(keys, prefilled));

  const fields: ClientFillPreviewField[] = clientPlaceholders.map((p) => {
    const label = getPlaceholderDisplayLabel(p);
    if (requiredMissing.has(p.placeholder_key)) {
      return { placeholderKey: p.placeholder_key, label, status: "required" };
    }
    if (optionalMissing.has(p.placeholder_key)) {
      return { placeholderKey: p.placeholder_key, label, status: "optional" };
    }
    return { placeholderKey: p.placeholder_key, label, status: "from_profile" };
  });

  return {
    ok: true,
    needsClientFill: requiredMissing.size > 0,
    personType,
    fields,
    requiredLabels: fields
      .filter((f) => f.status === "required")
      .map((f) => f.label),
    coveredLabels: fields
      .filter((f) => f.status === "from_profile")
      .map((f) => f.label),
    optionalLabels: fields
      .filter((f) => f.status === "optional")
      .map((f) => f.label),
  };
}

export type DeleteResult = { ok: boolean; error?: string };

export async function deleteInvoiceTemplate(
  templateId: string
): Promise<DeleteResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("invoice_templates")
    .delete()
    .eq("id", templateId)
    .eq("dj_id", userId);

  if (error) {
    console.error("[deleteInvoiceTemplate]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type ListGeneratedInvoicesResult =
  | { ok: true; invoices: GeneratedInvoiceRow[] }
  | { ok: false; error: string };

export async function listGeneratedInvoices(): Promise<ListGeneratedInvoicesResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("dj_id", userId)
    .order("created_at", { ascending: false })
    .limit(GENERATED_INVOICES_LIMIT);

  if (error) {
    console.error("[listGeneratedInvoices]", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    invoices: ((data ?? []) as GeneratedInvoiceRow[]).map(normalizeGeneratedInvoice),
  };
}

export type InvoiceDownloadUrlResult =
  | { ok: true; url: string; fileName: string }
  | { ok: false; error: string };

export async function getGeneratedInvoiceDownloadUrl(
  invoiceId: string
): Promise<InvoiceDownloadUrlResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: row, error } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Faktúra sa nenašla." };
  }

  const invoice = normalizeGeneratedInvoice(row as GeneratedInvoiceRow);
  const isOwner = invoice.dj_id === authData.user.id;
  const isRecipient =
    invoice.client_id === authData.user.id && !!invoice.sent_to_client_at;
  if (!isOwner && !isRecipient) {
    return { ok: false, error: "Nemáš prístup k tejto faktúre." };
  }

  if (invoice.status === "pending_fill") {
    return {
      ok: false,
      error: isOwner
        ? "PDF ešte nie je hotové — zákazník musí najprv doplniť údaje."
        : "Najprv doplň údaje a ulož dokument — potom si ho môžeš stiahnuť.",
    };
  }

  const admin = storageAdmin();
  const { data: signed, error: signError } = await admin.storage
    .from(INVOICE_PDFS_BUCKET)
    .createSignedUrl(invoice.storage_path, 60 * 10);

  if (signError || !signed?.signedUrl) {
    console.error("[getGeneratedInvoiceDownloadUrl]", signError);
    return { ok: false, error: "PDF sa nepodarilo otvoriť." };
  }

  return { ok: true, url: signed.signedUrl, fileName: invoice.file_name };
}

export async function deleteGeneratedInvoice(
  invoiceId: string
): Promise<DeleteResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: row } = await supabase
    .from("generated_invoices")
    .select("storage_path")
    .eq("id", invoiceId)
    .eq("dj_id", userId)
    .maybeSingle();

  const { error } = await supabase
    .from("generated_invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("dj_id", userId);

  if (error) {
    console.error("[deleteGeneratedInvoice]", error);
    return { ok: false, error: error.message };
  }

  if (row?.storage_path) {
    const admin = storageAdmin();
    await admin.storage.from(INVOICE_PDFS_BUCKET).remove([row.storage_path]);
  }

  return { ok: true };
}

export type BookingInvoiceSummary = {
  bookingId: string;
  invoiceId: string;
  invoiceNumber: string;
  templateName: string | null;
  status: GeneratedInvoiceRow["status"];
  sentToClientAt: string | null;
  filledAt: string | null;
  createdAt: string;
};

export type BookingInvoiceSummariesResult =
  | { ok: true; byBookingId: Record<string, BookingInvoiceSummary> }
  | { ok: false; error: string };

/** Latest generated invoice per booking (for the DJ bookings list). */
export async function getBookingInvoiceSummaries(
  bookingIds: string[]
): Promise<BookingInvoiceSummariesResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: true, byBookingId: {} };
  }

  const { data, error } = await supabase
    .from("generated_invoices")
    .select(
      "id, booking_id, invoice_number, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .eq("dj_id", userId)
    .in("booking_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBookingInvoiceSummaries]", error);
    return { ok: false, error: error.message };
  }

  const byBookingId: Record<string, BookingInvoiceSummary> = {};
  for (const row of data ?? []) {
    const bookingId = row.booking_id as string | null;
    if (!bookingId || byBookingId[bookingId]) continue;
    byBookingId[bookingId] = {
      bookingId,
      invoiceId: row.id as string,
      invoiceNumber: row.invoice_number as string,
      templateName: (row.template_name as string | null) ?? null,
      status: (row.status as GeneratedInvoiceRow["status"]) ?? "complete",
      sentToClientAt: (row.sent_to_client_at as string | null) ?? null,
      filledAt: (row.filled_at as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  }

  return { ok: true, byBookingId };
}

export type InvoiceWorkflowStatus =
  | "generated"
  | "awaiting_fill"
  | "sent"
  | "filled";

export type UpdateInvoiceWorkflowResult =
  | { ok: true; summary: BookingInvoiceSummary }
  | { ok: false; error: string };

export async function updateBookingInvoiceWorkflowStatus(
  invoiceId: string,
  workflow: InvoiceWorkflowStatus
): Promise<UpdateInvoiceWorkflowResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from("generated_invoices")
    .select(
      "id, booking_id, invoice_number, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .eq("id", invoiceId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Faktúra sa nenašla." };
  }

  const now = new Date().toISOString();
  const patch: Record<string, string | null> = {};

  switch (workflow) {
    case "generated":
      patch.status = "complete";
      patch.sent_to_client_at = null;
      patch.filled_at = null;
      break;
    case "awaiting_fill":
      patch.status = "pending_fill";
      patch.sent_to_client_at =
        (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = null;
      patch.client_seen_at = null;
      break;
    case "sent":
      patch.status = "complete";
      patch.sent_to_client_at =
        (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = null;
      if (!existing.sent_to_client_at) patch.client_seen_at = null;
      break;
    case "filled":
      patch.status = "filled";
      patch.sent_to_client_at =
        (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = (existing.filled_at as string | null) ?? now;
      break;
    default:
      return { ok: false, error: "Neplatný stav." };
  }

  const { data: updated, error } = await supabase
    .from("generated_invoices")
    .update(patch)
    .eq("id", invoiceId)
    .eq("dj_id", userId)
    .select(
      "id, booking_id, invoice_number, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .single();

  if (error || !updated) {
    console.error("[updateBookingInvoiceWorkflowStatus]", error);
    return { ok: false, error: error?.message ?? "Uloženie zlyhalo." };
  }

  return {
    ok: true,
    summary: {
      bookingId: updated.booking_id as string,
      invoiceId: updated.id as string,
      invoiceNumber: updated.invoice_number as string,
      templateName: (updated.template_name as string | null) ?? null,
      status: (updated.status as GeneratedInvoiceRow["status"]) ?? "complete",
      sentToClientAt: (updated.sent_to_client_at as string | null) ?? null,
      filledAt: (updated.filled_at as string | null) ?? null,
      createdAt: updated.created_at as string,
    },
  };
}

export type GetBillingProfileResult =
  | { ok: true; billing: DjBillingProfileRow | null }
  | { ok: false; error: string };

export async function getBillingProfile(): Promise<GetBillingProfileResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("dj_billing_profiles")
    .select("*")
    .eq("dj_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getBillingProfile]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, billing: (data as DjBillingProfileRow | null) ?? null };
}

export type SaveBillingProfileInput = {
  legalName: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  ico: string;
  dic: string;
  icDph: string;
  isVatPayer: boolean;
  iban: string;
  bankName: string;
  swift: string;
  registrationNote: string;
  invoiceNumberPrefix: string;
  defaultDueDays: number;
};

export type SaveBillingProfileResult =
  | { ok: true; billing: DjBillingProfileRow }
  | { ok: false; error: string };

export async function saveBillingProfile(
  input: SaveBillingProfileInput
): Promise<SaveBillingProfileResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("dj_billing_profiles")
    .upsert(
      {
        dj_id: userId,
        legal_name: input.legalName.trim() || null,
        street_address: input.streetAddress.trim() || null,
        city: input.city.trim() || null,
        postal_code: input.postalCode.trim() || null,
        country: input.country.trim() || "Slovensko",
        ico: input.ico.trim() || null,
        dic: input.dic.trim() || null,
        ic_dph: input.icDph.trim() || null,
        is_vat_payer: input.isVatPayer,
        iban: input.iban.trim() || null,
        bank_name: input.bankName.trim() || null,
        swift: input.swift.trim() || null,
        registration_note: input.registrationNote.trim() || null,
        invoice_number_prefix: input.invoiceNumberPrefix.trim() || undefined,
        default_due_days: input.defaultDueDays || 14,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "dj_id" }
    )
    .select("*")
    .single();

  if (error || !data) {
    console.error("[saveBillingProfile]", error);
    return { ok: false, error: error?.message ?? "Uloženie zlyhalo." };
  }

  return { ok: true, billing: data as DjBillingProfileRow };
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export type SendInvoiceResult =
  | { ok: true; invoice: GeneratedInvoiceRow }
  | { ok: false; error: string };

export async function sendGeneratedInvoiceToClient(
  invoiceId: string
): Promise<SendInvoiceResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Faktúra sa nenašla." };
  }

  const invoice = normalizeGeneratedInvoice(existing as GeneratedInvoiceRow);

  let clientId = invoice.client_id;
  if (!clientId && invoice.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, client_email")
      .eq("id", invoice.booking_id)
      .eq("dj_id", userId)
      .maybeSingle();

    if (booking) {
      const linked = await resolveAndLinkBookingClient(supabase, booking);
      if (!linked.ok) {
        return { ok: false, error: linked.error };
      }
      clientId = linked.clientId;
      await supabase
        .from("generated_invoices")
        .update({ client_id: clientId })
        .eq("id", invoiceId)
        .eq("dj_id", userId);
    }
  }

  if (!clientId) {
    return {
      ok: false,
      error:
        "Táto rezervácia nie je prepojená s klientskym účtom — faktúru nie je kam poslať.",
    };
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("generated_invoices")
    .update({
      client_id: clientId,
      sent_to_client_at: sentAt,
      client_seen_at: null,
    })
    .eq("id", invoiceId)
    .eq("dj_id", userId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[sendGeneratedInvoiceToClient]", updateError);
    return { ok: false, error: updateError?.message ?? "Odoslanie zlyhalo." };
  }

  let clientEmail: string | null = null;
  if (invoice.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("client_email")
      .eq("id", invoice.booking_id)
      .maybeSingle();
    clientEmail = booking?.client_email?.trim() || null;
  }

  const { data: djProfile } = await supabase
    .from("profiles")
    .select("full_name, real_first_name, real_last_name")
    .eq("id", userId)
    .maybeSingle();

  const djName =
    djProfile?.full_name?.trim() ||
    [djProfile?.real_first_name, djProfile?.real_last_name]
      .filter(Boolean)
      .join(" ")
      .trim() ||
    "Umelec";

  if (clientEmail) {
    const site = getPublicSiteUrl();
    await sendContractDocumentEmail({
      clientEmail,
      clientName: invoice.client_name,
      djName,
      documentName: invoice.template_name || invoice.file_name,
      documentsUrl: `${site}/client-dashboard/documents`,
      djEmail: (await supabase.auth.getUser()).data.user?.email,
      needsClientFill: invoice.status === "pending_fill",
    });
  }

  return {
    ok: true,
    invoice: normalizeGeneratedInvoice(updated as GeneratedInvoiceRow),
  };
}

export type ListClientInvoicesResult =
  | { ok: true; invoices: GeneratedInvoiceRow[] }
  | { ok: false; error: string };

export async function listClientReceivedInvoices(): Promise<ListClientInvoicesResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data, error } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .order("sent_to_client_at", { ascending: false });

  if (error) {
    console.error("[listClientReceivedInvoices]", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    invoices: ((data ?? []) as GeneratedInvoiceRow[]).map(
      normalizeGeneratedInvoice
    ),
  };
}

export type UnreadClientInvoicesResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

export async function countClientUnreadInvoices(): Promise<UnreadClientInvoicesResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { count, error } = await supabase
    .from("generated_invoices")
    .select("id", { count: "exact", head: true })
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .is("client_seen_at", null);

  if (error) {
    console.error("[countClientUnreadInvoices]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, count: count ?? 0 };
}

export type MarkSeenResult = { ok: true } | { ok: false; error: string };

export async function markClientInvoicesSeen(): Promise<MarkSeenResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: unread, error: listError } = await supabase
    .from("generated_invoices")
    .select("id")
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .is("client_seen_at", null);

  if (listError) {
    console.error("[markClientInvoicesSeen]", listError);
    return { ok: false, error: listError.message };
  }

  const ids = (unread ?? []).map((r) => r.id as string);
  if (ids.length === 0) return { ok: true };

  const admin = storageAdmin();
  const { error } = await admin
    .from("generated_invoices")
    .update({ client_seen_at: new Date().toISOString() })
    .in("id", ids)
    .eq("client_id", authData.user.id);

  if (error) {
    console.error("[markClientInvoicesSeen]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type ClientFillField = {
  placeholderKey: string;
  label: string;
  /** Voluntary — empty stays empty, never blocks PDF. */
  optional?: boolean;
};

export type GetClientInvoiceFillFieldsResult =
  | {
      ok: true;
      invoice: GeneratedInvoiceRow;
      fields: ClientFillField[];
    }
  | { ok: false; error: string };

export async function getClientInvoiceFillFields(
  invoiceId: string
): Promise<GetClientInvoiceFillFieldsResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: row, error } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Dokument sa nenašiel." };
  }

  const invoice = normalizeGeneratedInvoice(row as GeneratedInvoiceRow);
  if (!invoice.template_id) {
    return { ok: false, error: "Šablóna dokumentu už nie je dostupná." };
  }

  const admin = storageAdmin();
  const { data: placeholders, error: phError } = await admin
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", invoice.template_id)
    .order("placeholder_key", { ascending: true });

  if (phError) {
    console.error("[getClientInvoiceFillFields]", phError);
    return { ok: false, error: phError.message };
  }

  const allFields = ((placeholders ?? []) as InvoicePlaceholderRow[])
    .map(normalizeInvoicePlaceholderType)
    .filter((p) => p.type === "client_input")
    .map((p) => ({
      placeholderKey: p.placeholder_key,
      label: getPlaceholderDisplayLabel(p),
      optional: isOptionalClientPlaceholderKey(p.placeholder_key),
    }));

  const [{ data: billing }, { data: profile }] = await Promise.all([
    supabase
      .from("client_billing_profiles")
      .select("*")
      .eq("client_id", authData.user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("phone")
      .eq("id", authData.user.id)
      .maybeSingle(),
  ]);

  const billingRow = (billing as ClientBillingProfileRow | null) ?? null;
  const personType = billingRow?.person_type ?? "individual";

  let bookingPhone: string | null = null;
  if (invoice.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("client_phone, client_name")
      .eq("id", invoice.booking_id)
      .maybeSingle();
    bookingPhone = booking?.client_phone ?? null;
  }

  const suggestedValues = prefillFromBilling(
    allFields.map((f) => f.placeholderKey),
    billingRow,
    {
      phone: bookingPhone || profile?.phone,
      clientName: invoice.client_name,
    }
  );

  const mergedValues = {
    ...suggestedValues,
    ...invoice.client_values,
  };

  const requiredMissing = new Set(
    missingClientFillKeys(
      allFields.map((f) => f.placeholderKey),
      mergedValues,
      personType
    )
  );
  const optionalMissing = new Set(
    optionalEmptyClientKeys(
      allFields.map((f) => f.placeholderKey),
      mergedValues
    )
  );

  const fieldsToFill = allFields.filter(
    (f) =>
      requiredMissing.has(f.placeholderKey) ||
      optionalMissing.has(f.placeholderKey)
  );

  return {
    ok: true,
    invoice: { ...invoice, client_values: mergedValues },
    fields: fieldsToFill,
  };
}

export type SubmitClientInvoiceFillResult =
  | { ok: true; invoice: GeneratedInvoiceRow }
  | { ok: false; error: string };

export async function submitClientInvoiceFill(
  invoiceId: string,
  clientValues: Record<string, string>
): Promise<SubmitClientInvoiceFillResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: row, error } = await supabase
    .from("generated_invoices")
    .select("*")
    .eq("id", invoiceId)
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Dokument sa nenašiel." };
  }

  const invoice = normalizeGeneratedInvoice(row as GeneratedInvoiceRow);
  if (invoice.status !== "pending_fill") {
    return {
      ok: false,
      error:
        invoice.status === "filled"
          ? "Dokument už bol vyplnený."
          : "Tento dokument nevyžaduje doplnenie údajov.",
    };
  }

  if (!invoice.template_id || !invoice.booking_id) {
    return { ok: false, error: "Dokument nemá prepojenú šablónu alebo rezerváciu." };
  }

  const admin = storageAdmin();

  const { data: placeholders, error: phError } = await admin
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", invoice.template_id);

  if (phError || !placeholders) {
    return { ok: false, error: "Premenné šablóny sa nenašli." };
  }

  const placeholderRows = (
    (placeholders ?? []) as InvoicePlaceholderRow[]
  ).map(normalizeInvoicePlaceholderType);
  const clientFields = placeholderRows.filter((p) => p.type === "client_input");
  if (clientFields.length === 0) {
    return { ok: false, error: "V šablóne nie sú polia na vyplnenie zákazníkom." };
  }

  const { data: billing } = await supabase
    .from("client_billing_profiles")
    .select("*")
    .eq("client_id", authData.user.id)
    .maybeSingle();
  const billingRow = (billing as ClientBillingProfileRow | null) ?? null;
  const personType = billingRow?.person_type ?? "individual";

  const baseValues = {
    ...prefillFromBilling(
      clientFields.map((f) => f.placeholder_key),
      billingRow,
      { clientName: invoice.client_name }
    ),
    ...invoice.client_values,
  };

  // Merge newly submitted values on top.
  const cleanedValues: Record<string, string> = { ...baseValues };
  for (const field of clientFields) {
    const submitted = clientValues[field.placeholder_key];
    if (typeof submitted === "string" && submitted.trim()) {
      cleanedValues[field.placeholder_key] = submitted.trim();
    }
  }

  // Individual: company-only keys get a dash if still empty.
  if (personType === "individual") {
    for (const field of clientFields) {
      if (
        isCompanyOnlyPlaceholderKey(field.placeholder_key) &&
        !cleanedValues[field.placeholder_key]?.trim()
      ) {
        cleanedValues[field.placeholder_key] = "—";
      }
    }
  }

  const stillMissing = missingClientFillKeys(
    clientFields.map((f) => f.placeholder_key),
    cleanedValues,
    personType
  );
  if (stillMissing.length > 0) {
    const first = clientFields.find(
      (f) => f.placeholder_key === stillMissing[0]
    );
    return {
      ok: false,
      error: `Vyplň pole „${first ? getPlaceholderDisplayLabel(first) : stillMissing[0]}“.`,
    };
  }

  const { data: template, error: templateError } = await admin
    .from("invoice_templates")
    .select("*")
    .eq("id", invoice.template_id)
    .maybeSingle();

  if (templateError || !template) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, client_name, client_email, client_phone, event_type, event_date, end_date, event_location, price, dj_offer_price, base_price"
    )
    .eq("id", invoice.booking_id)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: "Rezervácia sa nenašla." };
  }

  const { data: djBilling } = await admin
    .from("dj_billing_profiles")
    .select("default_due_days")
    .eq("dj_id", invoice.dj_id)
    .maybeSingle();

  const issueDate = invoice.created_at.slice(0, 10);
  const dueDate = addDays(
    issueDate,
    (djBilling as { default_due_days?: number } | null)?.default_due_days ?? 14
  );
  const variableSymbol = invoice.invoice_number.replace(/\D/g, "");

  try {
    const values = resolveInvoiceValues(
      placeholderRows,
      {
        booking: booking as InvoiceBookingData,
        computed: {
          invoiceNumber: invoice.invoice_number,
          issueDate,
          dueDate,
          variableSymbol,
        },
      },
      invoice.dj_manual_values,
      cleanedValues
    );

    const raw = (template as InvoiceTemplateRow).raw_content;
    const settings = parsePageSettingsFromHtml(raw);
    const html = renderInvoiceHtml(normalizeContractHtmlForPdf(raw), values);
    const pdfBuffer = await renderHtmlToPdfBuffer(
      html,
      (template as InvoiceTemplateRow).template_name,
      settings
    );

    const { error: uploadError } = await admin.storage
      .from(INVOICE_PDFS_BUCKET)
      .upload(invoice.storage_path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[submitClientInvoiceFill:upload]", uploadError);
      return { ok: false, error: "PDF sa nepodarilo uložiť." };
    }

    const filledAt = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("generated_invoices")
      .update({
        status: "filled",
        client_values: cleanedValues,
        filled_at: filledAt,
        client_seen_at: filledAt,
      })
      .eq("id", invoiceId)
      .eq("client_id", authData.user.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("[submitClientInvoiceFill:update]", updateError);
      return { ok: false, error: updateError?.message ?? "Uloženie zlyhalo." };
    }

    try {
      const { data: authUser } = await admin.auth.admin.getUserById(invoice.dj_id);
      const djEmail = authUser.user?.email?.trim() || null;
      if (djEmail) {
        const site = getPublicSiteUrl();
        const { data: djProfile } = await admin
          .from("profiles")
          .select("full_name, real_first_name, real_last_name")
          .eq("id", invoice.dj_id)
          .maybeSingle();
        const djName =
          djProfile?.full_name?.trim() ||
          [djProfile?.real_first_name, djProfile?.real_last_name]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          "Umelec";
        await sendContractFilledEmail({
          djEmail,
          djName,
          clientName: invoice.client_name,
          documentName: invoice.template_name || invoice.file_name,
          dashboardUrl: `${site}/dashboard/invoices/generate`,
          clientEmail: authData.user.email,
        });
      }
    } catch (notifyErr) {
      console.error("[submitClientInvoiceFill:notify]", notifyErr);
    }

    return {
      ok: true,
      invoice: normalizeGeneratedInvoice(updated as GeneratedInvoiceRow),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nepodarilo sa uložiť dokument.";
    console.error("[submitClientInvoiceFill]", err);
    return { ok: false, error: message };
  }
}
