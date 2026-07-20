"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Ban,
  Calendar,
  CalendarDays,
  Check,
  Clock,
  Loader2,
  MapPin,
  PartyPopper,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/lib/toast-context";
import { useClientUser } from "@/components/ClientUserContext";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { claimOrphanedBookings } from "@/app/actions/reviews";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { BookingExtras } from "@/components/extras/BookingExtras";
import { LiveRequestQr } from "@/components/live/LiveRequestQr";
import { isPastLocalDate, parseLocalDate } from "@/lib/dates";
import { formatEventTypeLabel } from "@/lib/event-types";
import { formatExtraPrice } from "@/lib/extras/types";

type BookingStatus = "pending" | "accepted" | "rejected";

type Booking = {
  id: string;
  dj_id: string;
  event_type: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_location: string | null;
  message: string | null;
  created_at: string;
  status: BookingStatus;
  rejection_reason: string | null;
  price: number | null;
  base_price: number | null;
};

type DJInfo = { id: string; full_name: string | null; avatar_url: string | null; public_slug: string | null };

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string | null) {
  if (!end || end === start) return formatDate(start);
  return `${parseLocalDate(start).toLocaleDateString("sk-SK", { day: "numeric", month: "short" })} – ${formatDate(end)}`;
}

function StatusBadge({ status }: { status: BookingStatus }) {
  if (status === "accepted") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
        <Check className="mr-1 size-3" />
        Prijaté
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge className="border-red-500/30 bg-red-500/15 text-red-300">
        <Ban className="mr-1 size-3" />
        Odmietnuté
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-300">
      <Clock className="mr-1 size-3" />
      Čaká na vyjadrenie
    </Badge>
  );
}

