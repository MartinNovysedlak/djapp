"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  resolveFieldValue,
  getPlaceholderDisplayLabel,
} from "@/lib/contracts/fields";
import {
  sendContractDocumentEmail,
  sendContractFilledEmail,
} from "@/lib/email";
import { resolveAndLinkBookingClient } from "@/lib/link-booking-client";
import {
  prefillFromBilling,
  type ClientBillingProfileRow,
} from "@/lib/client-billing";
import { resolveContractValues, renderContractHtml } from "@/lib/contracts/render";
import { renderHtmlToPdfBuffer } from "@/lib/contracts/pdf";
import { normalizeContractHtmlForPdf } from "@/lib/contracts/normalize-html";
import { parsePageSettingsFromHtml } from "@/lib/contracts/page-spacers";
import {
  CONTRACT_PDFS_BUCKET,
  GENERATED_CONTRACTS_LIMIT,
  type ContractBookingData,
  type ContractDjProfileData,
  type ContractPlaceholderRow,
  type ContractPlaceholderType,
  type ContractTemplateRow,
  type ContractTemplateWithCount,
  type GeneratedContractRow,
} from "@/lib/contracts/types";

function asStringRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
    else if (v != null) out[k] = String(v);
  }
  return out;
}

function normalizeGeneratedContract(row: GeneratedContractRow): GeneratedContractRow {
  return {
    ...row,
    status: row.status ?? "complete",
    dj_manual_values: asStringRecord(row.dj_manual_values),
    client_values: asStringRecord(row.client_values),
    filled_at: row.filled_at ?? null,
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
    return { ok: false, error: "Len umelecké účty môžu spravovať zmluvy." };
  }

  return { ok: true, supabase, userId: authData.user.id };
}

export type ListContractTemplatesResult =
  | { ok: true; templates: ContractTemplateWithCount[] }
  | { ok: false; error: string };

export async function listContractTemplates(): Promise<ListContractTemplatesResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("contract_templates")
    .select("*, contract_placeholders(count)")
    .eq("dj_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listContractTemplates]", error);
    return { ok: false, error: error.message };
  }

  const templates = (data ?? []).map((row) => {
    const { contract_placeholders, ...rest } = row as ContractTemplateRow & {
      contract_placeholders: { count: number }[];
    };
    return {
      ...rest,
      placeholder_count: contract_placeholders?.[0]?.count ?? 0,
    };
  });

  return { ok: true, templates };
}

export type GetContractTemplateResult =
  | { ok: true; template: ContractTemplateRow }
  | { ok: false; error: string };

export async function getContractTemplate(
  templateId: string
): Promise<GetContractTemplateResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("contract_templates")
    .select("*")
    .eq("id", templateId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  return { ok: true, template: data as ContractTemplateRow };
}

export type GetContractPlaceholdersResult =
  | { ok: true; placeholders: ContractPlaceholderRow[] }
  | { ok: false; error: string };

