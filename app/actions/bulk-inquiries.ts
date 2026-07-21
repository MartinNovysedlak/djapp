"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { hasAcceptedConflict } from "@/app/actions/bookings";
import {
  sendBookingNotificationEmail,
  sendBookingStatusEmail,
} from "@/lib/email";
import { normalizeTime } from "@/lib/dates";
import { rejectBooking } from "@/app/actions/booking-status";

export type BulkInquiryInput = {
  djIds: string[];
  clientPhone: string;
  eventDate: string;
  eventEndDate?: string;
  startTime: string;
  endTime: string;
  eventType: string;
  eventLocation: string;
  message?: string;
  genre?: string;
  /** Approximate budget in EUR */
  clientBudget: number;
};

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function submitBulkInquiry(
  input: BulkInquiryInput
): Promise<
  { ok: true; inquiryId: string } | { ok: false; error: string }
> {
  const djIds = [...new Set(input.djIds.map((id) => id.trim()).filter(Boolean))];
  const clientPhone = input.clientPhone?.trim() || "";
  const eventDate = input.eventDate?.trim();
  const eventEndDate = input.eventEndDate?.trim() || eventDate;
  const startTime = normalizeTime(input.startTime, "");
  const endTime = normalizeTime(input.endTime, "");
  const eventType = input.eventType?.trim();
  const eventLocation = input.eventLocation?.trim();
  const message = input.message?.trim() || null;
  const genre = input.genre?.trim() || null;
  const clientBudget = Number(input.clientBudget);

  if (djIds.length < 1 || djIds.length > 4) {
    return { ok: false, error: "Vyber 1 až 4 umelcov." };
  }
  if (
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
      error: "Prosím, vyplň všetky povinné údaje vrátane telefónu a popisu.",
    };
  }
  if (!Number.isFinite(clientBudget) || clientBudget < 0) {
    return { ok: false, error: "Zadaj približný rozpočet v EUR." };
  }

  try {
    const ssr = await createSSRClient();
    const { data: authData } = await ssr.auth.getUser();
    if (!authData.user) {
      return {
        ok: false,
        error: "Pre odoslanie dopytu sa musíš prihlásiť ako zákazník.",
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
        error: "Umelecké účty nemôžu odosielať dopyty. Prihlás sa ako zákazník.",
      };
    }

    const admin = adminClient();
    const { data: djProfiles, error: djErr } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .in("id", djIds);

    if (djErr || !djProfiles || djProfiles.length !== djIds.length) {
      return { ok: false, error: "Niektorý z vybraných profilov sa nenašiel." };
    }
    if (djProfiles.some((d) => d.role !== "dj")) {
      return { ok: false, error: "Vybraný účet nie je umelecký profil." };
    }

    for (const djId of djIds) {
      const conflict = await hasAcceptedConflict(
        djId,
        eventDate,
        eventEndDate!,
        startTime,
        endTime
      );
      if (conflict.conflict) {
        const name =
          djProfiles.find((d) => d.id === djId)?.full_name || "Umelec";
        return {
          ok: false,
          error: `${name}: ${conflict.label ?? "termín je obsadený."}`,
        };
      }
    }

    const clientName = clientProfile?.full_name?.trim() || "Zákazník";
    const clientEmail = authData.user.email ?? "";

    // Service role insert avoids RLS recursion between inquiries <-> items
    const { data: inquiry, error: inquiryError } = await admin
      .from("bulk_inquiries")
      .insert({
        client_id: clientId,
        event_date: eventDate,
        end_date: eventEndDate,
        start_time: startTime,
        end_time: endTime,
        event_type: eventType,
        event_location: eventLocation,
        message,
        genre,
        client_budget: clientBudget,
        max_djs: djIds.length,
        status: "open",
      })
      .select("id")
      .single();

    if (inquiryError || !inquiry) {
      return {
        ok: false,
        error: inquiryError?.message || "Dopyt sa nepodarilo vytvoriť.",
      };
    }

    const inquiryId = inquiry.id as string;

    for (const djId of djIds) {
      const { data: booking, error: bookingError } = await admin
        .from("bookings")
        .insert({
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
          message: message
            ? `[Hromadný dopyt · rozpočet cca ${clientBudget} €] ${message}`
            : `[Hromadný dopyt · rozpočet cca ${clientBudget} €] Prosím o ponuku.`,
          status: "pending",
          type: "booking",
          bulk_inquiry_id: inquiryId,
          client_budget: clientBudget,
        })
        .select("id")
        .single();

      if (bookingError || !booking) {
        await admin.from("bulk_inquiries").delete().eq("id", inquiryId);
        return {
          ok: false,
          error: bookingError?.message || "Rezerváciu sa nepodarilo vytvoriť.",
        };
      }

      const { error: itemError } = await admin.from("bulk_inquiry_items").insert({
        inquiry_id: inquiryId,
        dj_id: djId,
        booking_id: booking.id,
        item_status: "pending",
      });

      if (itemError) {
        await admin.from("bulk_inquiries").delete().eq("id", inquiryId);
        return { ok: false, error: itemError.message };
      }

      try {
        const { data: userData } = await admin.auth.admin.getUserById(djId);
        const djEmail = userData?.user?.email;
        const djName = djProfiles.find((d) => d.id === djId)?.full_name;
        if (djEmail) {
          await sendBookingNotificationEmail(djEmail, eventType, eventDate, {
            djName,
            eventLocation,
            clientName,
            clientEmail,
          });
        }
      } catch (err) {
        console.warn("[submitBulkInquiry] email failed", err);
      }
    }

    return { ok: true, inquiryId };
  } catch (err) {
    const msg =
      err instanceof Error ? err.message : "Neznáma chyba pri odosielaní.";
    return { ok: false, error: msg };
  }
}