export default function ClientDashboardPage() {
  const { showToast } = useToast();
  const { user, loading: userLoading } = useClientUser();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [djs, setDjs] = useState<Record<string, DJInfo>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const userId = user?.id;
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (!userId) {
      if (!userLoading) setLoading(false);
      return;
    }

    const supabase = createClient();
    let cancelled = false;
    if (!hasLoadedRef.current) setLoading(true);

    const load = async () => {
      await claimOrphanedBookings();
      if (cancelled) return;

      const { data: bookingRows, error } = await supabase
        .from("bookings")
        .select(
          "id, dj_id, event_type, event_date, end_date, start_time, end_time, event_location, message, created_at, status, rejection_reason, price, base_price"
        )
        .eq("client_id", userId)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (error) {
        console.error("[client-dashboard]", error);
        showToast("Dopyty sa nepodarilo načítať.", "error");
        setLoading(false);
        return;
      }

      const rows = (bookingRows ?? []) as Booking[];
      setBookings(rows);

      const djIds = Array.from(new Set(rows.map((r) => r.dj_id)));
      if (djIds.length > 0) {
        const { data: djRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, public_slug")
          .in("id", djIds);
        if (cancelled) return;
        const map: Record<string, DJInfo> = {};
        (djRows ?? []).forEach((d) => (map[d.id] = d as DJInfo));
        setDjs(map);
      }

      const { data: reviewRows } = await supabase
        .from("reviews")
        .select("booking_id")
        .eq("client_id", userId);
      if (cancelled) return;
      setReviewedIds(new Set((reviewRows ?? []).map((r) => r.booking_id as string)));

      hasLoadedRef.current = true;
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, userLoading, showToast]);

  if (userLoading || (loading && !hasLoadedRef.current)) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const pendingReviews = bookings.filter((b) => {
    const eventPassed = isPastLocalDate(b.end_date ?? b.event_date);
    return b.status === "accepted" && eventPassed && !reviewedIds.has(b.id);
  });

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Moje rezervácie
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Prehľad rezervácií, ktoré si odoslal DJ-om z katalógu. Po skončenej
            prijatej akcii môžeš DJ-a ohodnotiť.
          </p>
        </div>
      </Reveal>

      {pendingReviews.length > 0 && (
        <Reveal delay={60}>
          <div
            id="hodnotenia"
            className="mb-6 scroll-mt-24 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.1] to-transparent p-5 md:p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 text-base font-semibold text-amber-200">
                  <Star className="size-4 fill-amber-400 text-amber-400" />
                  Čaká na tvoje hodnotenie
                </h2>
                <p className="mt-1 text-xs text-amber-200/60">
                  {pendingReviews.length === 1
                    ? "Máš 1 akciu, ktorú môžeš ohodnotiť."
                    : `Máš ${pendingReviews.length} akcie, ktoré môžeš ohodnotiť.`}
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {pendingReviews.map((b) => {
                const dj = djs[b.dj_id];
                const djName = dj?.full_name || "DJ";
                return (
                  <div
                    key={b.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-white">{djName}</p>
                      <p className="text-xs text-zinc-500">
                        {formatDateRange(b.event_date, b.end_date)}
                      </p>
                    </div>
                    <Link
                      href="/client-dashboard/reviews"
                      className="inline-flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 text-[0.8rem] font-medium text-white hover:brightness-110"
                    >
                      <Star className="size-3.5" />
                      Napísať recenziu
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </Reveal>
      )}

      {bookings.length === 0 ? (
        <Reveal delay={100}>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-card/50 px-6 py-16 text-center md:px-12">
            <div className="mx-auto flex max-w-md flex-col items-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-3xl border border-white/10 bg-white/5 animate-float">
                <CalendarDays className="size-7 text-violet-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Zatiaľ žiadne rezervácie
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Prehliadaj katalóg DJ-ov a odošli svoju prvú nezáväznú rezerváciu.
                </p>
              </div>
              <Link
                href="/djs"
                className="mt-2 inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white shadow-[0_12px_36px_-10px_oklch(0.6_0.26_295)] transition-all duration-300 hover:brightness-110 active:scale-[0.98]"
              >
                <Users className="size-4" />
                Prehliadať katalóg
              </Link>
            </div>
          </div>
        </Reveal>
      ) : (
        <div className="space-y-4">
          {bookings.map((b, i) => {
            const dj = djs[b.dj_id];
            const djName = dj?.full_name || "DJ";
            const eventPassed = isPastLocalDate(b.end_date ?? b.event_date);
            const canReview = b.status === "accepted" && eventPassed;
            const alreadyReviewed = reviewedIds.has(b.id);

            return (
              <Reveal key={b.id} delay={100 + i * 60}>
                <article className="card-lift overflow-hidden rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md transition-all duration-500 hover:border-violet-500/25 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
                        {dj?.avatar_url ? (
                          <Image src={dj.avatar_url} alt={djName} fill className="object-cover" />
                        ) : (
                          <div className="flex size-full items-center justify-center text-sm font-bold text-violet-200">
                            {djName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        {dj?.public_slug ? (
                          <Link
                            href={`/djs/${dj.public_slug}`}
                            className="text-sm font-semibold text-white transition-colors hover:text-violet-300"
                          >
                            {djName}
                          </Link>
                        ) : (
                          <p className="text-sm font-semibold text-white">{djName}</p>
                        )}
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-zinc-500">
                          <Clock className="size-3" />
                          Odoslané {formatDate(b.created_at)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
                      <PartyPopper className="mr-1 size-3" />
                      {formatEventTypeLabel(b.event_type)}
                    </Badge>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-200">
                      <Calendar className="size-3.5 text-violet-300" />
                      {formatDateRange(b.event_date, b.end_date)}
                    </span>
                    {(b.start_time || b.end_time) && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-200">
                        <Clock className="size-3.5 text-violet-300" />
                        {String(b.start_time ?? "").slice(0, 5)}–
                        {String(b.end_time ?? "").slice(0, 5)}
                      </span>
                    )}
                    {b.event_location && (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
                        <MapPin className="size-3.5 text-violet-400/70" />
                        {b.event_location}
                      </span>
                    )}
                  </div>

                  {b.status === "rejected" && b.rejection_reason && (
                    <div className="mt-4 rounded-xl border border-red-500/15 bg-red-500/[0.04] px-3.5 py-2.5 text-xs text-red-300/90">
                      <span className="font-medium text-red-300">Dôvod DJ-a: </span>
                      {b.rejection_reason}
                    </div>
                  )}

                  {b.status === "accepted" && (
                    <div className="mt-4 space-y-3">
                      {(b.price != null || b.base_price != null) && (
                        <p className="text-xs text-zinc-500">
                          Celková suma rezervácie:{" "}
                          <span className="font-medium text-white">
                            {formatExtraPrice(
                              b.price != null
                                ? Number(b.price)
                                : Number(b.base_price)
                            )}
                          </span>
                        </p>
                      )}
                      <LiveRequestQr
                        bookingId={b.id}
                        mode="client"
                        defaultOpen={false}
                      />
                      <BookingExtras
                        bookingId={b.id}
                        mode="client"
                        defaultOpen={true}
                      />
                      <MusicPlanner bookingId={b.id} mode="client" />
                      <EventTimeline bookingId={b.id} mode="client" />
                    </div>
                  )}

                  {canReview && (
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/5 pt-4">
                      {alreadyReviewed ? (
                        <p className="flex items-center gap-1.5 text-xs text-emerald-300">
                          <Star className="size-3.5 fill-emerald-300" />
                          Už ste ohodnotili
                        </p>
                      ) : (
                        <>
                          <p className="text-xs text-zinc-500">Akcia sa už skončila.</p>
                          <Link
                            href="/client-dashboard/reviews"
                            className="inline-flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-2.5 text-[0.8rem] font-medium text-white hover:brightness-110"
                          >
                            <Star className="size-3.5" />
                            Napísať recenziu
                          </Link>
                        </>
                      )}
                    </div>
                  )}
                </article>
              </Reveal>
            );
          })}
        </div>
      )}
    </div>
  );
}
