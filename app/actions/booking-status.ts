"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { sendBookingStatusEmail } from "@/lib/email";
import { hasAcceptedConflict } from "@/app/actions/bookings";
import { normalizeTime } from "@/lib/dates";
import { EVENT_TYPE_LABELS } from "@/lib/event-types";

export type BookingStatusResult = {
  ok: boolean;
  error?: string;
};

/**
 * DJ accepts a pending booking request. Uses the caller's own SSR session —
 * the UPDATE is scoped by RLS to `auth.uid() = dj_id`, so a DJ can only ever
 * touch their own bookings.
 */
export async function acceptBooking(bookingId: string): Promise<BookingStatusResult> {
  return updateBookingStatus(bookingId, "accepted");
}

/** DJ rejects a pending booking request and must provide a reason. */
export async function rejectBooking(
  bookingId: string,
  reason: string
): Promise<BookingStatusResult> {
  if (!reason.trim()) {
    return { ok: false, error: "Zadaj dôvod zamietnutia." };
  }
  return updateBookingStatus(bookingId, "rejected", reason.trim());
}

/**
 * Client confirms DJ's price offer → booking becomes accepted.
 * Uses service role after auth check (clients typically can't UPDATE bookings).
 */
export async function confirmClientBookingOffer(
  bookingId: string
): Promise<BookingStatusResult> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select(
        "id, client_id, status, dj_offer_price, dj_id, event_date, end_date, start_time, end_time, bulk_inquiry_id, event_type, client_email, client_name"
      )
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== authData.user.id) {
      return { ok: false, error: "Rezervácia sa nenašla." };
    }
    if (booking.status !== "pending") {
      return { ok: false, error: "Túto rezerváciu už nie je možné potvrdiť." };
    }
    if (booking.dj_offer_price == null) {
      return {
        ok: false,
        error: "Umelec ešte neposlal ponuku. Počkaj na cenu, alebo chatujte.",
      };
    }
    if (booking.bulk_inquiry_id) {
      return {
        ok: false,
        error: "Skupinový dopyt potvrď v sekcii Dopyty.",
      };
    }

    const conflict = await hasAcceptedConflict(
      booking.dj_id,
      booking.event_date,
      booking.end_date ?? booking.event_date,
      normalizeTime(booking.start_time),
      normalizeTime(booking.end_time),
      booking.id
    );
    if (conflict.conflict) {
      return {
        ok: false,
        error:
          conflict.label ??
          "Termín sa medzitým obsadil. Napíš umelcovi do chatu.",
      };
    }

    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const offerPrice = Number(booking.dj_offer_price);
    const { error } = await admin
      .from("bookings")
      .update({
        status: "accepted",
        price: offerPrice,
        rejection_reason: null,
      })
      .eq("id", bookingId);

    if (error) return { ok: false, error: error.message };

    try {
      const { data: djProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", booking.dj_id)
        .maybeSingle();
      const { data: djUser } = await admin.auth.admin.getUserById(booking.dj_id);
      if (djUser.user?.email) {
        await sendBookingStatusEmail(
          djUser.user.email,
          "accepted",
          booking.event_type,
          booking.event_date,
          {
            djName: djProfile?.full_name,
            clientName: booking.client_name,
          }
        );
      }
    } catch (emailErr) {
      console.warn("[confirmClientBookingOffer] email failed:", emailErr);
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Potvrdenie zlyhalo.";
    return { ok: false, error: msg };
  }
}

/** Client declines DJ offer on a single (non-bulk) booking. */
export async function declineClientBookingOffer(
  bookingId: string,
  reason?: string
): Promise<BookingStatusResult> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, client_id, status, dj_offer_price, bulk_inquiry_id, dj_id, event_type, event_date, client_name")
      .eq("id", bookingId)
      .maybeSingle();

    if (!booking || booking.client_id !== authData.user.id) {
      return { ok: false, error: "Rezervácia sa nenašla." };
    }
    if (booking.status !== "pending") {
      return { ok: false, error: "Túto rezerváciu už nie je možné odmietnuť." };
    }
    if (booking.bulk_inquiry_id) {
      return { ok: false, error: "Skupinový dopyt rieš v sekcii Dopyty." };
    }

    const { createClient: createServiceClient } = await import(
      "@supabase/supabase-js"
    );
    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await admin
      .from("bookings")
      .update({
        status: "rejected",
        rejection_reason:
          reason?.trim() || "Klient odmietol ponuku umelca.",
      })
      .eq("id", bookingId);

    if (error) return { ok: false, error: error.message };

    try {
      const { data: djUser } = await admin.auth.admin.getUserById(booking.dj_id);
      if (djUser.user?.email) {
        await sendBookingStatusEmail(
          djUser.user.email,
          "rejected",
          booking.event_type,
          booking.event_date,
          {
            clientName: booking.client_name,
            rejectionReason: reason?.trim() || "Klient odmietol ponuku.",
          }
        );
      }
    } catch {
      /* ignore */
    }

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Odmietnutie zlyhalo.";
    return { ok: false, error: msg };
  }
}

