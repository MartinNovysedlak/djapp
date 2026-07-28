"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { adminClient } from "@/lib/guest-share";
import { isPastLocalDate } from "@/lib/dates";
import {
  makeReviewShareSlug,
  reviewInviteUrl,
  type ReviewInvitePublic,
} from "@/lib/review-invite";
import {
  averageCategoryRating,
  clampRating,
  REVIEW_CATEGORIES,
  type CategoryRatings,
  type ReviewCategoryKey,
} from "@/lib/review-categories";

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

async function requireDjBookingAccess(bookingId: string) {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false as const, error: "Musíš byť prihlásený." };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, dj_id, review_share_slug, event_date, end_date")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.dj_id !== authData.user.id) {
    return { ok: false as const, error: "Rezervácia sa nenašla." };
  }
  if (booking.status !== "accepted") {
    return {
      ok: false as const,
      error: "Odkaz na hodnotenie je dostupný len pri potvrdenej rezervácii.",
    };
  }

  return { ok: true as const, booking };
}

export async function ensureReviewShareSlug(bookingId: string): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await requireDjBookingAccess(bookingId);
  if (!access.ok) return access;

  if (access.booking.review_share_slug) {
    return {
      ok: true,
      slug: access.booking.review_share_slug,
      url: reviewInviteUrl(access.booking.review_share_slug),
    };
  }

  const admin = adminClient();
  let slug = makeReviewShareSlug();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin
      .from("bookings")
      .update({ review_share_slug: slug })
      .eq("id", bookingId)
      .is("review_share_slug", null)
      .select("review_share_slug")
      .maybeSingle();

    if (!error && data?.review_share_slug) {
      return {
        ok: true,
        slug: data.review_share_slug,
        url: reviewInviteUrl(data.review_share_slug),
      };
    }

    const { data: existing } = await admin
      .from("bookings")
      .select("review_share_slug")
      .eq("id", bookingId)
      .maybeSingle();

    if (existing?.review_share_slug) {
      return {
        ok: true,
        slug: existing.review_share_slug,
        url: reviewInviteUrl(existing.review_share_slug),
      };
    }

    slug = makeReviewShareSlug();
  }

  return { ok: false, error: "Odkaz sa nepodarilo vytvoriť." };
}

export async function getReviewInviteBySlug(
  slug: string
): Promise<
  { ok: true; invite: ReviewInvitePublic } | { ok: false; error: string }
> {
  const clean = normalizeText(slug, 32).toLowerCase();
  if (!clean) return { ok: false, error: "Neplatný odkaz." };

  const admin = adminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select(
      "id, status, dj_id, review_share_slug, event_type, event_date, end_date"
    )
    .eq("review_share_slug", clean)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "Tento odkaz na hodnotenie neexistuje." };
  }
  if (booking.status !== "accepted") {
    return {
      ok: false,
      error: "Túto rezerváciu už nie je možné hodnotiť.",
    };
  }

  const endIso = booking.end_date ?? booking.event_date;
  const canSubmit = isPastLocalDate(endIso);

  const [{ data: profile }, { data: existingReview }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", booking.dj_id)
      .maybeSingle(),
    admin
      .from("reviews")
      .select("id")
      .eq("booking_id", booking.id)
      .maybeSingle(),
  ]);

  return {
    ok: true,
    invite: {
      slug: booking.review_share_slug,
      bookingId: booking.id,
      djId: booking.dj_id,
      djName: profile?.full_name ?? null,
      djAvatarUrl: profile?.avatar_url ?? null,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      endDate: booking.end_date,
      alreadyReviewed: Boolean(existingReview),
      canSubmit,
    },
  };
}

export type SubmitGuestReviewInput = {
  slug: string;
  categories: CategoryRatings;
  comment?: string;
  reviewerName?: string;
};

function parseCategories(
  input: CategoryRatings | undefined
):
  | { ok: true; categories: CategoryRatings; rating: number }
  | { ok: false; error: string } {
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
 * Public (unauthenticated) review submit via invite slug.
 * Uses service role after validating the token + past accepted booking.
 */
export async function submitGuestReview(
  input: SubmitGuestReviewInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const clean = normalizeText(input.slug, 32).toLowerCase();
  if (!clean) return { ok: false, error: "Neplatný odkaz." };

  const parsed = parseCategories(input.categories);
  if (!parsed.ok) return parsed;

  const reviewerName = normalizeText(input.reviewerName, 80) || null;
  const comment = normalizeText(input.comment, 2000) || null;

  const invite = await getReviewInviteBySlug(clean);
  if (!invite.ok) return invite;
  if (!invite.invite.canSubmit) {
    return { ok: false, error: "Hodnotiť môžeš až po skončení akcie." };
  }
  if (invite.invite.alreadyReviewed) {
    return { ok: false, error: "Táto akcia už bola ohodnotená." };
  }

  const admin = adminClient();
  const { error } = await admin.from("reviews").insert({
    booking_id: invite.invite.bookingId,
    dj_id: invite.invite.djId,
    client_id: null,
    reviewer_name: reviewerName,
    rating: parsed.rating,
    rating_communication: parsed.categories.communication,
    rating_punctuality: parsed.categories.punctuality,
    rating_performance: parsed.categories.performance,
    rating_requests: parsed.categories.requests,
    comment,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Táto akcia už bola ohodnotená." };
    }
    console.error("[submitGuestReview]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