/** Fetches a template's placeholder mapping rows — used by both the mapping UI and the generator. */
export async function getContractPlaceholders(
  templateId: string
): Promise<GetContractPlaceholdersResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: template } = await supabase
    .from("contract_templates")
    .select("id")
    .eq("id", templateId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (!template) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  const { data, error } = await supabase
    .from("contract_placeholders")
    .select("*")
    .eq("template_id", templateId)
    .order("placeholder_key", { ascending: true });

  if (error) {
    console.error("[getContractPlaceholders]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, placeholders: (data ?? []) as ContractPlaceholderRow[] };
}

export type UpdatePlaceholderMappingResult = { ok: boolean; error?: string };

export type PlaceholderInput = {
  placeholderKey: string;
  type: ContractPlaceholderType;
  sourceField: string | null;
  label: string | null;
};

export type SaveContractTemplateResult =
  | { ok: true; template: ContractTemplateRow; placeholders: ContractPlaceholderRow[] }
  | { ok: false; error: string };

/**
 * Saves the Contract Builder's editor content + placeholder mapping in one go.
 * Placeholders are upserted by `(template_id, placeholder_key)` so existing
 * mappings survive edits, new `{{tokens}}` typed into the editor get their own
 * row (defaulting to manual input), and tokens removed from the text are dropped.
 */
export async function saveContractTemplate(
  templateId: string,
  payload: {
    templateName: string;
    rawContent: string;
    placeholders: PlaceholderInput[];
  }
): Promise<SaveContractTemplateResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const name = payload.templateName.trim();
  if (!name) return { ok: false, error: "Názov šablóny nemôže byť prázdny." };

  const { data: template, error: templateError } = await supabase
    .from("contract_templates")
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
    console.error("[saveContractTemplate]", templateError);
    return {
      ok: false,
      error: templateError?.message ?? "Šablóna sa nenašla.",
    };
  }

  const keys = payload.placeholders.map((p) => p.placeholderKey);

  if (keys.length > 0) {
    const { error: upsertError } = await supabase
      .from("contract_placeholders")
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
      console.error("[saveContractTemplate:upsert]", upsertError);
      return { ok: false, error: upsertError.message };
    }
  }

  const cleanupQuery = supabase
    .from("contract_placeholders")
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
    console.error("[saveContractTemplate:cleanup]", deleteError);
    return { ok: false, error: deleteError.message };
  }

  const { data: placeholders, error: fetchError } = await supabase
    .from("contract_placeholders")
    .select("*")
    .eq("template_id", templateId)
    .order("placeholder_key", { ascending: true });

  if (fetchError) {
    console.error("[saveContractTemplate:fetch]", fetchError);
    return { ok: false, error: fetchError.message };
  }

  return {
    ok: true,
    template: template as ContractTemplateRow,
    placeholders: (placeholders ?? []) as ContractPlaceholderRow[],
  };
}

export type ContractGap = { placeholderKey: string; label: string };

export type GetContractGapsResult =
  | { ok: true; gaps: ContractGap[] }
  | { ok: false; error: string };

/**
 * For a specific booking, finds `database_field` placeholders that would resolve
 * to an empty value (e.g. the client never left a phone number) — the generate
 * page asks the DJ to fill exactly these in, instead of shipping a contract with
 * blanks in it.
 */
export async function getContractGaps(
  templateId: string,
  bookingId: string
): Promise<GetContractGapsResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: placeholders, error: phError } = await supabase
    .from("contract_placeholders")
    .select("*")
    .eq("template_id", templateId);

  if (phError) {
    console.error("[getContractGaps]", phError);
    return { ok: false, error: phError.message };
  }

  const autoPlaceholders = ((placeholders ?? []) as ContractPlaceholderRow[]).filter(
    (p) => p.type === "database_field" && p.source_field
  );
  if (autoPlaceholders.length === 0) return { ok: true, gaps: [] };

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, dj_id, client_name, client_email, client_phone, event_type, event_date, end_date, start_time, end_time, event_location, message, price, dj_offer_price, base_price"
    )
    .eq("id", bookingId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: "Rezervácia sa nenašla." };
  }

  const { data: djProfile } = await supabase
    .from("profiles")
    .select("full_name, real_first_name, real_last_name, phone")
    .eq("id", userId)
    .maybeSingle();

  const profile: ContractDjProfileData = (djProfile as ContractDjProfileData) ?? {
    full_name: null,
    real_first_name: null,
    real_last_name: null,
    phone: null,
  };

  const gaps: ContractGap[] = [];
  for (const p of autoPlaceholders) {
    const value = resolveFieldValue(p.source_field as string, booking as ContractBookingData, profile);
    if (!value) {
      gaps.push({
        placeholderKey: p.placeholder_key,
        label: getPlaceholderDisplayLabel(p),
      });
    }
  }

  return { ok: true, gaps };
}

