"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { getBookingsCache, setBookingsCache } from "@/lib/nav-cache";

export type CachedBooking = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  event_type: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_location: string | null;
  message: string | null;
  created_at: string;
  status: "pending" | "accepted" | "rejected";
  rejection_reason: string | null;
  type: "booking" | "blockout";
  title: string | null;
  client_id: string | null;
  all_day: boolean;
  pdf_delivery_status:
    | "none"
    | "manual_sent"
    | "email_sent"
    | "confirmed_in_person"
    | "printed_handed"
    | "other"
    | null;
  invoice_delivery_status:
    | "none"
    | "manual_sent"
    | "email_sent"
    | "confirmed_in_person"
    | "printed_handed"
    | "other"
    | null;
  price: number | null;
  base_price: number | null;
  bulk_inquiry_id: string | null;
  client_budget: number | null;
  dj_offer_price: number | null;
  dj_offer_message: string | null;
};

const SELECT =
  "id, client_name, client_email, client_phone, event_type, event_date, end_date, start_time, end_time, event_location, message, created_at, status, rejection_reason, type, title, client_id, all_day, pdf_delivery_status, invoice_delivery_status, price, base_price, bulk_inquiry_id, client_budget, dj_offer_price, dj_offer_message";

/**
 * Shared bookings loader for dashboard pages — serves cached rows instantly,
 * then refreshes in the background.
 */
export function useDjBookings(djId: string | undefined) {
  const cached = djId ? getBookingsCache<CachedBooking>(djId) : null;
  const [bookings, setBookingsState] = useState<CachedBooking[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached && Boolean(djId));

  const setBookings = useCallback(
    (
      updater:
        | CachedBooking[]
        | ((prev: CachedBooking[]) => CachedBooking[])
    ) => {
      setBookingsState((prev) => {
        const next = typeof updater === "function" ? updater(prev) : updater;
        if (djId) setBookingsCache(djId, next);
        return next;
      });
    },
    [djId]
  );

  const refresh = useCallback(async () => {
    if (!djId) return;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("bookings")
      .select(SELECT)
      .eq("dj_id", djId)
      .order("event_date", { ascending: true });

    if (error) {
      console.error("[useDjBookings]", error);
      return { ok: false as const, error };
    }

    const rows = ((data ?? []) as CachedBooking[]).map((row) => ({
      ...row,
      type: row.type === "blockout" ? ("blockout" as const) : ("booking" as const),
      all_day: Boolean(row.all_day),
      status: (row.status as CachedBooking["status"]) ?? "pending",
    }));

    setBookingsCache(djId, rows);
    setBookingsState(rows);
    setLoading(false);
    return { ok: true as const, rows };
  }, [djId]);

  useEffect(() => {
    if (!djId) {
      setLoading(false);
      return;
    }

    const hit = getBookingsCache<CachedBooking>(djId);
    if (hit) {
      setBookingsState(hit);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void refresh();
  }, [djId, refresh]);

  return { bookings, setBookings, loading, refresh };
}
