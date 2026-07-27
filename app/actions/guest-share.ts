"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  adminClient,
  guestShareUrl,
  type GuestSharePublic,
} from "@/lib/guest-share";

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function makeGuestShareSlug() {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

async function getAcceptedBookingAccess(bookingId: string) {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null as null, booking: null, role: null as null };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, client_id, dj_id, guest_share_slug, event_type, event_date"
    )
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "accepted") {
    return { supabase, user: authData.user, booking: null, role: null as null };
  }

  const role =
    booking.client_id === authData.user.id
      ? ("client" as const)
      : booking.dj_id === authData.user.id
        ? ("dj" as const)
        : null;

  return { supabase, user: authData.user, booking, role };
}

export async function ensureGuestShareSlug(bookingId: string): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const { user, booking, role } = await getAcceptedBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Odkaz pre klienta je dostupný len pri potvrdenej rezervácii.",
    };
  }

  if (booking.guest_share_slug) {
    return {
      ok: true,
      slug: booking.guest_share_slug,
      url: guestShareUrl(booking.guest_share_slug),
    };
  }

  const admin = adminClient();
  let slug = makeGuestShareSlug();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin
      .from("bookings")
      .update({ guest_share_slug: slug })
      .eq("id", bookingId)
      .is("guest_share_slug", null)
      .select("guest_share_slug")
      .maybeSingle();

    if (!error && data?.guest_share_slug) {
      return {
        ok: true,
        slug: data.guest_share_slug,
        url: guestShareUrl(data.guest_share_slug),
      };
    }

    const { data: existing } = await admin
      .from("bookings")
      .select("guest_share_slug")
      .eq("id", bookingId)
      .maybeSingle();

    if (existing?.guest_share_slug) {
      return {
        ok: true,
        slug: existing.guest_share_slug,
        url: guestShareUrl(existing.guest_share_slug),
      };
    }

    slug = makeGuestShareSlug();
  }

  return { ok: false, error: "Odkaz sa nepodarilo vytvoriť." };
}

export async function getGuestShareBySlug(
  slug: string
): Promise<
  { ok: true; share: GuestSharePublic } | { ok: false; error: string }
> {
  const clean = normalizeText(slug, 32).toLowerCase();
  if (!clean) return { ok: false, error: "Neplatný odkaz." };

  const admin = adminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("id, guest_share_slug, status, event_type, event_date, dj_id")
    .eq("guest_share_slug", clean)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "Táto stránka neexistuje." };
  }
  if (booking.status !== "accepted") {
    return {
      ok: false,
      error: "Spolupráca pre túto akciu nie je aktívna.",
    };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", booking.dj_id)
    .maybeSingle();

  return {
    ok: true,
    share: {
      slug: booking.guest_share_slug,
      bookingId: booking.id,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      djName: profile?.full_name ?? null,
    },
  };
}