export async function deleteContractTemplate(
  templateId: string
): Promise<UpdatePlaceholderMappingResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { error } = await supabase
    .from("contract_templates")
    .delete()
    .eq("id", templateId)
    .eq("dj_id", userId);

  if (error) {
    console.error("[deleteContractTemplate]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type ListGeneratedContractsResult =
  | { ok: true; contracts: GeneratedContractRow[] }
  | { ok: false; error: string };

export async function listGeneratedContracts(): Promise<ListGeneratedContractsResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data, error } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("dj_id", userId)
    .order("created_at", { ascending: false })
    .limit(GENERATED_CONTRACTS_LIMIT);

  if (error) {
    console.error("[listGeneratedContracts]", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    contracts: ((data ?? []) as GeneratedContractRow[]).map(
      normalizeGeneratedContract
    ),
  };
}

export type BookingContractSummary = {
  bookingId: string;
  contractId: string;
  templateName: string | null;
  status: GeneratedContractRow["status"];
  sentToClientAt: string | null;
  filledAt: string | null;
  createdAt: string;
};

export type BookingContractSummariesResult =
  | { ok: true; byBookingId: Record<string, BookingContractSummary> }
  | { ok: false; error: string };

/**
 * Latest generated contract per booking (for the DJ bookings list).
 */
export async function getBookingContractSummaries(
  bookingIds: string[]
): Promise<BookingContractSummariesResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const ids = [...new Set(bookingIds.filter(Boolean))];
  if (ids.length === 0) {
    return { ok: true, byBookingId: {} };
  }

  const { data, error } = await supabase
    .from("generated_contracts")
    .select(
      "id, booking_id, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .eq("dj_id", userId)
    .in("booking_id", ids)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getBookingContractSummaries]", error);
    return { ok: false, error: error.message };
  }

  const byBookingId: Record<string, BookingContractSummary> = {};
  for (const row of data ?? []) {
    const bookingId = row.booking_id as string | null;
    if (!bookingId || byBookingId[bookingId]) continue;
    byBookingId[bookingId] = {
      bookingId,
      contractId: row.id as string,
      templateName: (row.template_name as string | null) ?? null,
      status: (row.status as GeneratedContractRow["status"]) ?? "complete",
      sentToClientAt: (row.sent_to_client_at as string | null) ?? null,
      filledAt: (row.filled_at as string | null) ?? null,
      createdAt: row.created_at as string,
    };
  }

  return { ok: true, byBookingId };
}

/** DJ-facing workflow labels mapped onto generated_contracts fields. */
export type ContractWorkflowStatus =
  | "generated"
  | "awaiting_fill"
  | "sent"
  | "filled";

export type UpdateContractWorkflowResult =
  | { ok: true; summary: BookingContractSummary }
  | { ok: false; error: string };

export async function updateBookingContractWorkflowStatus(
  contractId: string,
  workflow: ContractWorkflowStatus
): Promise<UpdateContractWorkflowResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from("generated_contracts")
    .select(
      "id, booking_id, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .eq("id", contractId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Zmluva sa nenašla." };
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
      patch.sent_to_client_at = (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = null;
      patch.client_seen_at = null;
      break;
    case "sent":
      patch.status = "complete";
      patch.sent_to_client_at = (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = null;
      if (!existing.sent_to_client_at) patch.client_seen_at = null;
      break;
    case "filled":
      patch.status = "filled";
      patch.sent_to_client_at = (existing.sent_to_client_at as string | null) ?? now;
      patch.filled_at = (existing.filled_at as string | null) ?? now;
      break;
    default:
      return { ok: false, error: "Neplatný stav." };
  }

  const { data: updated, error } = await supabase
    .from("generated_contracts")
    .update(patch)
    .eq("id", contractId)
    .eq("dj_id", userId)
    .select(
      "id, booking_id, template_name, status, sent_to_client_at, filled_at, created_at"
    )
    .single();

  if (error || !updated) {
    console.error("[updateBookingContractWorkflowStatus]", error);
    return { ok: false, error: error?.message ?? "Stav sa nepodarilo zmeniť." };
  }

  if (!updated.booking_id) {
    return { ok: false, error: "Zmluva nie je prepojená s rezerváciou." };
  }

  return {
    ok: true,
    summary: {
      bookingId: updated.booking_id as string,
      contractId: updated.id as string,
      templateName: (updated.template_name as string | null) ?? null,
      status: (updated.status as GeneratedContractRow["status"]) ?? "complete",
      sentToClientAt: (updated.sent_to_client_at as string | null) ?? null,
      filledAt: (updated.filled_at as string | null) ?? null,
      createdAt: updated.created_at as string,
    },
  };
}

export type ListClientContractsResult =
  | { ok: true; contracts: GeneratedContractRow[] }
  | { ok: false; error: string };

/** Contracts the DJ sent into this client's profile inbox. */
export async function listClientReceivedContracts(): Promise<ListClientContractsResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data, error } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .order("sent_to_client_at", { ascending: false });

  if (error) {
    console.error("[listClientReceivedContracts]", error);
    return { ok: false, error: error.message };
  }

  return {
    ok: true,
    contracts: ((data ?? []) as GeneratedContractRow[]).map(
      normalizeGeneratedContract
    ),
  };
}

