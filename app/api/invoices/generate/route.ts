import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { resolveInvoiceValues, renderInvoiceHtml } from "@/lib/invoices/render";
import { renderHtmlToPdfBuffer } from "@/lib/contracts/pdf";
import { normalizeContractHtmlForPdf } from "@/lib/contracts/normalize-html";
import { parsePageSettingsFromHtml } from "@/lib/contracts/page-spacers";
import {
  GENERATED_INVOICES_LIMIT,
  INVOICE_PDFS_BUCKET,
  type GeneratedInvoiceRow,
  type InvoiceBookingData,
  type InvoicePlaceholderRow,
  type InvoiceTemplateRow,
} from "@/lib/invoices/types";
import { resolveAndLinkBookingClient } from "@/lib/link-booking-client";
import {
  missingClientFillKeys,
  prefillFromBilling,
  type ClientBillingProfileRow,
  type ClientPersonType,
} from "@/lib/client-billing";
import { isCompanyOnlyPlaceholderKey, normalizeInvoicePlaceholderType } from "@/lib/invoices/classify";

export const runtime = "nodejs";

type GenerateInvoiceBody = {
  bookingId?: string;
  templateId?: string;
  manualValues?: Record<string, string>;
  sendToClient?: boolean;
};

function storageAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, (m ?? 1) - 1, d ?? 1);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Generates an invoice PDF (or pending_fill send) for one booking from an
 * invoice template. Mirrors /api/contracts/generate client-fill flow.
 */
