"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { sortTimelineItems } from "@/lib/timeline/sort";
import type {
  TimelineEnergy,
  TimelineItem,
  TimelineItemType,
  TimelineStartMode,
} from "@/lib/timeline/types";
import {
  TIMELINE_ENERGY,
  TIMELINE_ITEM_TYPES,
  TIMELINE_START_MODES,
} from "@/lib/timeline/types";

export type TimelineActionResult =
  | { ok: true; item?: TimelineItem }
  | { ok: false; error: string };

export type TimelineItemInput = {
  eventTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  itemType: TimelineItemType;
  title: string;
  notes?: string | null;
  songTitle?: string | null;
  songArtist?: string | null;
  techNotes?: string | null;
  energy?: TimelineEnergy | null;
  startMode?: TimelineStartMode | null;
  startDetail?: string | null;
  isCritical?: boolean;
};

const ITEM_TYPE_VALUES = new Set(TIMELINE_ITEM_TYPES.map((t) => t.value));
const ENERGY_VALUES = new Set(TIMELINE_ENERGY.map((e) => e.value));
const START_MODE_VALUES = new Set(TIMELINE_START_MODES.map((m) => m.value));

const SELECT_COLS =
  "id, booking_id, added_by, event_time, end_time, duration_minutes, item_type, title, notes, song_title, song_artist, tech_notes, energy, start_mode, start_detail, is_critical, sort_order, is_done, created_at, updated_at";

function normalizeText(value: string | undefined | null, max = 200) {
  return (value ?? "").trim().slice(0, max);
}

function normalizeTime(value: string | undefined | null): string | null {
  const raw = (value ?? "").trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] ?? "0");
  if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeDuration(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Math.round(value);
  if (n < 1 || n > 24 * 60) return null;
  return n;
}

function parseItemInput(input: TimelineItemInput) {
  const title = normalizeText(input.title, 160);
  const notes = normalizeText(input.notes, 500) || null;
  const songTitle = normalizeText(input.songTitle, 160) || null;
  const songArtist = normalizeText(input.songArtist, 160) || null;
  const techNotes = normalizeText(input.techNotes, 500) || null;
  const startDetail = normalizeText(input.startDetail, 300) || null;
  const eventTime = normalizeTime(input.eventTime ?? null);
  const endTime = normalizeTime(input.endTime ?? null);
  const durationMinutes = normalizeDuration(input.durationMinutes ?? null);
  const itemType = input.itemType;
  const energy = input.energy ?? null;
  const startMode = input.startMode ?? null;
  const isCritical = Boolean(input.isCritical);

  if (!ITEM_TYPE_VALUES.has(itemType)) {
    return { error: "Neplatný typ bodu programu." } as const;
  }
  if (energy && !ENERGY_VALUES.has(energy)) {
    return { error: "Neplatná energia." } as const;
  }
  if (startMode && !START_MODE_VALUES.has(startMode)) {
    return { error: "Neplatný spôsob spustenia." } as const;
  }
  if (!title) {
    return { error: "Zadaj názov bodu programu." } as const;
  }
  if (input.eventTime?.trim() && !eventTime) {
    return { error: "Neplatný začiatok (napr. 18:00)." } as const;
  }
  if (input.endTime?.trim() && !endTime) {
    return { error: "Neplatný koniec (napr. 18:30)." } as const;
  }
  if (
    input.durationMinutes != null &&
    String(input.durationMinutes) !== "" &&
    durationMinutes == null
  ) {
    return { error: "Trvanie musí byť 1–1440 minút." } as const;
  }
  if (
    (startMode === "on_signal" || startMode === "on_word") &&
    !startDetail
  ) {
    return {
      error:
        startMode === "on_word"
          ? "Dopíš konkrétne slovo alebo vetu."
          : "Dopíš, na aké znamenie sa má spustiť.",
    } as const;
  }

  return {
    data: {
      event_time: eventTime,
      end_time: endTime,
      duration_minutes: durationMinutes,
      item_type: itemType,
      title,
      notes,
      song_title: songTitle,
      song_artist: songArtist,
      tech_notes: techNotes,
      energy,
      start_mode: startMode,
      start_detail: startDetail,
      is_critical: isCritical,
    },
  } as const;
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

export async function getBookingTimeline(
  bookingId: string
): Promise<
  { ok: true; items: TimelineItem[] } | { ok: false; error: string }
> {
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
        error: "Harmonogram je dostupný len pri potvrdenej rezervácii.",
      };
    }

    const { data, error } = await supabase
      .from("booking_timeline")
      .select(SELECT_COLS)
      .eq("booking_id", bookingId)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[getBookingTimeline]", error);
      return { ok: false, error: "Harmonogram sa nepodarilo načítať." };
    }

    return {
      ok: true,
      items: sortTimelineItems((data ?? []) as TimelineItem[]),
    };
  } catch (err) {
    console.error("[getBookingTimeline]", err);
    return { ok: false, error: "Harmonogram sa nepodarilo načítať." };
  }
}