export type ContractDownloadUrlResult =
  | { ok: true; url: string; fileName: string }
  | { ok: false; error: string };

export async function getGeneratedContractDownloadUrl(
  contractId: string
): Promise<ContractDownloadUrlResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: row, error } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("id", contractId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Zmluva sa nenašla." };
  }

  const contract = normalizeGeneratedContract(row as GeneratedContractRow);
  const isOwner = contract.dj_id === authData.user.id;
  const isRecipient =
    contract.client_id === authData.user.id && !!contract.sent_to_client_at;
  if (!isOwner && !isRecipient) {
    return { ok: false, error: "Nemáš prístup k tejto zmluve." };
  }

  // PDF exists only after fill (pending_fill was sent without generating).
  if (contract.status === "pending_fill") {
    return {
      ok: false,
      error: isOwner
        ? "PDF ešte nie je hotové — zákazník musí najprv doplniť údaje."
        : "Najprv doplň údaje a ulož dokument — potom si ho môžeš stiahnuť.",
    };
  }

  const admin = storageAdmin();
  const { data: signed, error: signError } = await admin.storage
    .from(CONTRACT_PDFS_BUCKET)
    .createSignedUrl(contract.storage_path, 60 * 10);

  if (signError || !signed?.signedUrl) {
    console.error("[getGeneratedContractDownloadUrl]", signError);
    return { ok: false, error: "PDF sa nepodarilo otvoriť." };
  }

  return { ok: true, url: signed.signedUrl, fileName: contract.file_name };
}

export type SendContractResult =
  | { ok: true; contract: GeneratedContractRow }
  | { ok: false; error: string };

/** Marks a generated PDF as visible in the linked client's profile inbox + emails them. */
export async function sendGeneratedContractToClient(
  contractId: string
): Promise<SendContractResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  const { supabase, userId } = auth;

  const { data: existing, error: fetchError } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("id", contractId)
    .eq("dj_id", userId)
    .maybeSingle();

  if (fetchError || !existing) {
    return { ok: false, error: "Zmluva sa nenašla." };
  }

  const contract = normalizeGeneratedContract(existing as GeneratedContractRow);

  let clientId = contract.client_id;
  if (!clientId && contract.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, client_email")
      .eq("id", contract.booking_id)
      .eq("dj_id", userId)
      .maybeSingle();

    if (booking) {
      const linked = await resolveAndLinkBookingClient(supabase, booking);
      if (!linked.ok) {
        return { ok: false, error: linked.error };
      }
      clientId = linked.clientId;
    }
  }

  if (!clientId) {
    return {
      ok: false,
      error:
        "Táto rezervácia nie je prepojená s klientskym účtom — zmluvu nie je kam poslať.",
    };
  }

  const sentAt = new Date().toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("generated_contracts")
    .update({
      client_id: clientId,
      sent_to_client_at: sentAt,
      // Re-send marks the doc as unread again in the client inbox.
      client_seen_at: null,
    })
    .eq("id", contractId)
    .eq("dj_id", userId)
    .select("*")
    .single();

  if (updateError || !updated) {
    console.error("[sendGeneratedContractToClient]", updateError);
    return { ok: false, error: updateError?.message ?? "Odoslanie zlyhalo." };
  }

  // Resolve client e-mail from the linked booking (profiles has no email column).
  let clientEmail: string | null = null;
  if (contract.booking_id) {
    const { data: booking } = await supabase
      .from("bookings")
      .select("client_email")
      .eq("id", contract.booking_id)
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
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    ).replace(/\/$/, "");
    await sendContractDocumentEmail({
      clientEmail,
      clientName: contract.client_name,
      djName,
      documentName: contract.template_name || contract.file_name,
      documentsUrl: `${site}/client-dashboard/documents`,
      djEmail: (await supabase.auth.getUser()).data.user?.email,
      needsClientFill: contract.status === "pending_fill",
    });
  } else {
    console.warn(
      "[sendGeneratedContractToClient] no client email — inbox updated, e-mail skipped"
    );
  }

  return {
    ok: true,
    contract: normalizeGeneratedContract(updated as GeneratedContractRow),
  };
}

export type UnreadClientContractsResult =
  | { ok: true; count: number }
  | { ok: false; error: string };

