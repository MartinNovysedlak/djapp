"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { isPastLocalDate } from "@/lib/dates";

export type SubmitReviewInput = {
  bookingId: string;
  djId: string;
  rating: number;
  comment?: string;
};

export type SubmitReviewResult = {
  ok: boolean;
  error?: string;
};

/**
 * Attach the caller's auth uid to legacy bookings that were created before
 * `client_id` existed, matching on the auth e-mail.
 */
export async function claimOrphanedBookings(): Promise<{ ok: boolean; claimed: number }> {
  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user?.email) {
      return { ok: false, claimed: 0 };
    }

    const { data, error } = await supabase
      .from("bookings")
      .update({ client_id: authData.user.id })
      .is("client_id", null)
      .ilike("client_email", authData.user.email)
      .select("id");

    if (error) {
      console.error("[claimOrphanedBookings]", error);
      return { ok: false, claimed: 0 };
    }

    return { ok: true, claimed: data?.length ?? 0 };
  } catch (err) {
    console.error("[claimOrphanedBookings]", err);
    return { ok: false, claimed: 0 };
  }
}

/**
 * Client rates a DJ after an accepted, already-happened event. Runs with the
 * caller's own SSR session so RLS enforces `client_id = auth.uid()`, and the
 * `UNIQUE (booking_id)` constraint prevents duplicate reviews per booking.
 */
export async function submitReview(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  const rating = Math.round(input.rating);
  const comment = input.comment?.trim() || null;

  if (!input.bookingId || !input.djId) {
    return { ok: false, error: "Chýbajú údaje o rezervácii." };
  }
  if (rating < 1 || rating > 5) {
    return { ok: false, error: "Hodnotenie musí byť 1 až 5 hviezdičiek." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený ako zákazník." };
    }

    // Claim any legacy rows first so ownership checks succeed.
    await claimOrphanedBookings();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("id, status, client_id, dj_id, event_date, end_date")
      .eq("id", input.bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      return { ok: false, error: "Rezervácia sa nenašla." };
    }
    if (booking.client_id !== authData.user.id) {
      return { ok: false, error: "Túto rezerváciu nemôžeš hodnotiť." };
    }
    if (booking.status !== "accepted") {
      return { ok: false, error: "Hodnotiť môžeš len prijaté rezervácie." };
    }

    const endIso = booking.end_date ?? booking.event_date;
    if (!isPastLocalDate(endIso)) {
      return { ok: false, error: "Hodnotiť môžeš až po skončení akcie." };
    }

    const { error: upsertError } = await supabase.from("reviews").upsert(
      {
        booking_id: input.bookingId,
        dj_id: input.djId,
        client_id: authData.user.id,
        rating,
        comment,
      },
      { onConflict: "booking_id" }
    );

    if (upsertError) {
      console.error("[submitReview]", upsertError);
      return { ok: false, error: upsertError.message };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Neznáma chyba.";
    console.error("[submitReview]", err);
    return { ok: false, error: message };
  }
}
