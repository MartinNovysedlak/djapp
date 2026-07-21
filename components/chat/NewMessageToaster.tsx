"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type NewMessageToasterProps = {
  /** Base path for chat links, e.g. `/client-dashboard/bookings` */
  chatBasePath: string;
  /** Inbox page, e.g. `/client-dashboard/messages` */
  inboxHref: string;
};

/**
 * Floating chat bubble (bottom-right) with unread badge.
 */
export function NewMessageToaster({
  chatBasePath,
  inboxHref,
}: NewMessageToasterProps) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [href, setHref] = useState(inboxHref);
  const [pulse, setPulse] = useState(false);
  const userIdRef = useRef<string | null>(null);
  const knownUnreadRef = useRef<Set<string>>(new Set());

  const onMessagesPage =
    pathname?.includes("/messages") || pathname?.includes("/chat");

  const refreshUnread = useCallback(async () => {
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setUnread(0);
      return;
    }
    userIdRef.current = auth.user.id;

    const { data: bookings } = await supabase
      .from("bookings")
      .select("id")
      .or(`dj_id.eq.${auth.user.id},client_id.eq.${auth.user.id}`)
      .in("status", ["pending", "accepted"])
      .limit(40);

    const ids = (bookings ?? []).map((b) => b.id);
    if (!ids.length) {
      setUnread(0);
      return;
    }

    const { data } = await supabase
      .from("booking_messages")
      .select("id, booking_id, created_at")
      .in("booking_id", ids)
      .is("read_at", null)
      .neq("sender_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const rows = data ?? [];
    knownUnreadRef.current = new Set(rows.map((r) => r.id));
    setUnread(rows.length);
    if (rows[0]) {
      setHref(`${chatBasePath}/${rows[0].booking_id}/chat`);
    } else {
      setHref(inboxHref);
    }
  }, [chatBasePath, inboxHref]);

  useEffect(() => {
    void refreshUnread();
  }, [refreshUnread, pathname]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const onNew = (msg: {
      id: string;
      booking_id: string;
      sender_id: string;
    }) => {
      if (cancelled) return;
      if (!userIdRef.current || msg.sender_id === userIdRef.current) return;
      if (knownUnreadRef.current.has(msg.id)) return;
      knownUnreadRef.current.add(msg.id);

      const onThisChat =
        pathname?.includes(`/bookings/${msg.booking_id}/chat`) ?? false;
      if (onThisChat) {
        void refreshUnread();
        return;
      }

      setHref(`${chatBasePath}/${msg.booking_id}/chat`);
      setUnread((n) => n + 1);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    };

    const channel = supabase
      .channel("new-message-bubble")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "booking_messages",
        },
        (payload) => {
          const row = payload.new as {
            id: string;
            booking_id: string;
            sender_id: string;
          };
          onNew(row);
        }
      )
      .subscribe();

    const poll = window.setInterval(() => {
      void refreshUnread();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(poll);
      void supabase.removeChannel(channel);
    };
  }, [chatBasePath, pathname, refreshUnread]);

  if (onMessagesPage || unread <= 0) return null;

  const badge = unread > 9 ? "9+" : String(unread);

  return (
    <Link
      href={href}
      aria-label={`Správy, ${unread} neprečítaných`}
      className={[
        "fixed bottom-6 right-5 z-[80] flex size-14 items-center justify-center rounded-full",
        "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white",
        "shadow-[0_16px_40px_-12px_rgba(139,92,246,0.75)]",
        "transition-transform hover:scale-105 active:scale-95",
        "md:bottom-8 md:right-8",
        pulse ? "animate-[bubblePop_0.45s_ease-out]" : "",
      ].join(" ")}
    >
      <MessageCircle className="size-6" strokeWidth={2.25} />
      <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-[#0A0A0A] bg-rose-500 px-1 text-[11px] font-bold leading-none text-white">
        {badge}
      </span>
      <style jsx>{`
        @keyframes bubblePop {
          0% {
            transform: scale(0.85);
          }
          55% {
            transform: scale(1.12);
          }
          100% {
            transform: scale(1);
          }
        }
      `}</style>
    </Link>
  );
}