/** Unread docs in the client's Dokumenty inbox (sent but not yet opened). */
export async function countClientUnreadContracts(): Promise<UnreadClientContractsResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { count, error } = await supabase
    .from("generated_contracts")
    .select("id", { count: "exact", head: true })
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .is("client_seen_at", null);

  if (error) {
    console.error("[countClientUnreadContracts]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, count: count ?? 0 };
}

export type MarkSeenResult = { ok: true } | { ok: false; error: string };

/** Marks all unread inbox documents as seen (clears the nav badge). */
export async function markClientContractsSeen(): Promise<MarkSeenResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  // Clients only have SELECT RLS on this table — mark-seen goes through the
  // service role after we verify the caller owns the unread rows.
  const { data: unread, error: listError } = await supabase
    .from("generated_contracts")
    .select("id")
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .is("client_seen_at", null);

  if (listError) {
    console.error("[markClientContractsSeen]", listError);
    return { ok: false, error: listError.message };
  }

  const ids = (unread ?? []).map((r) => r.id as string);
  if (ids.length === 0) return { ok: true };

  const admin = storageAdmin();
  const { error } = await admin
    .from("generated_contracts")
    .update({ client_seen_at: new Date().toISOString() })
    .in("id", ids)
    .eq("client_id", authData.user.id);

  if (error) {
    console.error("[markClientContractsSeen]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type ClientFillField = {
  placeholderKey: string;
  label: string;
  optional?: boolean;
};

export type GetClientFillFieldsResult =
  | {
      ok: true;
      contract: GeneratedContractRow;
      fields: ClientFillField[];
    }
  | { ok: false; error: string };

/** Returns client_input fields the recipient still needs to fill. */
export async function getClientContractFillFields(
  contractId: string
): Promise<GetClientFillFieldsResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  // Ownership check under client RLS (sent contracts only).
  const { data: row, error } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("id", contractId)
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Dokument sa nenašiel." };
  }

  const contract = normalizeGeneratedContract(row as GeneratedContractRow);
  if (!contract.template_id) {
    return { ok: false, error: "Šablóna dokumentu už nie je dostupná." };
  }

  // Placeholders are DJ-only under RLS — read via service role after ownership check.
  const admin = storageAdmin();
  const { data: placeholders, error: phError } = await admin
    .from("contract_placeholders")
    .select("*")
    .eq("template_id", contract.template_id)
    .eq("type", "client_input")
    .order("placeholder_key", { ascending: true });

  if (phError) {
    console.error("[getClientContractFillFields]", phError);
    return { ok: false, error: phError.message };
  }

  const fields = ((placeholders ?? []) as ContractPlaceholderRow[]).map(
    (p) => ({
      placeholderKey: p.placeholder_key,
      label: getPlaceholderDisplayLabel(p),
    })
  );

  const { data: billing } = await supabase
    .from("client_billing_profiles")
    .select("*")
    .eq("client_id", authData.user.id)
    .maybeSingle();

  const suggestedValues = prefillFromBilling(
    fields.map((f) => f.placeholderKey),
    (billing as ClientBillingProfileRow | null) ?? null
  );

  const mergedValues = {
    ...suggestedValues,
    ...contract.client_values,
  };

  return {
    ok: true,
    contract: { ...contract, client_values: mergedValues },
    fields,
  };
}

export type SubmitClientFillResult =
  | { ok: true; contract: GeneratedContractRow }
  | { ok: false; error: string };

/**
 * Client submits values for `client_input` placeholders, regenerates the PDF,
 * marks status as `filled`, and notifies the DJ.
 */
