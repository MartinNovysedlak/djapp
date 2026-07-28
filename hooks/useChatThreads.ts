"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import {
  getChatThreadsCache,
  setChatThreadsCache,
} from "@/lib/nav-cache";
import type { ChatThread } from "@/app/actions/booking-messages";

type BookingRow = {
  id: string;
  status: string;
  event_type: string;
  event_date: string;
  client_name: string | null;
  client_id: string | null;
  dj_id: string;
};

/**
 * Load chat inbox via browser Supabase (no Vercel server-action round-trip).
 * Serves cached threads instantly, then refreshes in the background.
 */
export function useChatThreads(userId: string | undefined) {
  const cached = userId ? getChatThreadsCache<ChatThread>(userId) : null;
  const [threads, setThreads] = useState<ChatThread[]>(cached ?? []);
  const [loading, setLoading] = useState(!cached && Boolean(userId));

  const refresh = useCallback(async () => {
    if (!userId) return { ok: false as const };

    const supabase = createClient();
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select(
        "id, status, event_type, event_date, client_name, client_id, dj_id"
      )
      .or(`dj_id.eq.${userId},client_id.eq.${userId}`)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) {
      console.error("[useChatThreads]", error);
      return { ok: false as const, error };
    }

    const rows = (bookings ?? []) as BookingRow[];
    if (rows.length === 0) {
      setChatThreadsCache(userId, []);
      setThreads([]);
      setLoading(false);
      return { ok: true as const, threads: [] as ChatThread[] };
    }

    const ids = rows.map((b) => b.id);
    const djIds = [
      ...new Set(
        rows.filter((b) => b.client_id === userId).map((b) => b.dj_id)
      ),
    ];

    const [messagesRes, unreadRes, djProfilesRes] = await Promise.all([
      supabase
        .from("booking_messages")
        .select("booking_id, body, attachment_path, created_at")
        .in("booking_id", ids)
        .order("created_at", { ascending: false })
        .limit(Math.min(ids.length * 3, 120)),
      supabase
        .from("booking_messages")
        .select("booking_id")
        .in("booking_id", ids)
        .is("read_at", null)
        .neq("sender_id", userId)
        .limit(200),
      djIds.length > 0
        ? supabase.from("profiles").select("id, full_name").in("id", djIds)
        : Promise.resolve({
            data: [] as { id: string; full_name: string | null }[],
          }),
    ]);

    const djMap = Object.fromEntries(
      (djProfilesRes.data ?? []).map(
        (p: { id: string; full_name: string | null }) => [p.id, p.full_name]
      )
    );

    const lastByBooking = new Map<
      string,
      {
        body: string | null;
        attachment_path: string | null;
        created_at: string;
      }
    >();
    for (const m of messagesRes.data ?? []) {
      if (!lastByBooking.has(m.booking_id)) {
        lastByBooking.set(m.booking_id, m);
      }
    }

    const unreadByBooking = new Map<string, number>();
    for (const m of unreadRes.data ?? []) {
      unreadByBooking.set(
        m.booking_id,
        (unreadByBooking.get(m.booking_id) ?? 0) + 1
      );
    }

    const next: ChatThread[] = rows.map((b) => {
      const last = lastByBooking.get(b.id) ?? null;
      const isDj = b.dj_id === userId;
      return {
        bookingId: b.id,
        title: isDj
          ? b.client_name || "Zákazník"
          : djMap[b.dj_id] || "Umelec",
        subtitle: `${b.event_type} · ${b.event_date}`,
        lastMessage: last
          ? last.body || (last.attachment_path ? "📷 Fotka" : "Správa")
          : null,
        lastAt: last?.created_at ?? null,
        unread: unreadByBooking.get(b.id) ?? 0,
        status: b.status,
      };
    });

    next.sort((a, b) => {
      const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
      const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
      return tb - ta;
    });

    setChatThreadsCache(userId, next);
    setThreads(next);
    setLoading(false);
    return { ok: true as const, threads: next };
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setThreads([]);
      setLoading(false);
      return;
    }

    const hit = getChatThreadsCache<ChatThread>(userId);
    if (hit) {
      setThreads(hit);
      setLoading(false);
    } else {
      setLoading(true);
    }

    void refresh();
  }, [userId, refresh]);

  return { threads, loading, refresh };
}
