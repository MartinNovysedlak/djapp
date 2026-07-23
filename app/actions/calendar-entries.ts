"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  combineLocalDateTime,
  normalizeTime,
} from "@/lib/dates";
import { hasAcceptedConflict } from "@/app/actions/bookings";
import { requirePremiumAccess } from "@/lib/require-premium";

export type CalendarEntryResult = {
  ok: boolean;
  error?: string;
  id?: string;
};

async function requireDj() {
  const premium = await requirePremiumAccess();
  if (!premium.ok) {
    return { ok: false as const, error: premium.error };
  }

  const ssr = await createSSRClient();
  const { data: authData, error: authError } = await ssr.auth.getUser();

  if (authError || !authData.user) {
    return { ok: false as const, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await ssr
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "dj") {
    return { ok: false as const, error: "Len umelec môže spravovať kalendár." };
  }

  return { ok: true as const, ssr, djId: authData.user.id };
}

/**
 * DJ marks themselves unavailable (vacation, sick leave, etc.).
 * Stored as bookings.type = 'blockout', client_id = null, status = accepted.
 */
export async function createBlockout(input: {
  title: string;
  eventDate: string;
  eventEndDate?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
}): Promise<CalendarEntryResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const title = input.title?.trim();
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const allDay = Boolean(input.allDay);
  const startTime = allDay
    ? "00:00"
    : normalizeTime(input.startTime, "00:00");
  const endTime = allDay
    ? "23:59"
    : normalizeTime(input.endTime, "23:59");

  if (!title || !eventDate) {
    return { ok: false, error: "Vyplň názov a dátum." };
  }

  if (!allDay && (!input.startTime || !input.endTime)) {
    return { ok: false, error: "Vyber čas od–do, alebo zapni Celý deň." };
  }

  const windowStart = combineLocalDateTime(eventDate, startTime);
  const windowEnd = combineLocalDateTime(eventEndDate!, endTime);
  if (!(windowStart < windowEnd)) {
    return { ok: false, error: "Koniec musí byť po začiatku." };
  }

  const conflict = await hasAcceptedConflict(
    auth.djId,
    eventDate,
    eventEndDate!,
    startTime,
    endTime
  );
  if (conflict.conflict) {
    return {
      ok: false,
      error:
        conflict.label ??
        "Tento termín sa prekrýva s existujúcou rezerváciou alebo blokáciou.",
    };
  }

  const { data, error } = await auth.ssr
    .from("bookings")
    .insert({
      dj_id: auth.djId,
      client_id: null,
      client_name: title,
      client_email: null,
      event_date: eventDate,
      end_date: eventEndDate,
      start_time: startTime,
      end_time: endTime,
      event_type: "blockout",
      type: "blockout",
      title,
      all_day: allDay,
      status: "accepted",
      message: null,
      event_location: null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createBlockout]", error);
    return { ok: false, error: error.message || "Blokáciu sa nepodarilo uložiť." };
  }

  return { ok: true, id: data.id };
}

/**
 * DJ manually adds a busy event (external gig they booked themselves).
 * Stored as type = 'booking', status = accepted, client_id = null.
 */
