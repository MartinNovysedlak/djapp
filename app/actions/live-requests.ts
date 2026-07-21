"use server";

import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { BRAND } from "@/lib/brand";
import { normalizeSongInput } from "@/lib/songs/normalize";
import {
  isLiveRequestStatus,
  type LiveBookingPublic,
  type LiveRequest,
  type LiveRequestStatus,
} from "@/lib/live/types";

const LIVE_COLS =
  "id, booking_id, song_title, artist, guest_name, status, source_url, normalized_title, created_at, updated_at";

/** Guest-facing live URL — always production domain (QR must work on phones). */
function liveGuestUrl(slug: string) {
  return `${BRAND.url.replace(/\/$/, "")}/live/${slug}`;
}

function adminClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function makeLiveSlug() {
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
    .select("id, status, client_id, dj_id, live_slug, event_type, event_date")
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

export async function ensureLiveSlug(bookingId: string): Promise<
  | { ok: true; slug: string; url: string }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const { user, booking, role } = await getAcceptedBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Live QR je dostupné len pri potvrdenej rezervácii.",
    };
  }

  if (booking.live_slug) {
    return {
      ok: true,
      slug: booking.live_slug,
      url: liveGuestUrl(booking.live_slug),
    };
  }

  const admin = adminClient();
  let slug = makeLiveSlug();
  for (let i = 0; i < 5; i++) {
    const { data, error } = await admin
      .from("bookings")
      .update({ live_slug: slug })
      .eq("id", bookingId)
      .is("live_slug", null)
      .select("live_slug")
      .maybeSingle();

    if (!error && data?.live_slug) {
      return {
        ok: true,
        slug: data.live_slug,
        url: liveGuestUrl(data.live_slug),
      };
    }

    const { data: existing } = await admin
      .from("bookings")
      .select("live_slug")
      .eq("id", bookingId)
      .maybeSingle();

    if (existing?.live_slug) {
      return {
        ok: true,
        slug: existing.live_slug,
        url: liveGuestUrl(existing.live_slug),
      };
    }

    slug = makeLiveSlug();
  }

  return { ok: false, error: "Live odkaz sa nepodarilo vytvoriť." };
}

export async function getLiveBookingBySlug(
  slug: string
): Promise<
  { ok: true; booking: LiveBookingPublic } | { ok: false; error: string }
> {
  const clean = normalizeText(slug, 32).toLowerCase();
  if (!clean) return { ok: false, error: "Neplatný odkaz." };

  const admin = adminClient();
  const { data: booking, error } = await admin
    .from("bookings")
    .select("live_slug, status, event_type, event_date, dj_id")
    .eq("live_slug", clean)
    .maybeSingle();

  if (error || !booking) {
    return { ok: false, error: "Táto live stránka neexistuje." };
  }
  if (booking.status !== "accepted") {
    return { ok: false, error: "Live želania pre túto akciu nie sú aktívne." };
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name")
    .eq("id", booking.dj_id)
    .maybeSingle();

  return {
    ok: true,
    booking: {
      slug: booking.live_slug,
      eventType: booking.event_type,
      eventDate: booking.event_date,
      djName: profile?.full_name ?? null,
    },
  };
}

export async function submitLiveRequest(input: {
  slug: string;
  songTitle?: string;
  artist?: string;
  guestName?: string;
  url?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const slug = normalizeText(input.slug, 32).toLowerCase();
  const guestName = normalizeText(input.guestName, 80) || null;

  if (!slug) return { ok: false, error: "Neplatný odkaz." };

  const normalized = await normalizeSongInput({
    title: input.songTitle,
    artist: input.artist,
    url: input.url,
  });
  if (!normalized.ok) return { ok: false, error: normalized.error };

  const admin = adminClient();
  const { data: booking } = await admin
    .from("bookings")
    .select("id, status")
    .eq("live_slug", slug)
    .maybeSingle();

  if (!booking || booking.status !== "accepted") {
    return { ok: false, error: "Live želania pre túto akciu nie sú aktívne." };
  }

  const { error } = await admin.from("live_requests").insert({
    booking_id: booking.id,
    song_title: normalized.song.title,
    artist: normalized.song.artist,
    guest_name: guestName,
    status: "pending",
    source_url: normalized.song.sourceUrl,
    normalized_title: normalized.song.normalizedTitle,
  });

  if (error) {
    console.error("[submitLiveRequest]", error);
    return { ok: false, error: "Požiadavku sa nepodarilo odoslať." };
  }

  return { ok: true };
}

export async function listLiveRequests(bookingId: string): Promise<
  { ok: true; requests: LiveRequest[] } | { ok: false; error: string }
> {
  const { user, booking, role, supabase } =
    await getAcceptedBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return { ok: false, error: "Live požiadavky nie sú dostupné." };
  }

  const { data, error } = await supabase
    .from("live_requests")
    .select(LIVE_COLS)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[listLiveRequests]", error);
    return { ok: false, error: "Požiadavky sa nepodarilo načítať." };
  }

  return { ok: true, requests: (data ?? []) as LiveRequest[] };
}

export async function updateLiveRequestStatus(input: {
  requestId: string;
  status: LiveRequestStatus;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!input.requestId || !isLiveRequestStatus(input.status)) {
    return { ok: false, error: "Neplatné údaje." };
  }

  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: row } = await supabase
    .from("live_requests")
    .select("id, booking_id")
    .eq("id", input.requestId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Požiadavka sa nenašla." };

  const access = await getAcceptedBookingAccess(row.booking_id);
  if (!access.booking || access.role !== "dj") {
    return { ok: false, error: "Stav môže meniť len účinkujúci." };
  }

  const { error } = await supabase
    .from("live_requests")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.requestId);

  if (error) {
    console.error("[updateLiveRequestStatus]", error);
    return { ok: false, error: "Stav sa nepodarilo zmeniť." };
  }

  return { ok: true };
}

export async function deleteLiveRequest(
  requestId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!requestId) return { ok: false, error: "Chýba ID požiadavky." };

  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: row } = await supabase
    .from("live_requests")
    .select("id, booking_id")
    .eq("id", requestId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Požiadavka sa nenašla." };

  const access = await getAcceptedBookingAccess(row.booking_id);
  if (!access.booking || access.role !== "dj") {
    return { ok: false, error: "Zmazať môže len účinkujúci." };
  }

  const { error } = await supabase
    .from("live_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    console.error("[deleteLiveRequest]", error);
    return { ok: false, error: "Požiadavku sa nepodarilo zmazať." };
  }

  return { ok: true };
}
