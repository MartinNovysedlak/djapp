"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Loader2,
  Music2,
  Radio,
  Trash2,
  X,
} from "lucide-react";
import {
  deleteLiveRequest,
  listLiveRequests,
  updateLiveRequestStatus,
} from "@/app/actions/live-requests";
import { createClient } from "@/utils/supabase/client";
import type { LiveRequest, LiveRequestStatus } from "@/lib/live/types";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

type LiveBoothProps = {
  bookingId: string;
  eventLabel?: string | null;
};

function statusRank(status: LiveRequestStatus) {
  switch (status) {
    case "pending":
      return 0;
    case "accepted":
      return 1;
    case "played":
      return 2;
    case "rejected":
      return 3;
    default:
      return 9;
  }
}

export function LiveBooth({ bookingId, eventLabel }: LiveBoothProps) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<LiveRequest[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await listLiveRequests(bookingId);
    if (!result.ok) {
      showToast(result.error, "error");
      setLoading(false);
      return;
    }
    setRequests(result.requests);
    setLoading(false);
  }, [bookingId, showToast]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`live-requests:${bookingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_requests",
          filter: `booking_id=eq.${bookingId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as LiveRequest;
            setRequests((prev) => {
              if (prev.some((r) => r.id === row.id)) return prev;
              return [row, ...prev];
            });
            return;
          }
          if (payload.eventType === "UPDATE") {
            const row = payload.new as LiveRequest;
            setRequests((prev) =>
              prev.map((r) => (r.id === row.id ? row : r))
            );
            return;
          }
          if (payload.eventType === "DELETE") {
            const row = payload.old as { id?: string };
            if (!row.id) return;
            setRequests((prev) => prev.filter((r) => r.id !== row.id));
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId]);

  const sorted = useMemo(() => {
    return [...requests].sort((a, b) => {
      const rank = statusRank(a.status) - statusRank(b.status);
      if (rank !== 0) return rank;
      return (
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    });
  }, [requests]);

  const counts = useMemo(() => {
    return {
      pending: requests.filter((r) => r.status === "pending").length,
      accepted: requests.filter((r) => r.status === "accepted").length,
      played: requests.filter((r) => r.status === "played").length,
    };
  }, [requests]);

  async function setStatus(id: string, status: LiveRequestStatus) {
    setBusyId(id);
    const result = await updateLiveRequestStatus({ requestId: id, status });
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setRequests((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, status, updated_at: new Date().toISOString() }
          : r
      )
    );
  }

  async function remove(id: string) {
    setBusyId(id);
    const result = await deleteLiveRequest(id);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  return (
    <div className="flex min-h-svh flex-col bg-[#0A0A0A]">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 md:px-6">
          <Link
            href="/dashboard/bookings"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "gap-1.5 rounded-full"
            )}
          >
            <ArrowLeft className="size-3.5" />
            Späť
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-emerald-400" />
              </span>
              <h1 className="truncate text-base font-semibold text-white md:text-lg">
                Live želania
              </h1>
            </div>
            {eventLabel ? (
              <p className="truncate text-xs text-zinc-500">{eventLabel}</p>
            ) : null}
          </div>
          <div className="hidden items-center gap-2 text-xs sm:flex">
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-amber-200">
              Nové {counts.pending}
            </span>
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-200">
              V rade {counts.accepted}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-300">
              Zahrané {counts.played}
            </span>
          </div>
          <Radio className="size-5 text-violet-300" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 md:px-6 md:py-6">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="size-7 animate-spin text-violet-400" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/15 bg-white/[0.02] px-6 py-20 text-center">
            <Music2 className="size-8 text-zinc-600" />
            <p className="text-sm font-medium text-white">
              Zatiaľ žiadne želania
            </p>
            <p className="max-w-sm text-xs text-zinc-500">
              Keď hostia naskenujú QR a pošlú skladbu, objaví sa tu okamžite.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((req) => {
              const busy = busyId === req.id;
              return (
                <li
                  key={req.id}
                  className={cn(
                    "flex flex-col rounded-2xl border p-4 backdrop-blur-md transition-colors",
                    req.status === "pending" &&
                      "border-amber-500/30 bg-amber-500/[0.07]",
                    req.status === "accepted" &&
                      "border-emerald-500/30 bg-emerald-500/[0.07]",
                    req.status === "played" &&
                      "border-white/10 bg-white/[0.03] opacity-70",
                    req.status === "rejected" &&
                      "border-red-500/25 bg-red-500/[0.06] opacity-60"
                  )}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-white">
                        {req.song_title}
                      </p>
                      <p className="truncate text-sm text-zinc-400">
                        {req.artist}
                      </p>
                      {req.guest_name ? (
                        <p className="mt-1 truncate text-xs text-violet-200/80">
                          Od: {req.guest_name}
                        </p>
                      ) : null}
                      {req.source_url ? (
                        <a
                          href={req.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-[11px] text-violet-300/80 hover:text-violet-200"
                        >
                          Otvoriť odkaz
                        </a>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-[10px] text-zinc-500">
                      {new Date(req.created_at).toLocaleTimeString("sk-SK", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </time>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      disabled={busy || req.status === "accepted"}
                      onClick={() => setStatus(req.id, "accepted")}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/15 px-2.5 py-1.5 text-[11px] font-medium text-emerald-200 transition hover:bg-emerald-500/25 disabled:opacity-40"
                    >
                      <Check className="size-3" />
                      V rade
                    </button>
                    <button
                      type="button"
                      disabled={busy || req.status === "played"}
                      onClick={() => setStatus(req.id, "played")}
                      className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition hover:bg-white/10 disabled:opacity-40"
                    >
                      Zahrané
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(req.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-red-500/35 bg-red-500/10 px-2.5 py-1.5 text-[11px] font-medium text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      {busy ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Trash2 className="size-3" />
                      )}
                      Zmazať
                    </button>
                    {req.status === "pending" ? (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setStatus(req.id, "rejected")}
                        className="inline-flex items-center gap-1 rounded-full border border-red-500/25 px-2.5 py-1.5 text-[11px] text-red-300/80 transition hover:bg-red-500/10 disabled:opacity-40"
                      >
                        <X className="size-3" />
                        Zamietnuť
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