export async function POST(request: Request) {
  let body: GenerateInvoiceBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
  }

  const { bookingId, templateId, manualValues, sendToClient = false } = body;
  if (!bookingId || !templateId) {
    return NextResponse.json(
      { error: "Chýba bookingId alebo templateId." },
      { status: 400 }
    );
  }

  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Musíš byť prihlásený." }, { status: 401 });
  }
  const djId = authData.user.id;

  const { data: template, error: templateError } = await supabase
    .from("invoice_templates")
    .select("*")
    .eq("id", templateId)
    .eq("dj_id", djId)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: "Šablóna sa nenašla." }, { status: 404 });
  }

  const { data: placeholders, error: placeholdersError } = await supabase
    .from("invoice_placeholders")
    .select("*")
    .eq("template_id", templateId);

  if (placeholdersError) {
    return NextResponse.json(
      { error: "Premenné šablóny sa nenašli." },
      { status: 500 }
    );
  }

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .select(
      "id, dj_id, client_id, client_name, client_email, client_phone, event_type, event_date, end_date, event_location"
    )
    .eq("id", bookingId)
    .eq("dj_id", djId)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Rezervácia sa nenašla." }, { status: 404 });
  }

  const { data: billingRow } = await supabase
    .from("dj_billing_profiles")
    .select("default_due_days")
    .eq("dj_id", djId)
    .maybeSingle();

  const { data: numberData, error: numberError } = await supabase.rpc(
    "next_invoice_number"
  );
  if (numberError || !numberData) {
    console.error("[invoices/generate:number]", numberError);
    return NextResponse.json(
      { error: "Číslo faktúry sa nepodarilo vygenerovať." },
      { status: 500 }
    );
  }
  const invoiceNumber = numberData as string;

  try {
    const bookingRow = booking as InvoiceBookingData & {
      client_id: string | null;
      client_email: string | null;
    };
    const placeholderRows = (
      (placeholders ?? []) as InvoicePlaceholderRow[]
    ).map(normalizeInvoicePlaceholderType);
    const djManual = manualValues ?? {};

    if (sendToClient) {
      const linked = await resolveAndLinkBookingClient(supabase, {
        id: bookingRow.id,
        client_id: bookingRow.client_id,
        client_email: bookingRow.client_email,
      });
      if (!linked.ok) {
        return NextResponse.json({ error: linked.error }, { status: 400 });
      }
      bookingRow.client_id = linked.clientId;
    }

    const clientPlaceholders = placeholderRows.filter(
      (p) => p.type === "client_input"
    );
    const clientKeys = clientPlaceholders.map((p) => p.placeholder_key);

    let personType: ClientPersonType = "individual";
    let prefilledClientValues: Record<string, string> = {};

    let profilePhone: string | null = null;
    if (bookingRow.client_id) {
      const [{ data: billing }, { data: profile }] = await Promise.all([
        supabase
          .from("client_billing_profiles")
          .select("*")
          .eq("client_id", bookingRow.client_id)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("phone")
          .eq("id", bookingRow.client_id)
          .maybeSingle(),
      ]);

      const clientBilling = billing as ClientBillingProfileRow | null;
      personType = clientBilling?.person_type ?? "individual";
      profilePhone = profile?.phone ?? null;
      prefilledClientValues = prefillFromBilling(clientKeys, clientBilling, {
        phone: bookingRow.client_phone || profilePhone,
        clientName: bookingRow.client_name,
      });

      if (personType === "individual") {
        for (const key of clientKeys) {
          if (isCompanyOnlyPlaceholderKey(key) && !prefilledClientValues[key]) {
            prefilledClientValues[key] = "—";
          }
        }
      }
    } else if (clientKeys.length > 0) {
      prefilledClientValues = prefillFromBilling(clientKeys, null, {
        phone: bookingRow.client_phone,
        clientName: bookingRow.client_name,
      });
    }

    const stillMissing = missingClientFillKeys(
      clientKeys,
      prefilledClientValues,
      personType
    );
    const needsClientFill = stillMissing.length > 0;

    // When DJ downloads without sending, still allow PDF if they typed
    // client fields themselves via manualValues — merge any overlap.
    if (!sendToClient) {
      for (const key of clientKeys) {
        const fromDj = djManual[key]?.trim();
        if (fromDj && !prefilledClientValues[key]) {
          prefilledClientValues[key] = fromDj;
        }
      }
    }

    const issueDate = new Date().toISOString().slice(0, 10);
    const dueDate = addDays(
      issueDate,
      (billingRow as { default_due_days?: number } | null)?.default_due_days ?? 14
    );
    const variableSymbol = invoiceNumber.replace(/\D/g, "");

    const safeClient =
      bookingRow.client_name?.replace(/[^a-zA-Z0-9]+/g, "-") || "klient";
    const fileName = `faktura-${invoiceNumber}-${safeClient}.pdf`;
    const storagePath = `${djId}/${Date.now()}-${invoiceNumber}.pdf`;
    const admin = storageAdmin();

    let pdfBuffer: Buffer | null = null;
    const skipPdfNow = sendToClient && needsClientFill;

    if (!skipPdfNow) {
      const values = resolveInvoiceValues(
        placeholderRows,
        {
          booking: bookingRow,
          computed: { invoiceNumber, issueDate, dueDate, variableSymbol },
        },
        djManual,
        prefilledClientValues
      );

      const raw = (template as InvoiceTemplateRow).raw_content;
      const settings = parsePageSettingsFromHtml(raw);
      const html = renderInvoiceHtml(normalizeContractHtmlForPdf(raw), values);

      pdfBuffer = await renderHtmlToPdfBuffer(
        html,
        (template as InvoiceTemplateRow).template_name,
        settings
      );

      const { error: uploadError } = await admin.storage
        .from(INVOICE_PDFS_BUCKET)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("[invoices/generate:upload]", uploadError);
        return NextResponse.json(
          { error: "PDF sa nepodarilo uložiť." },
          { status: 500 }
        );
      }
    }

    const sentAt = sendToClient ? new Date().toISOString() : null;

    const { data: inserted, error: insertError } = await supabase
      .from("generated_invoices")
      .insert({
        dj_id: djId,
        booking_id: bookingId,
        template_id: templateId,
        client_id: bookingRow.client_id,
        client_name: bookingRow.client_name,
        template_name: (template as InvoiceTemplateRow).template_name,
        invoice_number: invoiceNumber,
        file_name: fileName,
        storage_path: storagePath,
        status: needsClientFill ? "pending_fill" : "complete",
        dj_manual_values: djManual,
        client_values: prefilledClientValues,
        ...(sentAt ? { sent_to_client_at: sentAt, client_seen_at: null } : {}),
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("[invoices/generate:insert]", insertError);
      if (pdfBuffer) {
        await admin.storage.from(INVOICE_PDFS_BUCKET).remove([storagePath]);
      }
      return NextResponse.json(
        { error: "Záznam faktúry sa nepodarilo uložiť." },
        { status: 500 }
      );
    }

    const { data: overflow } = await supabase
      .from("generated_invoices")
      .select("id, storage_path")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .range(GENERATED_INVOICES_LIMIT, GENERATED_INVOICES_LIMIT + 50);

    if (overflow && overflow.length > 0) {
      const paths = overflow.map((r) => r.storage_path as string);
      const ids = overflow.map((r) => r.id as string);
      await admin.storage.from(INVOICE_PDFS_BUCKET).remove(paths);
      await supabase.from("generated_invoices").delete().in("id", ids);
    }

    const saved = inserted as GeneratedInvoiceRow;

    if (sendToClient) {
      const clientEmail = bookingRow.client_email?.trim() || null;
      const { data: djProfile } = await supabase
        .from("profiles")
        .select("full_name, real_first_name, real_last_name")
        .eq("id", djId)
        .maybeSingle();
      const djName =
        djProfile?.full_name?.trim() ||
        [djProfile?.real_first_name, djProfile?.real_last_name]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "DJ";

      if (clientEmail) {
        const site = (
          process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
        ).replace(/\/$/, "");
        const { sendContractDocumentEmail } = await import("@/lib/email");
        await sendContractDocumentEmail({
          clientEmail,
          clientName: bookingRow.client_name,
          djName,
          documentName: saved.template_name || saved.file_name,
          documentsUrl: `${site}/client-dashboard/documents`,
          djEmail: authData.user.email,
          needsClientFill,
        });
      }

      return NextResponse.json({
        ok: true,
        invoiceId: saved.id,
        status: saved.status,
        sent: true,
      });
    }

    return new NextResponse(new Uint8Array(pdfBuffer!), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Generated-Invoice-Id": saved.id,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nepodarilo sa vygenerovať PDF.";
    console.error("[invoices/generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