export async function addTimelineItem(input: {
  bookingId: string;
} & TimelineItemInput): Promise<TimelineActionResult> {
  if (!input.bookingId) {
    return { ok: false, error: "Chýba ID rezervácie." };
  }

  const parsed = parseItemInput(input);
  if ("error" in parsed) {
    return { ok: false, error: parsed.error ?? "Neznáma chyba pri spracovaní" };
  }

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
        error: "Harmonogram môže upravovať len klient pri potvrdenej rezervácii.",
      };
    }

    const { data: existing } = await supabase
      .from("booking_timeline")
      .select("sort_order")
      .eq("booking_id", input.bookingId)
      .order("sort_order", { ascending: false })
      .limit(1);

    const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

    const { data, error } = await supabase
      .from("booking_timeline")
      .insert({
        booking_id: input.bookingId,
        added_by: user.id,
        sort_order: nextOrder,
        is_done: false,
        ...parsed.data,
      })
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      console.error("[addTimelineItem]", error);
      return { ok: false, error: "Bod programu sa nepodarilo pridať." };
    }

    return { ok: true, item: data as TimelineItem };
  } catch (err) {
    console.error("[addTimelineItem]", err);
    return { ok: false, error: "Bod programu sa nepodarilo pridať." };
  }
}

export async function updateTimelineItem(input: {
  itemId: string;
} & TimelineItemInput): Promise<TimelineActionResult> {
  if (!input.itemId) {
    return { ok: false, error: "Chýba ID položky." };
  }

  const parsed = parseItemInput(input);
  if ("error" in parsed) {
    return { ok: false, error: parsed.error ?? "Neznáma chyba pri spracovaní" };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: existing } = await supabase
      .from("booking_timeline")
      .select("id, booking_id")
      .eq("id", input.itemId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "Položka sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(
      existing.booking_id
    );
    if (!booking || role !== "client") {
      return { ok: false, error: "Harmonogram môže upravovať len klient." };
    }

    const { data, error } = await supabase
      .from("booking_timeline")
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.itemId)
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      console.error("[updateTimelineItem]", error);
      return { ok: false, error: "Položku sa nepodarilo uložiť." };
    }

    return { ok: true, item: data as TimelineItem };
  } catch (err) {
    console.error("[updateTimelineItem]", err);
    return { ok: false, error: "Položku sa nepodarilo uložiť." };
  }
}