export async function createDjOwnEvent(input: {
  title: string;
  eventType: string;
  eventDate: string;
  eventEndDate?: string;
  startTime: string;
  endTime: string;
  eventLocation?: string;
  clientEmail?: string;
  clientPhone?: string;
  price?: number;
}): Promise<CalendarEntryResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const title = input.title?.trim();
  const eventType = input.eventType?.trim();
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const startTime = normalizeTime(input.startTime, "");
  const endTime = normalizeTime(input.endTime, "");
  const eventLocation = input.eventLocation?.trim() || null;
  const clientEmail = input.clientEmail?.trim().toLowerCase() || null;
  const clientPhone = input.clientPhone?.trim() || null;
  const price =
    input.price != null && Number.isFinite(input.price) && input.price >= 0
      ? Number(input.price)
      : null;

  if (!title || !eventType || !eventDate || !startTime || !endTime) {
    return { ok: false, error: "Vyplň názov, typ akcie, dátum a čas." };
  }

  const windowStart = combineLocalDateTime(eventDate, startTime);
  const windowEnd = combineLocalDateTime(eventEndDate!, endTime);
  if (!(windowStart < windowEnd)) {
    return { ok: false, error: "Koniec musí byť po začiatku." };
  }

  const conflict = await hasAcceptedConflict(
    auth.djId,
    eventDate,
    eventEndDate!,
    startTime,
    endTime
  );
  if (conflict.conflict) {
    return {
      ok: false,
      error:
        conflict.label ??
        "Tento termín sa prekrýva s existujúcou rezerváciou alebo blokáciou.",
    };
  }

  const { data, error } = await auth.ssr
    .from("bookings")
    .insert({
      dj_id: auth.djId,
      client_id: null,
      client_name: title,
      client_email: clientEmail,
      client_phone: clientPhone,
      event_date: eventDate,
      end_date: eventEndDate,
      start_time: startTime,
      end_time: endTime,
      event_type: eventType,
      type: "booking",
      title,
      status: "accepted",
      message: null,
      event_location: eventLocation,
      price,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[createDjOwnEvent]", error);
    return { ok: false, error: error.message || "Akciu sa nepodarilo uložiť." };
  }

  return { ok: true, id: data.id };
}

/**
 * DJ deletes a blockout or a self-created calendar entry (no client_id).
 * Client bookings cannot be deleted this way from the calendar UI —
 * existing DJ delete RLS still applies, but we guard against deleting
 * client-linked rows here.
 */
export async function deleteCalendarEntry(
  bookingId: string
): Promise<CalendarEntryResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const id = bookingId?.trim();
  if (!id) return { ok: false, error: "Chýba ID záznamu." };

  const { data: row, error: fetchError } = await auth.ssr
    .from("bookings")
    .select("id, dj_id, client_id, type")
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !row) {
    return { ok: false, error: "Záznam sa nenašiel." };
  }

  if (row.dj_id !== auth.djId) {
    return { ok: false, error: "Nemáš oprávnenie zmazať tento záznam." };
  }

  // Allow deleting blockouts and DJ-owned events (no client account linked).
  if (row.type !== "blockout" && row.client_id !== null) {
    return {
      ok: false,
      error: "Klientsku rezerváciu zmaž v sekcii Rezervácie.",
    };
  }

  const { error } = await auth.ssr.from("bookings").delete().eq("id", id);

  if (error) {
    console.error("[deleteCalendarEntry]", error);
    return { ok: false, error: error.message || "Záznam sa nepodarilo zmazať." };
  }

  return { ok: true };
}

async function assertEditableEntry(
  ssr: Awaited<ReturnType<typeof createSSRClient>>,
  djId: string,
  bookingId: string
) {
  const { data: row, error } = await ssr
    .from("bookings")
    .select("id, dj_id, client_id, type")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !row) {
    return { ok: false as const, error: "Záznam sa nenašiel." };
  }
  if (row.dj_id !== djId) {
    return { ok: false as const, error: "Nemáš oprávnenie upraviť tento záznam." };
  }
  if (row.type !== "blockout" && row.client_id !== null) {
    return {
      ok: false as const,
      error: "Klientsku rezerváciu uprav v sekcii Rezervácie.",
    };
  }
  return { ok: true as const, row };
}

/**
 * Update a blockout (title, dates, all-day / times).
 */