export async function submitDjOffer(input: {
  bookingId: string;
  offerPrice: number;
  offerMessage?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const bookingId = input.bookingId?.trim();
  const price = Number(input.offerPrice);
  const offerMessage = input.offerMessage?.trim() || null;

  if (!bookingId || !Number.isFinite(price) || price < 0) {
    return { ok: false, error: "Zadaj platnú cenu ponuky." };
  }

  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: booking } = await ssr
    .from("bookings")
    .select("id, dj_id, status, bulk_inquiry_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.dj_id !== authData.user.id) {
    return { ok: false, error: "Nemáš prístup k tejto rezervácii." };
  }
  if (booking.status !== "pending") {
    return { ok: false, error: "Ponuku môžeš poslať len pri čakajúcej rezervácii." };
  }

  if (booking.bulk_inquiry_id) {
    const { error: itemError } = await ssr
      .from("bulk_inquiry_items")
      .update({
        offer_price: price,
        offer_message: offerMessage,
        item_status: "offered",
      })
      .eq("booking_id", bookingId)
      .eq("dj_id", authData.user.id);

    if (itemError) return { ok: false, error: itemError.message };
  }

  const { error: bookingError } = await ssr
    .from("bookings")
    .update({
      price,
      dj_offer_price: price,
      dj_offer_message: offerMessage,
    })
    .eq("id", bookingId);

  if (bookingError) return { ok: false, error: bookingError.message };
  return { ok: true };
}

export async function declineBulkItem(
  bookingId: string,
  reason?: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: booking } = await ssr
    .from("bookings")
    .select("id, dj_id, bulk_inquiry_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.dj_id !== authData.user.id) {
    return { ok: false, error: "Nemáš prístup." };
  }

  if (booking.bulk_inquiry_id) {
    await ssr
      .from("bulk_inquiry_items")
      .update({ item_status: "declined" })
      .eq("booking_id", bookingId)
      .eq("dj_id", authData.user.id);
  }

  const result = await rejectBooking(
    bookingId,
    reason?.trim() || "Umelec odmietol skupinový dopyt."
  );
  if (!result.ok) return { ok: false, error: result.error || "Odmietnutie zlyhalo." };
  return { ok: true };
}

export async function chooseBulkOffer(
  inquiryId: string,
  bookingId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: inquiry } = await ssr
    .from("bulk_inquiries")
    .select("id, client_id, status")
    .eq("id", inquiryId)
    .maybeSingle();

  if (!inquiry || inquiry.client_id !== authData.user.id) {
    return { ok: false, error: "Nemáš prístup k tomuto dopytu." };
  }
  if (inquiry.status !== "open") {
    return { ok: false, error: "Tento dopyt už nie je otvorený." };
  }

  const { data: items } = await ssr
    .from("bulk_inquiry_items")
    .select("id, booking_id, dj_id, item_status")
    .eq("inquiry_id", inquiryId);

  const chosen = (items ?? []).find((i) => i.booking_id === bookingId);
  if (!chosen || chosen.item_status !== "offered") {
    return {
      ok: false,
      error: "Vybrať môžeš len umelca, ktorý už poslal ponuku.",
    };
  }

  const admin = adminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select(
      "id, status, dj_id, event_date, end_date, start_time, end_time, client_email, client_name, event_type"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "pending") {
    return { ok: false, error: "Vybraná rezervácia už nie je dostupná." };
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
        "Tento termín sa medzičasom obsadil. Vyber inú ponuku.",
    };
  }

  const { error: acceptError } = await admin
    .from("bookings")
    .update({ status: "accepted", rejection_reason: null })
    .eq("id", bookingId);

  if (acceptError) return { ok: false, error: acceptError.message };

  await admin
    .from("bulk_inquiry_items")
    .update({ item_status: "accepted" })
    .eq("id", chosen.id);

  for (const item of items ?? []) {
    if (item.booking_id === bookingId) continue;
    if (
      item.item_status === "declined" ||
      item.item_status === "expired" ||
      item.item_status === "accepted"
    ) {
      continue;
    }
    await admin
      .from("bulk_inquiry_items")
      .update({ item_status: "expired" })
      .eq("id", item.id);
    if (item.booking_id) {
      await admin
        .from("bookings")
        .update({
          status: "rejected",
          rejection_reason:
            "Klient si vybral inú ponuku z hromadného dopytu.",
        })
        .eq("id", item.booking_id)
        .eq("status", "pending");
    }
  }

  await admin
    .from("bulk_inquiries")
    .update({
      status: "closed",
      chosen_booking_id: bookingId,
    })
    .eq("id", inquiryId);

  try {
    const { data: djProfile } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", booking.dj_id)
      .maybeSingle();
    if (booking.client_email) {
      await sendBookingStatusEmail(
        booking.client_email,
        "accepted",
        booking.event_type,
        booking.event_date,
        {
          djName: djProfile?.full_name,
          clientName: booking.client_name,
        }
      );
    }
  } catch (err) {
    console.warn("[chooseBulkOffer] email failed", err);
  }

  return { ok: true };
}