export async function deleteTimelineItem(
  itemId: string
): Promise<TimelineActionResult> {
  if (!itemId) {
    return { ok: false, error: "Chýba ID položky." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: existing } = await supabase
      .from("booking_timeline")
      .select("id, booking_id")
      .eq("id", itemId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "Položka sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(
      existing.booking_id
    );
    if (!booking || role !== "client") {
      return { ok: false, error: "Harmonogram môže mazať len klient." };
    }

    const { error } = await supabase
      .from("booking_timeline")
      .delete()
      .eq("id", itemId);

    if (error) {
      console.error("[deleteTimelineItem]", error);
      return { ok: false, error: "Položku sa nepodarilo zmazať." };
    }

    return { ok: true };
  } catch (err) {
    console.error("[deleteTimelineItem]", err);
    return { ok: false, error: "Položku sa nepodarilo zmazať." };
  }
}

export async function moveTimelineItem(
  itemId: string,
  direction: "up" | "down"
): Promise<{ ok: true; items: TimelineItem[] } | { ok: false; error: string }> {
  if (!itemId) {
    return { ok: false, error: "Chýba ID položky." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: existing } = await supabase
      .from("booking_timeline")
      .select("id, booking_id, sort_order")
      .eq("id", itemId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "Položka sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(
      existing.booking_id
    );
    if (!booking || role !== "client") {
      return { ok: false, error: "Poradie môže meniť len klient." };
    }

    const { data: rows, error } = await supabase
      .from("booking_timeline")
      .select(SELECT_COLS)
      .eq("booking_id", existing.booking_id)
      .order("sort_order", { ascending: true });

    if (error || !rows) {
      return { ok: false, error: "Poradie sa nepodarilo zmeniť." };
    }

    const items = sortTimelineItems(rows as TimelineItem[]);
    const index = items.findIndex((i) => i.id === itemId);
    if (index < 0) {
      return { ok: false, error: "Položka sa nenašla." };
    }

    const swapWith = direction === "up" ? index - 1 : index + 1;
    if (swapWith < 0 || swapWith >= items.length) {
      return { ok: true, items };
    }

    const a = items[index];
    const b = items[swapWith];
    const orderA = a.sort_order;
    const orderB = b.sort_order;

    const { error: e1 } = await supabase
      .from("booking_timeline")
      .update({ sort_order: orderB, updated_at: new Date().toISOString() })
      .eq("id", a.id);
    const { error: e2 } = await supabase
      .from("booking_timeline")
      .update({ sort_order: orderA, updated_at: new Date().toISOString() })
      .eq("id", b.id);

    if (e1 || e2) {
      console.error("[moveTimelineItem]", e1 || e2);
      return { ok: false, error: "Poradie sa nepodarilo zmeniť." };
    }

    const refreshed = await getBookingTimeline(existing.booking_id);
    if (!refreshed.ok) return refreshed;
    return { ok: true, items: refreshed.items };
  } catch (err) {
    console.error("[moveTimelineItem]", err);
    return { ok: false, error: "Poradie sa nepodarilo zmeniť." };
  }
}

export async function toggleTimelineItemDone(
  itemId: string,
  isDone: boolean
): Promise<TimelineActionResult> {
  if (!itemId) {
    return { ok: false, error: "Chýba ID položky." };
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return { ok: false, error: "Musíš byť prihlásený." };
    }

    const { data: existing } = await supabase
      .from("booking_timeline")
      .select("id, booking_id")
      .eq("id", itemId)
      .maybeSingle();

    if (!existing) {
      return { ok: false, error: "Položka sa nenašla." };
    }

    const { booking, role } = await getAcceptedBookingAccess(
      existing.booking_id
    );
    if (!booking || role !== "dj") {
      return { ok: false, error: "Odškrtnúť bod môže len účinkujúci." };
    }

    const { data, error } = await supabase
      .from("booking_timeline")
      .update({
        is_done: isDone,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .select(SELECT_COLS)
      .single();

    if (error || !data) {
      console.error("[toggleTimelineItemDone]", error);
      return { ok: false, error: "Stav bodu sa nepodarilo uložiť." };
    }

    return { ok: true, item: data as TimelineItem };
  } catch (err) {
    console.error("[toggleTimelineItemDone]", err);
    return { ok: false, error: "Stav bodu sa nepodarilo uložiť." };
  }
}