async function updateBookingStatus(
  bookingId: string,
  status: "accepted" | "rejected",
  rejectionReason?: string
): Promise<BookingStatusResult> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    if (status === "accepted") {
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, event_date, end_date, start_time, end_time, dj_id")
        .eq("id", bookingId)
        .eq("dj_id", authData.user.id)
        .maybeSingle();

      if (!booking) {
        return {
          ok: false,
          error: "Rezervácia sa nenašla, alebo nemáš oprávnenie ju upraviť.",
        };
      }

      const conflict = await hasAcceptedConflict(
        booking.dj_id,
        booking.event_date,
        booking.end_date ?? booking.event_date,
        normalizeTime(booking.start_time),
        normalizeTime(booking.end_time),
        booking.id
      );
      if (conflict.conflict) {
        return {
          ok: false,
          error:
            conflict.label ??
            "Tento termín sa prekrýva s inou potvrdenou akciou.",
        };
      }
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        status,
        rejection_reason: status === "rejected" ? rejectionReason : null,
      })
      .eq("id", bookingId)
      .eq("dj_id", authData.user.id)
      .select("id, client_email, client_name, event_type, event_date, dj_id")
      .maybeSingle();

    if (error) {
      console.error("[updateBookingStatus]", error);
      return { ok: false, error: error.message };
    }
    if (!updated) {
      return {
        ok: false,
        error: "Rezervácia sa nenašla, alebo nemáš oprávnenie ju upraviť.",
      };
    }

    try {
      const { data: djProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", updated.dj_id)
        .maybeSingle();

      if (updated.client_email) {
        await sendBookingStatusEmail(
          updated.client_email,
          status,
          updated.event_type,
          updated.event_date,
          {
            djName: djProfile?.full_name,
            clientName: updated.client_name,
            djEmail: authData.user.email,
            rejectionReason,
          }
        );
      }
    } catch (emailErr) {
      console.warn("[updateBookingStatus] email notify failed:", emailErr);
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[updateBookingStatus]", err);
    return { ok: false, error: message };
  }
}

export type UpdateBookingDetailsInput = {
  bookingId: string;
  eventType: string;
  eventDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  eventLocation?: string | null;
  message?: string | null;
  clientPhone?: string | null;
  clientName?: string | null;
};

export type UpdateBookingDetailsResult =
  | {
      ok: true;
      booking: {
        id: string;
        client_name: string | null;
        client_phone: string | null;
        event_type: string;
        event_date: string;
        end_date: string | null;
        start_time: string | null;
        end_time: string | null;
        event_location: string | null;
        message: string | null;
        status: string;
      };
    }
  | { ok: false; error: string };

/** DJ edits details of an existing booking (time, type, location, …). */
export async function updateBookingDetails(
  input: UpdateBookingDetailsInput
): Promise<UpdateBookingDetailsResult> {
  const bookingId = input.bookingId?.trim();
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const eventType = input.eventType?.trim();
  const eventDate = input.eventDate?.trim();
  if (!eventType || !eventDate) {
    return { ok: false, error: "Vyplň typ akcie a dátum." };
  }
  if (!(eventType in EVENT_TYPE_LABELS) && eventType !== "blockout") {
    // Allow known labels + any custom leftover values already in DB.
  }

  const endDate = (input.endDate?.trim() || eventDate) || eventDate;
  const startTime = input.startTime?.trim()
    ? normalizeTime(input.startTime)
    : null;
  const endTime = input.endTime?.trim() ? normalizeTime(input.endTime) : null;

  if (endDate < eventDate) {
    return { ok: false, error: "Dátum konca nemôže byť pred začiatkom." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: existing, error: fetchError } = await supabase
      .from("bookings")
      .select("id, dj_id, status, type")
      .eq("id", bookingId)
      .eq("dj_id", authData.user.id)
      .maybeSingle();

    if (fetchError || !existing) {
      return {
        ok: false,
        error: "Rezervácia sa nenašla, alebo nemáš oprávnenie ju upraviť.",
      };
    }

    if (existing.type === "blockout") {
      return { ok: false, error: "Blokáciu uprav v kalendári." };
    }

    if (existing.status === "accepted") {
      const conflict = await hasAcceptedConflict(
        authData.user.id,
        eventDate,
        endDate,
        startTime ?? "00:00",
        endTime ?? "23:59",
        bookingId
      );
      if (conflict.conflict) {
        return {
          ok: false,
          error:
            conflict.label ??
            "Tento termín sa prekrýva s inou potvrdenou akciou.",
        };
      }
    }

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({
        event_type: eventType,
        event_date: eventDate,
        end_date: endDate === eventDate ? null : endDate,
        start_time: startTime,
        end_time: endTime,
        event_location: input.eventLocation?.trim() || null,
        message: input.message?.trim() || null,
        client_phone: input.clientPhone?.trim() || null,
        client_name: input.clientName?.trim() || null,
      })
      .eq("id", bookingId)
      .eq("dj_id", authData.user.id)
      .select(
        "id, client_name, client_phone, event_type, event_date, end_date, start_time, end_time, event_location, message, status"
      )
      .maybeSingle();

    if (error || !updated) {
      console.error("[updateBookingDetails]", error);
      return {
        ok: false,
        error: error?.message ?? "Uloženie rezervácie zlyhalo.",
      };
    }

    return { ok: true, booking: updated };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[updateBookingDetails]", err);
    return { ok: false, error: message };
  }
}

