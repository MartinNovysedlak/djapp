"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { isPastLocalDate } from "@/lib/dates";
import {
  averageCategoryRating,
  clampRating,
  type CategoryRatings,
  type ReviewCategoryKey,
  REVIEW_CATEGORIES,
} from "@/lib/review-categories";

export type SubmitReviewInput = {
  bookingId: string;
  djId: string;
  categories: CategoryRatings;
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

function parseCategories(
  input: CategoryRatings | undefined
): { ok: true; categories: CategoryRatings; rating: number } | { ok: false; error: string } {
  if (!input) {
    return { ok: false, error: "Chýbajú hodnotenia podľa kategórií." };
  }

  const categories = {} as CategoryRatings;
  for (const cat of REVIEW_CATEGORIES) {
    const key = cat.key as ReviewCategoryKey;
    const raw = input[key];
    if (typeof raw !== "number" || Number.isNaN(raw)) {
      return { ok: false, error: `Chýba hodnotenie: ${cat.label}.` };
    }
    const value = clampRating(raw);
    if (value < 1 || value > 5) {
      return { ok: false, error: "Každá kategória musí byť 1 až 5." };
    }
    categories[key] = value;
  }

  return {
    ok: true,
    categories,
    rating: averageCategoryRating(categories),
  };
}

/**
 * Client rates a DJ after an accepted, already-happened event. Runs with the
 * caller's own SSR session so RLS enforces `client_id = auth.uid()`, and the
 * `UNIQUE (booking_id)` constraint prevents duplicate reviews per booking.
 */
export async function submitReview(
  input: SubmitReviewInput
): Promise<SubmitReviewResult> {
  const comment = input.comment?.trim() || null;
  const parsed = parseCategories(input.categories);

  if (!input.bookingId || !input.djId) {
    return { ok: false, error: "Chýbajú údaje o rezervácii." };
  }
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
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
        rating: parsed.rating,
        rating_communication: parsed.categories.communication,
        rating_punctuality: parsed.categories.punctuality,
        rating_performance: parsed.categories.performance,
        rating_requests: parsed.categories.requests,
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
