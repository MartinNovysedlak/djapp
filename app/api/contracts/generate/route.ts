import { NextResponse } from "next/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
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
  type ContractTemplateRow,
  type GeneratedContractRow,
} from "@/lib/contracts/types";
import { resolveAndLinkBookingClient } from "@/lib/link-booking-client";

export const runtime = "nodejs";

type GenerateContractBody = {
  bookingId?: string;
  templateId?: string;
  manualValues?: Record<string, string>;
  /** When true: store (+ optionally send) without returning a PDF download. */
  sendToClient?: boolean;
};

function storageAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Generates a contract PDF for one booking from one of the DJ's templates.
 * Streams the PDF for download and keeps the last 30 generations per DJ.
 */
export async function POST(request: Request) {
  let body: GenerateContractBody;
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
    .from("contract_templates")
    .select("*")
    .eq("id", templateId)
    .eq("dj_id", djId)
    .maybeSingle();

  if (templateError || !template) {
    return NextResponse.json({ error: "Šablóna sa nenašla." }, { status: 404 });
  }

  const { data: placeholders, error: placeholdersError } = await supabase
    .from("contract_placeholders")
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
      "id, dj_id, client_id, client_name, client_email, client_phone, event_type, event_date, end_date, start_time, end_time, event_location, message, price, dj_offer_price, base_price"
    )
    .eq("id", bookingId)
    .eq("dj_id", djId)
    .maybeSingle();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Rezervácia sa nenašla." }, { status: 404 });
  }

  const { data: djProfile } = await supabase
    .from("profiles")
    .select("full_name, real_first_name, real_last_name, phone")
    .eq("id", djId)
    .maybeSingle();

  try {
    const bookingRow = booking as ContractBookingData & {
      client_id: string | null;
      client_email: string | null;
    };
    const placeholderRows = (placeholders ?? []) as ContractPlaceholderRow[];
    const djManual = manualValues ?? {};
    const needsClientFill = placeholderRows.some((p) => p.type === "client_input");

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

    const safeClient =
      bookingRow.client_name?.replace(/[^a-zA-Z0-9]+/g, "-") || "klient";
    const fileName = `zmluva-${safeClient}.pdf`;
    const storagePath = `${djId}/${Date.now()}-${safeClient}.pdf`;
    const admin = storageAdmin();

    // When sending for client fill, skip PDF generation — PDF is built after the
    // client submits their fields. Download mode still renders immediately.
    let pdfBuffer: Buffer | null = null;
    const skipPdfNow = sendToClient && needsClientFill;

    if (!skipPdfNow) {
      const values = resolveContractValues(
        placeholderRows,
        bookingRow,
        (djProfile as ContractDjProfileData) ?? {
          full_name: null,
          real_first_name: null,
          real_last_name: null,
          phone: null,
        },
        djManual,
        {}
      );

      const raw = (template as ContractTemplateRow).raw_content;
      const settings = parsePageSettingsFromHtml(raw);
      const html = renderContractHtml(normalizeContractHtmlForPdf(raw), values);

      pdfBuffer = await renderHtmlToPdfBuffer(
        html,
        (template as ContractTemplateRow).template_name,
        settings
      );

      const { error: uploadError } = await admin.storage
        .from(CONTRACT_PDFS_BUCKET)
        .upload(storagePath, pdfBuffer, {
          contentType: "application/pdf",
          upsert: false,
        });

      if (uploadError) {
        console.error("[contracts/generate:upload]", uploadError);
        return NextResponse.json(
          { error: "PDF sa nepodarilo uložiť." },
          { status: 500 }
        );
      }
    }

    const sentAt = sendToClient ? new Date().toISOString() : null;

    const { data: inserted, error: insertError } = await supabase
      .from("generated_contracts")
      .insert({
        dj_id: djId,
        booking_id: bookingId,
        template_id: templateId,
        client_id: bookingRow.client_id,
        client_name: bookingRow.client_name,
        template_name: (template as ContractTemplateRow).template_name,
        file_name: fileName,
        storage_path: storagePath,
        status: needsClientFill ? "pending_fill" : "complete",
        dj_manual_values: djManual,
        client_values: {},
        ...(sentAt
          ? { sent_to_client_at: sentAt, client_seen_at: null }
          : {}),
      })
      .select("*")
      .single();

    if (insertError || !inserted) {
      console.error("[contracts/generate:insert]", insertError);
      if (pdfBuffer) {
        await admin.storage.from(CONTRACT_PDFS_BUCKET).remove([storagePath]);
      }
      return NextResponse.json(
        { error: "Záznam zmluvy sa nepodarilo uložiť." },
        { status: 500 }
      );
    }

    // Keep only the newest GENERATED_CONTRACTS_LIMIT rows for this DJ.
    const { data: overflow } = await supabase
      .from("generated_contracts")
      .select("id, storage_path")
      .eq("dj_id", djId)
      .order("created_at", { ascending: false })
      .range(GENERATED_CONTRACTS_LIMIT, GENERATED_CONTRACTS_LIMIT + 50);

    if (overflow && overflow.length > 0) {
      const paths = overflow.map((r) => r.storage_path as string);
      const ids = overflow.map((r) => r.id as string);
      await admin.storage.from(CONTRACT_PDFS_BUCKET).remove(paths);
      await supabase.from("generated_contracts").delete().in("id", ids);
    }

    const saved = inserted as GeneratedContractRow;

    if (sendToClient) {
      // Notify client (best-effort) — same logic as sendGeneratedContractToClient.
      const clientEmail = bookingRow.client_email?.trim() || null;
      const djName =
        (djProfile as ContractDjProfileData | null)?.full_name?.trim() ||
        [
          (djProfile as ContractDjProfileData | null)?.real_first_name,
          (djProfile as ContractDjProfileData | null)?.real_last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim() ||
        "Umelec";

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
        contractId: saved.id,
        status: saved.status,
        sent: true,
      });
    }

    return new NextResponse(new Uint8Array(pdfBuffer!), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-Generated-Contract-Id": saved.id,
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nepodarilo sa vygenerovať PDF.";
    console.error("[contracts/generate]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