export async function submitClientContractFill(
  contractId: string,
  clientValues: Record<string, string>
): Promise<SubmitClientFillResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: row, error } = await supabase
    .from("generated_contracts")
    .select("*")
    .eq("id", contractId)
    .eq("client_id", authData.user.id)
    .not("sent_to_client_at", "is", null)
    .maybeSingle();

  if (error || !row) {
    return { ok: false, error: "Dokument sa nenašiel." };
  }

  const contract = normalizeGeneratedContract(row as GeneratedContractRow);
  if (contract.status !== "pending_fill") {
    return {
      ok: false,
      error:
        contract.status === "filled"
          ? "Dokument už bol vyplnený."
          : "Tento dokument nevyžaduje doplnenie údajov.",
    };
  }

  if (!contract.template_id || !contract.booking_id) {
    return { ok: false, error: "Dokument nemá prepojenú šablónu alebo rezerváciu." };
  }

  // Template/placeholder rows are DJ-scoped under RLS — use service role
  // after the client ownership check above.
  const admin = storageAdmin();

  const { data: placeholders, error: phError } = await admin
    .from("contract_placeholders")
    .select("*")
    .eq("template_id", contract.template_id);

  if (phError || !placeholders) {
    return { ok: false, error: "Premenné šablóny sa nenašli." };
  }

  const placeholderRows = placeholders as ContractPlaceholderRow[];
  const clientFields = placeholderRows.filter((p) => p.type === "client_input");
  if (clientFields.length === 0) {
    return { ok: false, error: "V šablóne nie sú polia na vyplnenie zákazníkom." };
  }

  const cleanedValues: Record<string, string> = {};
  for (const field of clientFields) {
    const value = clientValues[field.placeholder_key]?.trim() ?? "";
    if (!value) {
      return {
        ok: false,
        error: `Vyplň pole „${getPlaceholderDisplayLabel(field)}“.`,
      };
    }
    cleanedValues[field.placeholder_key] = value;
  }

  const { data: template, error: templateError } = await admin
    .from("contract_templates")
    .select("*")
    .eq("id", contract.template_id)
    .maybeSingle();

  if (templateError || !template) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  const { data: booking, error: bookingError } = await admin
    .from("bookings")
    .select(
      "id, client_name, client_email, client_phone, event_type, event_date, end_date, start_time, end_time, event_location, message, price, dj_offer_price, base_price"
    )
    .eq("id", contract.booking_id)
    .maybeSingle();

  if (bookingError || !booking) {
    return { ok: false, error: "Rezervácia sa nenašla." };
  }

  const { data: djProfile } = await admin
    .from("profiles")
    .select("full_name, real_first_name, real_last_name, phone")
    .eq("id", contract.dj_id)
    .maybeSingle();

  try {
    const values = resolveContractValues(
      placeholderRows,
      booking as ContractBookingData,
      (djProfile as ContractDjProfileData) ?? {
        full_name: null,
        real_first_name: null,
        real_last_name: null,
        phone: null,
      },
      contract.dj_manual_values,
      cleanedValues
    );

    const raw = (template as ContractTemplateRow).raw_content;
    const settings = parsePageSettingsFromHtml(raw);
    const html = renderContractHtml(normalizeContractHtmlForPdf(raw), values);
    const pdfBuffer = await renderHtmlToPdfBuffer(
      html,
      (template as ContractTemplateRow).template_name,
      settings
    );

    const { error: uploadError } = await admin.storage
      .from(CONTRACT_PDFS_BUCKET)
      .upload(contract.storage_path, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("[submitClientContractFill:upload]", uploadError);
      return { ok: false, error: "PDF sa nepodarilo uložiť." };
    }

    const filledAt = new Date().toISOString();
    const { data: updated, error: updateError } = await admin
      .from("generated_contracts")
      .update({
        status: "filled",
        client_values: cleanedValues,
        filled_at: filledAt,
        client_seen_at: filledAt,
      })
      .eq("id", contractId)
      .eq("client_id", authData.user.id)
      .select("*")
      .single();

    if (updateError || !updated) {
      console.error("[submitClientContractFill:update]", updateError);
      return { ok: false, error: updateError?.message ?? "Uloženie zlyhalo." };
    }

    // Notify DJ (best-effort — never block the client save).
    try {
      const { data: authUser } = await admin.auth.admin.getUserById(
        contract.dj_id
      );
      const djEmail = authUser.user?.email?.trim() || null;
      if (djEmail) {
        const site = (
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
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
          clientName: contract.client_name,
          documentName: contract.template_name || contract.file_name,
          dashboardUrl: `${site}/dashboard/contracts/generate`,
          clientEmail: authData.user.email,
        });
      }
    } catch (notifyErr) {
      console.error("[submitClientContractFill:notify]", notifyErr);
    }

    return {
      ok: true,
      contract: normalizeGeneratedContract(updated as GeneratedContractRow),
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nepodarilo sa uložiť dokument.";
    console.error("[submitClientContractFill]", err);
    return { ok: false, error: message };
  }
}
