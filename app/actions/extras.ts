"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import type { BookingExtra, DjExtra } from "@/lib/extras/types";
import { EXTRA_ICON_OPTIONS } from "@/lib/extras/types";

export type ExtrasActionResult =
  | { ok: true }
  | { ok: false; error: string };

type RequireDjResult =
  | { ok: true; supabase: Awaited<ReturnType<typeof createSSRClient>>; userId: string }
  | { ok: false; error: string };

const ICON_VALUES = new Set(EXTRA_ICON_OPTIONS.map((i) => i.value));

const DJ_EXTRA_COLS =
  "id, dj_id, title, description, price, icon, image_url, is_active, sort_order, created_at, updated_at";

const BOOKING_EXTRA_COLS =
  "id, booking_id, extra_id, title, description, unit_price, quantity, created_at";

function normalizeText(value: string | undefined | null, max = 200) {
  return (value ?? "").trim().slice(0, max);
}

async function requireDj(): Promise<RequireDjResult> {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role === "client") {
    return {
      ok: false,
      error: "Len účinkujúci môžu spravovať špeciálnu ponuku.",
    };
  }

  return { ok: true, supabase, userId: authData.user.id };
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

export async function listDjExtras(): Promise<
  { ok: true; extras: DjExtra[] } | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.supabase
    .from("dj_extras")
    .select(DJ_EXTRA_COLS)
    .eq("dj_id", auth.userId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[listDjExtras]", error);
    return { ok: false, error: "Ponuku sa nepodarilo načítať." };
  }

  return { ok: true, extras: (data ?? []) as DjExtra[] };
}

export async function saveDjExtra(input: {
  id?: string;
  title: string;
  description?: string;
  icon?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}): Promise<{ ok: true; extra: DjExtra } | { ok: false; error: string }> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const title = normalizeText(input.title, 120);
  const description = normalizeText(input.description, 400) || null;
  const icon = input.icon?.trim() || null;
  const imageUrl = normalizeText(input.imageUrl, 500) || null;

  if (!title) return { ok: false, error: "Zadaj názov položky." };
  if (icon && !ICON_VALUES.has(icon as (typeof EXTRA_ICON_OPTIONS)[number]["value"])) {
    return { ok: false, error: "Neplatná ikona." };
  }

  const payload = {
    title,
    description,
    price: 0,
    icon,
    image_url: imageUrl,
    is_active: input.isActive ?? true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await auth.supabase
      .from("dj_extras")
      .update(payload)
      .eq("id", input.id)
      .eq("dj_id", auth.userId)
      .select(DJ_EXTRA_COLS)
      .single();

    if (error || !data) {
      console.error("[saveDjExtra update]", error);
      return { ok: false, error: "Položku sa nepodarilo uložiť." };
    }
    return { ok: true, extra: data as DjExtra };
  }

  const { data: existing } = await auth.supabase
    .from("dj_extras")
    .select("sort_order")
    .eq("dj_id", auth.userId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const sortOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const { data, error } = await auth.supabase
    .from("dj_extras")
    .insert({
      dj_id: auth.userId,
      sort_order: sortOrder,
      ...payload,
    })
    .select(DJ_EXTRA_COLS)
    .single();

  if (error || !data) {
    console.error("[saveDjExtra insert]", error);
    return { ok: false, error: "Položku sa nepodarilo vytvoriť." };
  }

  return { ok: true, extra: data as DjExtra };
}

export async function deleteDjExtra(
  extraId: string
): Promise<ExtrasActionResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!extraId) return { ok: false, error: "Chýba ID položky." };

  const { error } = await auth.supabase
    .from("dj_extras")
    .delete()
    .eq("id", extraId)
    .eq("dj_id", auth.userId);

  if (error) {
    console.error("[deleteDjExtra]", error);
    return { ok: false, error: "Položku sa nepodarilo zmazať." };
  }

  return { ok: true };
}

export async function getBookingExtrasBundle(bookingId: string): Promise<
  | {
      ok: true;
      catalog: DjExtra[];
      selected: BookingExtra[];
    }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const { supabase, user, booking, role } =
    await getAcceptedBookingAccess(bookingId);

  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Špeciálne požiadavky sú dostupné len pri potvrdenej rezervácii.",
    };
  }

  const [{ data: selected, error: selectedError }, { data: catalog, error: catalogError }] =
    await Promise.all([
      supabase
        .from("booking_extras")
        .select(BOOKING_EXTRA_COLS)
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: true }),
      supabase
        .from("dj_extras")
        .select(DJ_EXTRA_COLS)
        .eq("dj_id", booking.dj_id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
    ]);

  if (selectedError || catalogError) {
    console.error("[getBookingExtrasBundle]", selectedError || catalogError);
    return { ok: false, error: "Špeciálne požiadavky sa nepodarilo načítať." };
  }

  return {
    ok: true,
    catalog: (catalog ?? []) as DjExtra[],
    selected: (selected ?? []) as BookingExtra[],
  };
}

export async function addExtraToBooking(input: {
  bookingId: string;
  extraId: string;
}): Promise<
  | { ok: true; selected: BookingExtra }
  | { ok: false; error: string }
> {
  const { supabase, user, booking, role } = await getAcceptedBookingAccess(
    input.bookingId
  );

  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || role !== "client") {
    return {
      ok: false,
      error: "Požiadavku môže pridať len klient pri potvrdenej rezervácii.",
    };
  }

  const { data: extra, error: extraError } = await supabase
    .from("dj_extras")
    .select(DJ_EXTRA_COLS)
    .eq("id", input.extraId)
    .eq("dj_id", booking.dj_id)
    .eq("is_active", true)
    .maybeSingle();

  if (extraError || !extra) {
    return { ok: false, error: "Položka sa nenašla alebo nie je aktívna." };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("booking_extras")
    .insert({
      booking_id: input.bookingId,
      extra_id: extra.id,
      title: extra.title,
      description: extra.description,
      unit_price: 0,
      quantity: 1,
    })
    .select(BOOKING_EXTRA_COLS)
    .single();

  if (insertError || !inserted) {
    if (insertError?.code === "23505") {
      return { ok: false, error: "Táto položka už je pridaná." };
    }
    console.error("[addExtraToBooking]", insertError);
    return { ok: false, error: "Položku sa nepodarilo pridať." };
  }

  return { ok: true, selected: inserted as BookingExtra };
}

export async function removeExtraFromBooking(
  bookingExtraId: string
): Promise<ExtrasActionResult> {
  if (!bookingExtraId) return { ok: false, error: "Chýba ID položky." };

  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return { ok: false, error: "Musíš byť prihlásený." };

  const { data: row } = await supabase
    .from("booking_extras")
    .select("id, booking_id")
    .eq("id", bookingExtraId)
    .maybeSingle();

  if (!row) return { ok: false, error: "Položka sa nenašla." };

  const { booking, role } = await getAcceptedBookingAccess(row.booking_id);
  if (!booking || role !== "client") {
    return { ok: false, error: "Položku môže odobrať len klient." };
  }

  const { error } = await supabase
    .from("booking_extras")
    .delete()
    .eq("id", bookingExtraId);

  if (error) {
    console.error("[removeExtraFromBooking]", error);
    return { ok: false, error: "Položku sa nepodarilo odobrať." };
  }

  return { ok: true };
}
