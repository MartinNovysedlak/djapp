"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { sendBookingNotificationEmail } from "@/lib/email";
import {
  combineLocalDateTime,
  normalizeTime,
  rangesOverlap,
} from "@/lib/dates";
import {
  externalSlotsOverlap,
  fetchExternalBusySlots,
} from "@/lib/calendar/import-ics";

export type SubmitBookingInput = {
  djId: string;
  clientPhone: string;
  eventDate: string; // yyyy-mm-dd
  eventEndDate?: string; // yyyy-mm-dd — defaults to eventDate for single-day events
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  eventType: string;
  eventLocation: string;
  /** What the client wants / how they imagine the event */
  message: string;
  /** Approximate budget in EUR */
  clientBudget: number;
};

export type SubmitBookingResult = {
  ok: boolean;
  error?: string;
};

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Chýbajú Supabase serverové premenné prostredia.");
  }

  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type BusyRow = {
  event_date: string;
  end_date: string | null;
  start_time: string;
  end_time: string;
};

function bookingWindow(row: {
  event_date: string;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
}) {
  const endDate = row.end_date ?? row.event_date;
  const start = combineLocalDateTime(
    row.event_date,
    normalizeTime(row.start_time, "00:00")
  );
  const end = combineLocalDateTime(
    endDate,
    normalizeTime(row.end_time, "23:59")
  );
  return { start, end };
}

/**
 * Returns true when the proposed window overlaps an accepted booking for this DJ.
 */
export async function hasAcceptedConflict(
  djId: string,
  eventDate: string,
  eventEndDate: string,
  startTime: string,
  endTime: string,
  excludeBookingId?: string
): Promise<{ conflict: boolean; label?: string }> {
  const admin = getAdminClient();
  let query = admin
    .from("bookings")
    .select("id, event_date, end_date, start_time, end_time, type, title, event_type")
    .eq("dj_id", djId)
    .or("status.eq.accepted,type.eq.blockout");

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[hasAcceptedConflict]", error);
    return { conflict: false };
  }

  const proposed = bookingWindow({
    event_date: eventDate,
    end_date: eventEndDate,
    start_time: startTime,
    end_time: endTime,
  });

  if (!(proposed.start < proposed.end)) {
    return {
      conflict: true,
      label: "Koniec akcie musí byť po začiatku.",
    };
  }

  for (const row of (data ?? []) as (BusyRow & {
    type?: string | null;
    title?: string | null;
    event_type?: string | null;
  })[]) {
    const existing = bookingWindow(row);
    if (
      rangesOverlap(
        proposed.start,
        proposed.end,
        existing.start,
        existing.end
      )
    ) {
      const startLabel = normalizeTime(row.start_time);
      const endLabel = normalizeTime(row.end_time);
      const isBlockout = row.type === "blockout";
      const labelName = isBlockout
        ? row.title || "nedostupnosť"
        : row.event_type || "akcia";
      return {
        conflict: true,
        label: isBlockout
          ? `Umelec je v tomto čase nedostupný (${labelName}, ${startLabel}–${endLabel}). Vyber iný termín.`
          : `Umelec je v tomto čase obsadený (${startLabel}–${endLabel}). Vyber iný termín.`,
      };
    }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("external_calendar_url")
    .eq("id", djId)
    .maybeSingle();

  const icsUrl = profile?.external_calendar_url as string | null | undefined;
  if (icsUrl?.trim()) {
    const external = await fetchExternalBusySlots(icsUrl);
    const hit = externalSlotsOverlap(
      external,
      eventDate,
      eventEndDate,
      startTime,
      endTime
    );
    if (hit.conflict) {
      return {
        conflict: true,
        label: `Umelec je v tomto čase obsadený (osobný kalendár${
          hit.title ? `: ${hit.title}` : ""
        }). Vyber iný termín.`,
      };
    }
  }

  return { conflict: false };
}

