"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronRight, Loader2, MessageCircle } from "lucide-react";
import {
  listChatThreads,
  type ChatThread,
} from "@/app/actions/booking-messages";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

function formatWhen(iso: string | null) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("sk-SK", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** Inbox of chat threads only — click opens one conversation. */
export function ChatInbox({ basePath }: { basePath: string }) {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ChatThread[]>([]);
  const loadingRef = useRef(false);

  const load = useCallback(async (silent = false) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    if (!silent) setLoading(true);
    try {
      const result = await listChatThreads();
      if (result.ok) setThreads(result.threads);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(false);
    const id = window.setInterval(() => void load(true), 20000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("chat-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "booking_messages" },
        () => {
          void load(true);
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-zinc-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (threads.length === 0) {
    return (
      <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
        <MessageCircle className="mx-auto size-8 text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-400">
          Zatiaľ žiadne chaty. Keď máš rezerváciu, chat nájdeš tu.
        </p>
        <Link
          href={
            basePath.startsWith("/client")
              ? "/client-dashboard"
              : "/dashboard/bookings"
          }
          className="mt-4 inline-flex text-sm text-violet-300 underline-offset-2 hover:underline"
        >
          Prejsť na rezervácie
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {threads.map((t) => (
        <Link
          key={t.bookingId}
          href={`${basePath}/${t.bookingId}/chat`}
          className={cn(
            "flex items-center gap-3 rounded-2xl border border-white/10 bg-card/60 px-4 py-3.5 transition-colors hover:border-violet-500/30",
            t.unread > 0 && "border-violet-500/25 bg-violet-500/[0.06]"
          )}
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 text-sm font-bold text-violet-100">
            {t.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold text-white">{t.title}</p>
              <span className="shrink-0 text-[10px] text-zinc-500">
                {formatWhen(t.lastAt)}
              </span>
            </div>
            <p className="truncate text-xs text-zinc-500">{t.subtitle}</p>
            <p
              className={cn(
                "mt-0.5 truncate text-sm",
                t.unread > 0 ? "font-medium text-zinc-200" : "text-zinc-500"
              )}
            >
              {t.lastMessage
                ? t.lastMessage.length > 80
                  ? `${t.lastMessage.slice(0, 80)}…`
                  : t.lastMessage
                : "Zatiaľ bez správ — napíš prvý…"}
            </p>
          </div>
          {t.unread > 0 ? (
            <span className="inline-flex min-w-5 shrink-0 items-center justify-center rounded-full bg-violet-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {t.unread > 9 ? "9+" : t.unread}
            </span>
          ) : (
            <ChevronRight className="size-4 shrink-0 text-zinc-600" />
          )}
        </Link>
      ))}
    </div>
  );
}