export async function updateBlockout(input: {
  id: string;
  title: string;
  eventDate: string;
  eventEndDate?: string;
  allDay?: boolean;
  startTime?: string;
  endTime?: string;
}): Promise<CalendarEntryResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const id = input.id?.trim();
  if (!id) return { ok: false, error: "Chýba ID záznamu." };

  const gate = await assertEditableEntry(auth.ssr, auth.djId, id);
  if (!gate.ok) return { ok: false, error: gate.error };
  if (gate.row.type !== "blockout") {
    return { ok: false, error: "Tento záznam nie je blokácia." };
  }

  const title = input.title?.trim();
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const allDay = Boolean(input.allDay);
  const startTime = allDay
    ? "00:00"
    : normalizeTime(input.startTime, "00:00");
  const endTime = allDay
    ? "23:59"
    : normalizeTime(input.endTime, "23:59");

  if (!title || !eventDate) {
    return { ok: false, error: "Vyplň názov a dátum." };
  }
  if (!allDay && (!input.startTime || !input.endTime)) {
    return { ok: false, error: "Vyber čas od–do, alebo zapni Celý deň." };
  }

  const windowStart = combineLocalDateTime(eventDate, startTime);
  const windowEnd = combineLocalDateTime(eventEndDate!, endTime);
  if (!(windowStart < windowEnd)) {
    return { ok: false, error: "Koniec musí byť po začiatku." };
  }

  const conflict = await hasAcceptedConflict(
    auth.djId,
    eventDate,
    eventEndDate!,
    startTime,
    endTime,
    id
  );
  if (conflict.conflict) {
    return {
      ok: false,
      error:
        conflict.label ??
        "Tento termín sa prekrýva s existujúcou rezerváciou alebo blokáciou.",
    };
  }

  const { error } = await auth.ssr
    .from("bookings")
    .update({
      client_name: title,
      event_date: eventDate,
      end_date: eventEndDate,
      start_time: startTime,
      end_time: endTime,
      title,
      all_day: allDay,
      event_type: "blockout",
      type: "blockout",
      status: "accepted",
    })
    .eq("id", id);

  if (error) {
    console.error("[updateBlockout]", error);
    return { ok: false, error: error.message || "Blokáciu sa nepodarilo uložiť." };
  }

  return { ok: true, id };
}

/**
 * Update a DJ-owned calendar event (no client_id).
 */
export async function updateDjOwnEvent(input: {
  id: string;
  title: string;
  eventType: string;
  eventDate: string;
  eventEndDate?: string;
  startTime: string;
  endTime: string;
  eventLocation?: string;
}): Promise<CalendarEntryResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const id = input.id?.trim();
  if (!id) return { ok: false, error: "Chýba ID záznamu." };

  const gate = await assertEditableEntry(auth.ssr, auth.djId, id);
  if (!gate.ok) return { ok: false, error: gate.error };
  if (gate.row.type === "blockout") {
    return { ok: false, error: "Použi úpravu blokácie." };
  }

  const title = input.title?.trim();
  const eventType = input.eventType?.trim();
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const startTime = normalizeTime(input.startTime, "");
  const endTime = normalizeTime(input.endTime, "");
  const eventLocation = input.eventLocation?.trim() || null;

  if (!title || !eventType || !eventDate || !startTime || !endTime) {
    return { ok: false, error: "Vyplň názov, typ akcie, dátum a čas." };
  }

  const windowStart = combineLocalDateTime(eventDate, startTime);
  const windowEnd = combineLocalDateTime(eventEndDate!, endTime);
  if (!(windowStart < windowEnd)) {
    return { ok: false, error: "Koniec musí byť po začiatku." };
  }

  const conflict = await hasAcceptedConflict(
    auth.djId,
    eventDate,
    eventEndDate!,
    startTime,
    endTime,
    id
  );
  if (conflict.conflict) {
    return {
      ok: false,
      error:
        conflict.label ??
        "Tento termín sa prekrýva s existujúcou rezerváciou alebo blokáciou.",
    };
  }

  const { error } = await auth.ssr
    .from("bookings")
    .update({
      client_name: title,
      event_date: eventDate,
      end_date: eventEndDate,
      start_time: startTime,
      end_time: endTime,
      event_type: eventType,
      title,
      event_location: eventLocation,
      all_day: false,
      type: "booking",
      status: "accepted",
    })
    .eq("id", id);

  if (error) {
    console.error("[updateDjOwnEvent]", error);
    return { ok: false, error: error.message || "Akciu sa nepodarilo uložiť." };
  }

  return { ok: true, id };
}
