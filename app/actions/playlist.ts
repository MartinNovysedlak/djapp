"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { normalizeSongInput } from "@/lib/songs/normalize";

export type SongCategory = "must_play" | "optional" | "do_not_play";

export type BookingSong = {
  id: string;
  booking_id: string;
  added_by: string;
  title: string;
  artist: string;
  notes: string | null;
  category: SongCategory;
  is_played: boolean;
  source_url: string | null;
  normalized_title: string | null;
  created_at: string;
};

export type PlaylistActionResult =
  | { ok: true; song?: BookingSong }
  | { ok: false; error: string };

const CATEGORIES: SongCategory[] = ["must_play", "optional", "do_not_play"];

const SONG_COLS =
  "id, booking_id, added_by, title, artist, notes, category, is_played, source_url, normalized_title, created_at";

function normalizeText(value: string | undefined | null, max = 200) {
  return (value ?? "").trim().slice(0, max);
}

async function getAcceptedBookingAccess(bookingId: string) {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null as null, booking: null, role: null as null };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, client_id, dj_id")
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

export async function getBookingSongs(
  bookingId: string
): Promise<{ ok: true; songs: BookingSong[] } | { ok: false; error: string }> {
  if (!bookingId) {
    return { ok: false, error: "Chýba ID rezervácie." };
  }

  try {
    const { supabase, user, booking, role } =
      await getAcceptedBookingAccess(bookingId);

    if (!user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }
    if (!booking || !role) {
      return {
        ok: false,
        error: "Hudobný plánovač je dostupný len pri potvrdenej rezervácii.",
      };
    }

    const { data, error } = await supabase
      .from("booking_songs")
      .select(SONG_COLS)
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getBookingSongs]", error);
      return { ok: false, error: "Skladby sa nepodarilo načítať." };
    }

    return { ok: true, songs: (data ?? []) as BookingSong[] };
  } catch (err) {
    console.error("[getBookingSongs]", err);
    return { ok: false, error: "Skladby sa nepodarilo načítať." };
  }
}

export async function addBookingSong(input: {
  bookingId: string;
  title?: string;
  artist?: string;
  notes?: string;
  url?: string;
  category: SongCategory;
}): Promise<PlaylistActionResult> {
  const notes = normalizeText(input.notes, 500) || null;

  if (!input.bookingId) {
    return { ok: false, error: "Chýba ID rezervácie." };
  }
  if (!CATEGORIES.includes(input.category)) {
    return { ok: false, error: "Neplatná kategória." };
  }

  const normalized = await normalizeSongInput({
    title: input.title,
    artist: input.artist,
    url: input.url,
  });
  if (!normalized.ok) return { ok: false, error: normalized.error };

  try {
    const { supabase, user, booking, role } = await getAcceptedBookingAccess(
      input.bookingId
    );

    if (!user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }
    if (!booking || role !== "client") {
      return {
        ok: false,
        error: "Skladby môže pridávať len klient pri potvrdenej rezervácii.",
      };
    }

    const { data, error } = await supabase
      .from("booking_songs")
      .insert({
        booking_id: input.bookingId,
        added_by: user.id,
        title: normalized.song.title,
        artist: normalized.song.artist,
        notes,
        category: input.category,
        source_url: normalized.song.sourceUrl,
        normalized_title: normalized.song.normalizedTitle,
      })
      .select(SONG_COLS)
      .single();

    if (error || !data) {
      console.error("[addBookingSong]", error);
      return { ok: false, error: "Skladbu sa nepodarilo pridať." };
    }

    return { ok: true, song: data as BookingSong };
  } catch (err) {
    console.error("[addBookingSong]", err);
    return { ok: false, error: "Skladbu sa nepodarilo pridať." };
  }
}

export async function deleteBookingSong(
  songId: string
): Promise<PlaylistActionResult> {
  if (!songId) {
    return { ok: false, error: "Chýba ID skladby." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: song } = await supabase
      .from("booking_songs")
      .select("id, booking_id")
      .eq("id", songId)
      .maybeSingle();

    if (!song) {
      return { ok: false, error: "Skladba sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(song.booking_id);
    if (!booking || role !== "client") {
      return { ok: false, error: "Skladby môže mazať len klient." };
    }

    const { error } = await supabase
      .from("booking_songs")
      .delete()
      .eq("id", songId);

    if (error) {
      console.error("[deleteBookingSong]", error);
      return { ok: false, error: "Skladbu sa nepodarilo zmazať." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[deleteBookingSong]", err);
    return { ok: false, error: "Skladbu sa nepodarilo zmazať." };
  }
}

export async function toggleSongPlayed(
  songId: string,
  isPlayed: boolean
): Promise<PlaylistActionResult> {
  if (!songId) {
    return { ok: false, error: "Chýba ID skladby." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: song } = await supabase
      .from("booking_songs")
      .select("id, booking_id")
      .eq("id", songId)
      .maybeSingle();

    if (!song) {
      return { ok: false, error: "Skladba sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(song.booking_id);
    if (!booking || role !== "dj") {
      return { ok: false, error: "Odškrtnúť skladbu môže len DJ." };
    }

    const { data, error } = await supabase
      .from("booking_songs")
      .update({ is_played: isPlayed })
      .eq("id", songId)
      .select(SONG_COLS)
      .single();

    if (error || !data) {
      console.error("[toggleSongPlayed]", error);
      return { ok: false, error: "Stav skladby sa nepodarilo uložiť." };
    }

    return { ok: true, song: data as BookingSong };
  } catch (err) {
    console.error("[toggleSongPlayed]", err);
    return { ok: false, error: "Stav skladby sa nepodarilo uložiť." };
  }
}