export type PdfDeliveryStatus =
  | "none"
  | "manual_sent"
  | "email_sent"
  | "confirmed_in_person"
  | "printed_handed"
  | "other";

const PDF_DELIVERY_STATUSES: readonly PdfDeliveryStatus[] = [
  "none",
  "manual_sent",
  "email_sent",
  "confirmed_in_person",
  "printed_handed",
  "other",
] as const;

export type UpdatePdfDeliveryStatusResult =
  | { ok: true; status: PdfDeliveryStatus | null }
  | { ok: false; error: string };

/** Manual PDF/contract delivery note when no generated contract exists. */
export async function updateBookingPdfDeliveryStatus(
  bookingId: string,
  status: PdfDeliveryStatus
): Promise<UpdatePdfDeliveryStatusResult> {
  const id = bookingId?.trim();
  if (!id) return { ok: false, error: "Chýba ID rezervácie." };
  if (!PDF_DELIVERY_STATUSES.includes(status)) {
    return { ok: false, error: "Neplatný stav doručenia." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const stored = status === "none" ? null : status;

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ pdf_delivery_status: stored })
      .eq("id", id)
      .eq("dj_id", authData.user.id)
      .select("id, pdf_delivery_status")
      .maybeSingle();

    if (error || !updated) {
      console.error("[updateBookingPdfDeliveryStatus]", error);
      return {
        ok: false,
        error: error?.message ?? "Uloženie stavu zmluvy zlyhalo.",
      };
    }

    return {
      ok: true,
      status: (updated.pdf_delivery_status as PdfDeliveryStatus | null) ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[updateBookingPdfDeliveryStatus]", err);
    return { ok: false, error: message };
  }
}

/** Manual invoice delivery note when no generated invoice exists. */
export async function updateBookingInvoiceDeliveryStatus(
  bookingId: string,
  status: PdfDeliveryStatus
): Promise<UpdatePdfDeliveryStatusResult> {
  const id = bookingId?.trim();
  if (!id) return { ok: false, error: "Chýba ID rezervácie." };
  if (!PDF_DELIVERY_STATUSES.includes(status)) {
    return { ok: false, error: "Neplatný stav doručenia." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const stored = status === "none" ? null : status;

    const { data: updated, error } = await supabase
      .from("bookings")
      .update({ invoice_delivery_status: stored })
      .eq("id", id)
      .eq("dj_id", authData.user.id)
      .select("id, invoice_delivery_status")
      .maybeSingle();

    if (error || !updated) {
      console.error("[updateBookingInvoiceDeliveryStatus]", error);
      return {
        ok: false,
        error: error?.message ?? "Uloženie stavu faktúry zlyhalo.",
      };
    }

    return {
      ok: true,
      status:
        (updated.invoice_delivery_status as PdfDeliveryStatus | null) ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[updateBookingInvoiceDeliveryStatus]", err);
    return { ok: false, error: message };
  }
}

/**
 * DJ permanently deletes any of their bookings (platform or self-added).
 * Blockouts stay managed from the calendar.
 */
export async function deleteDjBooking(
  bookingId: string
): Promise<BookingStatusResult> {
  const id = bookingId?.trim();
  if (!id) return { ok: false, error: "Chýba ID rezervácie." };

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: row, error: fetchError } = await supabase
      .from("bookings")
      .select("id, dj_id, type")
      .eq("id", id)
      .eq("dj_id", authData.user.id)
      .maybeSingle();

    if (fetchError || !row) {
      return {
        ok: false,
        error: "Rezervácia sa nenašla, alebo nemáš oprávnenie ju zmazať.",
      };
    }

    if (row.type === "blockout") {
      return { ok: false, error: "Blokáciu zmaž v kalendári." };
    }

    const { error } = await supabase.from("bookings").delete().eq("id", id);
    if (error) {
      console.error("[deleteDjBooking]", error);
      return {
        ok: false,
        error: error.message || "Rezerváciu sa nepodarilo zmazať.",
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[deleteDjBooking]", err);
    return { ok: false, error: message };
  }
}