/**
 * Persists a booking request from a logged-in client and notifies the DJ by
 * e-mail (stub / Resend). The caller's identity comes from their own session
 * (via the SSR client) — never trusted from client-supplied input — so
 * `client_id` always matches the real, authenticated account.
 */
export async function submitBooking(
  input: SubmitBookingInput
): Promise<SubmitBookingResult> {
  const clientPhone = input.clientPhone?.trim() || "";
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const startTime = normalizeTime(input.startTime, "");
  const endTime = normalizeTime(input.endTime, "");
  const eventType = input.eventType?.trim();
  const eventLocation = input.eventLocation?.trim();
  const message = input.message?.trim() || "";
  const clientBudget = Number(input.clientBudget);
  const djId = input.djId?.trim();

  if (
    !djId ||
    !eventDate ||
    !eventType ||
    !eventLocation ||
    !startTime ||
    !endTime ||
    !clientPhone ||
    !message
  ) {
    return {
      ok: false,
      error: "Prosím, vyplň všetky povinné údaje vrátane telefónu a popisu akcie.",
    };
  }
  if (!Number.isFinite(clientBudget) || clientBudget < 0) {
    return { ok: false, error: "Zadaj približný rozpočet v EUR." };
  }

  try {
    const ssr = await createSSRClient();
    const { data: authData, error: authError } = await ssr.auth.getUser();

    if (authError || !authData.user) {
      return {
        ok: false,
        error: "Pre odoslanie rezervácie sa musíš prihlásiť ako zákazník.",
      };
    }

    const clientId = authData.user.id;

    const { data: clientProfile } = await ssr
      .from("profiles")
      .select("role, full_name")
      .eq("id", clientId)
      .maybeSingle();

    if (clientProfile?.role === "dj") {
      return {
        ok: false,
        error: "Umelecké účty nemôžu odosielať rezervácie. Prihlás sa ako zákazník.",
      };
    }

    const conflict = await hasAcceptedConflict(
      djId,
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
          "Tento termín je už obsadený. Vyber iný dátum alebo čas.",
      };
    }

    const clientName = clientProfile?.full_name?.trim() || "Zákazník";
    const clientEmail = authData.user.email ?? "";

    const admin = getAdminClient();

    const { data: djProfile, error: djError } = await admin
      .from("profiles")
      .select("id, full_name")
      .eq("id", djId)
      .maybeSingle();

    if (djError || !djProfile) {
      return { ok: false, error: "Profil umelca sa nenašiel." };
    }

    const { error: insertError } = await ssr.from("bookings").insert({
      dj_id: djId,
      client_id: clientId,
      client_name: clientName,
      client_email: clientEmail,
      client_phone: clientPhone,
      event_date: eventDate,
      end_date: eventEndDate,
      start_time: startTime,
      end_time: endTime,
      event_type: eventType,
      event_location: eventLocation,
      message,
      client_budget: clientBudget,
      status: "pending",
      type: "booking",
    });

    if (insertError) {
      console.error("[submitBooking] insert error:", insertError);
      return {
        ok: false,
        error: insertError.message || "Dopyt sa nepodarilo uložiť.",
      };
    }

    let djEmail: string | null = null;
    try {
      const { data: userData, error: userError } =
        await admin.auth.admin.getUserById(djId);
      if (!userError && userData?.user?.email) {
        djEmail = userData.user.email;
      }
    } catch (err) {
      console.warn("[submitBooking] could not resolve DJ e-mail:", err);
    }

    if (djEmail) {
      // Never block the booking insert on mail failures.
      try {
        await sendBookingNotificationEmail(djEmail, eventType, eventDate, {
          djName: djProfile.full_name,
          eventLocation,
          clientName,
          clientEmail,
        });
      } catch (emailErr) {
        console.warn("[submitBooking] email notify failed:", emailErr);
      }
    } else {
      console.log(
        `[EMAIL SKIPPED]: DJ ${djId} nemá dostupný e-mail — rezervácia bola uložená.`
      );
    }

    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neznáma chyba pri odosielaní.";
    console.error("[submitBooking]", err);
    return { ok: false, error: message };
  }
}