export async function listClientBulkInquiries(): Promise<
  | {
      ok: true;
      inquiries: {
        id: string;
        event_date: string;
        event_type: string;
        event_location: string | null;
        status: string;
        created_at: string;
        genre: string | null;
        items_count: number;
        offered_count: number;
      }[];
    }
  | { ok: false; error: string }
> {
  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data, error } = await ssr
    .from("bulk_inquiries")
    .select(
      "id, event_date, event_type, event_location, status, created_at, genre, bulk_inquiry_items(id, item_status)"
    )
    .eq("client_id", authData.user.id)
    .order("created_at", { ascending: false });

  if (error) return { ok: false, error: error.message };

  const inquiries = (data ?? []).map((row) => {
    const items = (row.bulk_inquiry_items ?? []) as {
      id: string;
      item_status: string;
    }[];
    return {
      id: row.id as string,
      event_date: row.event_date as string,
      event_type: row.event_type as string,
      event_location: (row.event_location as string | null) ?? null,
      status: row.status as string,
      created_at: row.created_at as string,
      genre: (row.genre as string | null) ?? null,
      items_count: items.length,
      offered_count: items.filter((i) => i.item_status === "offered").length,
    };
  });

  return { ok: true, inquiries };
}

export async function getBulkInquiryDetail(inquiryId: string): Promise<
  | {
      ok: true;
      inquiry: {
        id: string;
        event_date: string;
        end_date: string | null;
        start_time: string;
        end_time: string;
        event_type: string;
        event_location: string | null;
        message: string | null;
        client_budget: number | null;
        genre: string | null;
        status: string;
        chosen_booking_id: string | null;
        created_at: string;
      };
      items: {
        id: string;
        dj_id: string;
        booking_id: string | null;
        offer_price: number | null;
        offer_message: string | null;
        item_status: string;
        dj_name: string | null;
        dj_avatar: string | null;
        dj_slug: string | null;
      }[];
    }
  | { ok: false; error: string }
> {
  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: inquiry, error } = await ssr
    .from("bulk_inquiries")
    .select(
      "id, client_id, event_date, end_date, start_time, end_time, event_type, event_location, message, client_budget, genre, status, chosen_booking_id, created_at"
    )
    .eq("id", inquiryId)
    .maybeSingle();

  if (error || !inquiry) return { ok: false, error: "Dopyt sa nenašiel." };
  if (inquiry.client_id !== authData.user.id) {
    return { ok: false, error: "Nemáš prístup." };
  }

  const { data: items } = await ssr
    .from("bulk_inquiry_items")
    .select(
      "id, dj_id, booking_id, offer_price, offer_message, item_status"
    )
    .eq("inquiry_id", inquiryId);

  const djIds = (items ?? []).map((i) => i.dj_id);
  const admin = adminClient();
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, public_slug")
    .in("id", djIds.length ? djIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  return {
    ok: true,
    inquiry: {
      id: inquiry.id,
      event_date: inquiry.event_date,
      end_date: inquiry.end_date,
      start_time: inquiry.start_time,
      end_time: inquiry.end_time,
      event_type: inquiry.event_type,
      event_location: inquiry.event_location,
      message: inquiry.message,
      client_budget:
        inquiry.client_budget != null ? Number(inquiry.client_budget) : null,
      genre: inquiry.genre,
      status: inquiry.status,
      chosen_booking_id: inquiry.chosen_booking_id,
      created_at: inquiry.created_at,
    },
    items: (items ?? []).map((item) => {
      const p = profileMap[item.dj_id];
      return {
        id: item.id,
        dj_id: item.dj_id,
        booking_id: item.booking_id,
        offer_price: item.offer_price != null ? Number(item.offer_price) : null,
        offer_message: item.offer_message,
        item_status: item.item_status,
        dj_name: p?.full_name ?? null,
        dj_avatar: p?.avatar_url ?? null,
        dj_slug: p?.public_slug ?? null,
      };
    }),
  };
}
