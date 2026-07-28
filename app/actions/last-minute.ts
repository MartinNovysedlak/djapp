"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { hasAcceptedConflict } from "@/app/actions/bookings";
import { requirePremiumAccess } from "@/lib/require-premium";
import {
  computeOfferExpiresAt,
  todayIsoLocal,
  type LastMinuteCatalogHit,
  type LastMinuteOffer,
} from "@/lib/last-minute";

const COLS =
  "id, dj_id, event_date, discounted_price, original_price, book_within_days, expires_at, note, is_active, created_at, updated_at";

export type LastMinuteResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireDj() {
  const premium = await requirePremiumAccess();
  if (!premium.ok) {
    return { ok: false as const, error: premium.error };
  }

  const ssr = await createSSRClient();
  const { data: authData } = await ssr.auth.getUser();
  if (!authData.user) {
    return { ok: false as const, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await ssr
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (profile?.role !== "dj") {
    return {
      ok: false as const,
      error: "Len umelec môže spravovať last-minute ponuky.",
    };
  }

  return { ok: true as const, ssr, djId: authData.user.id };
}

export async function listMyLastMinuteOffers(): Promise<
  { ok: true; offers: LastMinuteOffer[] } | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const { data, error } = await auth.ssr
    .from("last_minute_offers")
    .select(COLS)
    .eq("dj_id", auth.djId)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[listMyLastMinuteOffers]", error);
    return { ok: false, error: "Ponuky sa nepodarilo načítať." };
  }

  return { ok: true, offers: (data ?? []) as LastMinuteOffer[] };
}

export async function listPublicLastMinuteOffers(djId: string): Promise<
  { ok: true; offers: LastMinuteOffer[] } | { ok: false; error: string }
> {
  if (!djId) return { ok: false, error: "Chýba DJ." };
  const ssr = await createSSRClient();
  const today = todayIsoLocal();

  const { data, error } = await ssr
    .from("last_minute_offers")
    .select(COLS)
    .eq("dj_id", djId)
    .eq("is_active", true)
    .gte("event_date", today)
    .gte("expires_at", today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[listPublicLastMinuteOffers]", error);
    return { ok: false, error: "Ponuky sa nepodarilo načítať." };
  }

  return { ok: true, offers: (data ?? []) as LastMinuteOffer[] };
}

/** Active deals grouped for catalog filter + badges. */
export async function listCatalogLastMinuteHits(): Promise<
  | { ok: true; byDjId: Record<string, LastMinuteCatalogHit> }
  | { ok: false; error: string }
> {
  const ssr = await createSSRClient();
  const today = todayIsoLocal();

  const { data, error } = await ssr
    .from("last_minute_offers")
    .select(
      "id, dj_id, event_date, discounted_price, original_price, expires_at"
    )
    .eq("is_active", true)
    .gte("event_date", today)
    .gte("expires_at", today)
    .order("event_date", { ascending: true });

  if (error) {
    console.error("[listCatalogLastMinuteHits]", error);
    return { ok: false, error: "Last-minute filter sa nepodarilo načítať." };
  }

  const byDjId: Record<string, LastMinuteCatalogHit> = {};
  for (const row of data ?? []) {
    const djId = row.dj_id as string;
    const existing = byDjId[djId];
    if (!existing) {
      byDjId[djId] = {
        dj_id: djId,
        offer_id: row.id as string,
        event_date: row.event_date as string,
        discounted_price: Number(row.discounted_price),
        original_price:
          row.original_price == null ? null : Number(row.original_price),
        expires_at: row.expires_at as string,
        offer_count: 1,
      };
    } else {
      existing.offer_count += 1;
    }
  }

  return { ok: true, byDjId };
}

export async function upsertLastMinuteOffer(input: {
  id?: string;
  eventDate: string;
  discountedPrice: number;
  originalPrice?: number | null;
  bookWithinDays: number;
  note?: string | null;
}): Promise<
  { ok: true; offer: LastMinuteOffer } | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };

  const eventDate = input.eventDate?.trim();
  const bookWithinDays = Math.round(Number(input.bookWithinDays) || 0);
  const discountedPrice = Number(input.discountedPrice);
  const originalPrice =
    input.originalPrice == null ? null : Number(input.originalPrice);
  const note = (input.note ?? "").trim().slice(0, 400) || null;
  const today = todayIsoLocal();

  if (!eventDate) return { ok: false, error: "Vyber dátum." };
  if (eventDate < today) {
    return { ok: false, error: "Dátum musí byť dnes alebo neskôr." };
  }
  if (!Number.isFinite(discountedPrice) || discountedPrice < 0) {
    return { ok: false, error: "Zadaj platnú zníženú cenu." };
  }
  if (bookWithinDays < 1 || bookWithinDays > 60) {
    return { ok: false, error: "Lehota rezervácie musí byť 1–60 dní." };
  }
  if (
    originalPrice != null &&
    (!Number.isFinite(originalPrice) || originalPrice < discountedPrice)
  ) {
    return {
      ok: false,
      error: "Bežná cena musí byť vyššia alebo rovná zníženej.",
    };
  }

  const conflict = await hasAcceptedConflict(
    auth.djId,
    eventDate,
    eventDate,
    "00:00",
    "23:59"
  );
  if (conflict.conflict) {
    return {
      ok: false,
      error:
        conflict.label ??
        "Tento deň už máš obsadený — last-minute ponuka je len na voľný termín.",
    };
  }

  const expiresAt = computeOfferExpiresAt(eventDate, bookWithinDays, today);
  const payload = {
    dj_id: auth.djId,
    event_date: eventDate,
    discounted_price: discountedPrice,
    original_price: originalPrice,
    book_within_days: bookWithinDays,
    expires_at: expiresAt,
    note,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await auth.ssr
      .from("last_minute_offers")
      .update(payload)
      .eq("id", input.id)
      .eq("dj_id", auth.djId)
      .select(COLS)
      .single();

    if (error || !data) {
      console.error("[upsertLastMinuteOffer update]", error);
      return { ok: false, error: "Ponuku sa nepodarilo uložiť." };
    }
    return { ok: true, offer: data as LastMinuteOffer };
  }

  const { data, error } = await auth.ssr
    .from("last_minute_offers")
    .upsert(payload, { onConflict: "dj_id,event_date" })
    .select(COLS)
    .single();

  if (error || !data) {
    console.error("[upsertLastMinuteOffer upsert]", error);
    return { ok: false, error: "Ponuku sa nepodarilo vytvoriť." };
  }

  return { ok: true, offer: data as LastMinuteOffer };
}

export async function deactivateLastMinuteOffer(
  offerId: string
): Promise<LastMinuteResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!offerId) return { ok: false, error: "Chýba ID ponuky." };

  const { error } = await auth.ssr
    .from("last_minute_offers")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", offerId)
    .eq("dj_id", auth.djId);

  if (error) {
    console.error("[deactivateLastMinuteOffer]", error);
    return { ok: false, error: "Ponuku sa nepodarilo vypnúť." };
  }

  return { ok: true };
}

export async function deleteLastMinuteOffer(
  offerId: string
): Promise<LastMinuteResult> {
  const auth = await requireDj();
  if (!auth.ok) return { ok: false, error: auth.error };
  if (!offerId) return { ok: false, error: "Chýba ID ponuky." };

  const { error } = await auth.ssr
    .from("last_minute_offers")
    .delete()
    .eq("id", offerId)
    .eq("dj_id", auth.djId);

  if (error) {
    console.error("[deleteLastMinuteOffer]", error);
    return { ok: false, error: "Ponuku sa nepodarilo zmazať." };
  }

  return { ok: true };
}
