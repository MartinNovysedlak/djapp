"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Ban,
  Calendar,
  CalendarDays,
  Check,
  ChevronDown,
  Clock,
  Loader2,
  MapPin,
  MessageCircle,
  PartyPopper,
  Star,
  Users,
  XCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/lib/toast-context";
import { useClientUser } from "@/components/ClientUserContext";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { claimOrphanedBookings } from "@/app/actions/reviews";
import {
  confirmClientBookingOffer,
  declineClientBookingOffer,
} from "@/app/actions/booking-status";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { BookingExtras } from "@/components/extras/BookingExtras";
import { LiveRequestQr } from "@/components/live/LiveRequestQr";
import { isPastLocalDate, parseLocalDate } from "@/lib/dates";
import { formatEventTypeLabel } from "@/lib/event-types";
import { formatExtraPrice } from "@/lib/extras/types";
import { cn } from "@/lib/utils";
import {
  formatArtistDisplayName,
  getArtistNoun,
  normalizeArtistKind,
} from "@/lib/dj-display";

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
  client_budget: number | null;
  dj_offer_price: number | null;
  dj_offer_message: string | null;
  bulk_inquiry_id: string | null;
};

type DJInfo = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  artist_kind?: string | null;
};

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(start: string, end: string | null) {
  if (!end || end === start) return formatDate(start);
  return `${parseLocalDate(start).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "short",
  })} – ${formatDate(end)}`;
}

function StatusBadge({
  status,
  hasOffer,
  artistKind,
}: {
  status: BookingStatus;
  hasOffer?: boolean;
  artistKind?: string | null;
}) {
  if (status === "accepted") {
    return (
      <Badge className="border-fuchsia-500/30 bg-fuchsia-500/15 text-fuchsia-200">
        <Check className="mr-1 size-3" />
        Potvrdené
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
  if (hasOffer) {
    return (
      <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
        <Clock className="mr-1 size-3" />
        Ponuka od {getArtistNoun(artistKind, "gen")}
      </Badge>
    );
  }
  return (
    <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-200">
      <Clock className="mr-1 size-3" />
      Čaká na {getArtistNoun(artistKind, "acc")}
    </Badge>
  );
}

function BookingRow({
  booking,
  dj,
  canReview,
  alreadyReviewed,
  expanded,
  onToggle,
  onOfferResolved,
}: {
  booking: Booking;
  dj?: DJInfo;
  canReview: boolean;
  alreadyReviewed: boolean;
  expanded: boolean;
  onToggle: () => void;
  onOfferResolved: () => void;
}) {
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const djName = formatArtistDisplayName(
    {
      full_name: dj?.full_name ?? null,
      artist_kind: dj?.artist_kind,
    },
    "Umelec"
  );
  const artistKind = normalizeArtistKind(dj?.artist_kind);
  const hasOffer =
    booking.status === "pending" &&
    booking.dj_offer_price != null &&
    !booking.bulk_inquiry_id;

  async function confirmOffer() {
    setBusy(true);
    const result = await confirmClientBookingOffer(booking.id);
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || "Potvrdenie zlyhalo.", "error");
      return;
    }
    showToast("Rezervácia potvrdená.", "success");
    onOfferResolved();
  }

  async function declineOffer() {
    setBusy(true);
    const result = await declineClientBookingOffer(booking.id);
    setBusy(false);
    if (!result.ok) {
      showToast(result.error || "Odmietnutie zlyhalo.", "error");
      return;
    }
    showToast("Ponuka odmietnutá.", "success");
    onOfferResolved();
  }

  return (
    <article
      className={cn(
        "border-b border-white/8 last:border-b-0",
        expanded && "bg-white/[0.025]"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-3 py-3.5 text-left md:px-4"
      >
        <div className="relative size-10 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
          {dj?.avatar_url ? (
            <Image
              src={dj.avatar_url}
              alt={djName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm font-bold text-violet-200">
              {djName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-semibold text-white md:text-[0.95rem]">
              {djName}
            </p>
            <StatusBadge
              status={booking.status}
              hasOffer={hasOffer}
              artistKind={artistKind}
            />
          </div>
          <p className="mt-0.5 truncate text-xs text-zinc-500">
            {formatEventTypeLabel(booking.event_type)}
            <span className="text-zinc-600"> · </span>
            {formatDateRange(booking.event_date, booking.end_date)}
            {booking.event_location ? (
              <>
                <span className="text-zinc-600"> · </span>
                {booking.event_location}
              </>
            ) : null}
            {hasOffer && booking.dj_offer_price != null ? (
              <>
                <span className="text-zinc-600"> · </span>
                <span className="text-violet-300">
                  {formatExtraPrice(Number(booking.dj_offer_price))}
                </span>
              </>
            ) : booking.status === "accepted" &&
              (booking.price != null ||
                booking.dj_offer_price != null ||
                booking.base_price != null) ? (
              <>
                <span className="text-zinc-600"> · </span>
                <span className="text-violet-300">
                  {formatExtraPrice(
                    Number(
                      booking.price ??
                        booking.dj_offer_price ??
                        booking.base_price
                    )
                  )}
                </span>
              </>
            ) : null}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-zinc-500 transition-transform duration-200",
            expanded && "rotate-180 text-violet-300"
          )}
        />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-white/8 px-4 pb-5 pt-4 md:px-5">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-200">
              <PartyPopper className="size-3.5" />
              {formatEventTypeLabel(booking.event_type)}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-zinc-200">
              <Calendar className="size-3.5 text-violet-300" />
              {formatDateRange(booking.event_date, booking.end_date)}
            </span>
            {(booking.start_time || booking.end_time) && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
                <Clock className="size-3.5 text-violet-300" />
                {String(booking.start_time ?? "").slice(0, 5)}–
                {String(booking.end_time ?? "").slice(0, 5)}
              </span>
            )}
            {booking.event_location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-zinc-300">
                <MapPin className="size-3.5 text-violet-400/70" />
                {booking.event_location}
              </span>
            )}
          </div>

          {dj?.public_slug ? (
            <Link
              href={`/djs/${dj.public_slug}`}
              className="inline-flex text-xs text-violet-300 underline-offset-2 hover:underline"
            >
              Otvor profil →
            </Link>
          ) : null}

          {booking.status === "rejected" && booking.rejection_reason && (
            <div className="rounded-xl border border-red-500/15 bg-red-500/[0.04] px-3.5 py-2.5 text-xs text-red-300/90">
              <span className="font-medium text-red-300">
                Dôvod {getArtistNoun(artistKind, "gen")}:{" "}
              </span>
              {booking.rejection_reason}
            </div>
          )}

          {booking.status === "pending" && !booking.bulk_inquiry_id && (
            <div className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
              {booking.message ? (
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Tvoja predstava
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">{booking.message}</p>
                </div>
              ) : null}
              {booking.client_budget != null ? (
                <div className="flex items-baseline justify-between gap-6">
                  <p className="text-xs text-zinc-500">Rozpočet cca</p>
                  <p className="text-sm font-medium tabular-nums text-zinc-200">
                    {formatExtraPrice(Number(booking.client_budget))}
                  </p>
                </div>
              ) : null}

              {hasOffer ? (
                <div className="space-y-3 border-t border-white/8 pt-3">
                  <div className="flex items-start justify-between gap-6">
                    <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-medium uppercase tracking-wider text-violet-300/80">
                      Ponuka od {getArtistNoun(artistKind, "gen")}
                    </p>
                      {booking.dj_offer_message ? (
                        <p className="mt-2 text-sm text-zinc-400">
                          {booking.dj_offer_message}
                        </p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-right text-2xl font-semibold tabular-nums text-white">
                      {formatExtraPrice(Number(booking.dj_offer_price))}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => void confirmOffer()}
                      className="h-9 justify-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-white hover:brightness-110"
                    >
                      {busy ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Check className="size-3.5" />
                      )}
                      Potvrdiť rezerváciu
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => void declineOffer()}
                      className="h-9 justify-center gap-1.5 rounded-full border-red-500/30 bg-red-500/10 px-4 text-red-200 hover:bg-red-500/20"
                    >
                      <XCircle className="size-3.5" />
                      Odmietnuť
                    </Button>
                    <Link
                      href={`/client-dashboard/bookings/${booking.id}/chat`}
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "h-9 justify-center gap-1.5 rounded-full px-4"
                      )}
                    >
                      <MessageCircle className="size-3.5" />
                      Chat
                    </Link>
                  </div>
                  <p className="text-[11px] text-zinc-500">
                    Pred potvrdením sa môžete ešte dohodnúť v chate.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 border-t border-white/8 pt-3">
                  <p className="text-xs text-zinc-500">
                    {normalizeArtistKind(artistKind) === "band"
                      ? "Kapela ešte neposlala cenu."
                      : normalizeArtistKind(artistKind) === "dj"
                        ? "DJ ešte neposlal cenu."
                        : "Umelec ešte neposlal cenu."}{" "}
                    Môžete si medzitým napísať.
                  </p>
                  <Link
                    href={`/client-dashboard/bookings/${booking.id}/chat`}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-4"
                    )}
                  >
                    <MessageCircle className="size-3.5" />
                    Chat
                  </Link>
                </div>
              )}
            </div>
          )}

          {booking.status === "accepted" && (
            <div className="space-y-3 border-t border-white/8 pt-4">
              {(booking.price != null ||
                booking.dj_offer_price != null ||
                booking.base_price != null) && (
                <div className="flex items-baseline justify-between gap-6 rounded-xl border border-white/8 bg-white/[0.03] px-3.5 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                    Dohodnutá cena
                  </p>
                  <p className="text-xl font-semibold tabular-nums text-white">
                    {formatExtraPrice(
                      Number(
                        booking.price ??
                          booking.dj_offer_price ??
                          booking.base_price
                      )
                    )}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-end justify-between gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
                  Príprava akcie
                </p>
              </div>
              <LiveRequestQr bookingId={booking.id} mode="client" />
              <BookingExtras bookingId={booking.id} mode="client" />
              <MusicPlanner bookingId={booking.id} mode="client" />
              <EventTimeline bookingId={booking.id} mode="client" />
            </div>
          )}

          {canReview && (
            <div className="flex items-center justify-between gap-3 border-t border-white/8 pt-4">
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
        </div>
      ) : null}
    </article>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border border-white/8 bg-card/40 px-6 py-14 text-center">
      <CalendarDays className="mx-auto size-8 text-zinc-600" />
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-zinc-500">{text}</p>
      <Link
        href="/djs"
        className="mt-5 inline-flex items-center gap-2 text-sm text-violet-300 hover:text-violet-200"
      >
        <Users className="size-3.5" />
        Prehliadať katalóg →
      </Link>
    </div>
  );
}

export default function ClientDashboardPage() {
  const { showToast } = useToast();
  const { user, loading: userLoading } = useClientUser();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [djs, setDjs] = useState<Record<string, DJInfo>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
      void claimOrphanedBookings();

      const [bookingsRes, reviewsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, dj_id, event_type, event_date, end_date, start_time, end_time, event_location, message, created_at, status, rejection_reason, price, base_price, client_budget, dj_offer_price, dj_offer_message, bulk_inquiry_id"
          )
          .eq("client_id", userId)
          .order("created_at", { ascending: false }),
        supabase.from("reviews").select("booking_id").eq("client_id", userId),
      ]);

      if (cancelled) return;

      if (bookingsRes.error) {
        console.error("[client-dashboard]", bookingsRes.error);
        showToast("Rezervácie sa nepodarilo načítať.", "error");
        setLoading(false);
        return;
      }

      const rows = (bookingsRes.data ?? []) as Booking[];
      setBookings(rows);
      setReviewedIds(
        new Set((reviewsRes.data ?? []).map((r) => r.booking_id as string))
      );

      const djIds = Array.from(new Set(rows.map((r) => r.dj_id)));
      if (djIds.length > 0) {
        const { data: djRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, public_slug, artist_kind")
          .in("id", djIds);
        if (cancelled) return;
        const map: Record<string, DJInfo> = {};
        (djRows ?? []).forEach((d) => (map[d.id] = d as DJInfo));
        setDjs(map);
      }

      hasLoadedRef.current = true;
      setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [userId, userLoading, showToast]);

  const { pending, confirmed, history } = useMemo(() => {
    const pendingList = bookings.filter((b) => b.status === "pending");
    const confirmedList = bookings.filter(
      (b) =>
        b.status === "accepted" && !isPastLocalDate(b.end_date ?? b.event_date)
    );
    const historyList = bookings.filter(
      (b) =>
        b.status === "rejected" ||
        (b.status === "accepted" &&
          isPastLocalDate(b.end_date ?? b.event_date))
    );
    return {
      pending: pendingList,
      confirmed: confirmedList,
      history: historyList,
    };
  }, [bookings]);

  const pendingReviews = bookings.filter((b) => {
    const eventPassed = isPastLocalDate(b.end_date ?? b.event_date);
    return b.status === "accepted" && eventPassed && !reviewedIds.has(b.id);
  });

  if (userLoading || (loading && !hasLoadedRef.current)) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 animate-pulse pt-4">
        <div className="h-8 w-48 rounded-xl bg-white/5" />
        <div className="h-4 w-72 rounded-lg bg-white/[0.04]" />
        <div className="mt-6 h-40 rounded-3xl bg-white/[0.03]" />
      </div>
    );
  }

  function refreshBookings() {
    if (!userId) return;
    const supabase = createClient();
    void (async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, dj_id, event_type, event_date, end_date, start_time, end_time, event_location, message, created_at, status, rejection_reason, price, base_price, client_budget, dj_offer_price, dj_offer_message, bulk_inquiry_id"
        )
        .eq("client_id", userId)
        .order("created_at", { ascending: false });
      if (error) {
        showToast("Rezervácie sa nepodarilo obnoviť.", "error");
        return;
      }
      setBookings((data ?? []) as Booking[]);
    })();
  }

  function renderList(list: Booking[]) {
    return (
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-card/60 backdrop-blur-md">
        {list.map((b) => {
          const eventPassed = isPastLocalDate(b.end_date ?? b.event_date);
          return (
            <BookingRow
              key={b.id}
              booking={b}
              dj={djs[b.dj_id]}
              canReview={b.status === "accepted" && eventPassed}
              alreadyReviewed={reviewedIds.has(b.id)}
              expanded={expandedId === b.id}
              onToggle={() =>
                setExpandedId((id) => (id === b.id ? null : b.id))
              }
              onOfferResolved={refreshBookings}
            />
          );
        })}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl pt-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Moje rezervácie
        </h1>
        <p className="mt-1.5 text-sm text-zinc-500">
          Klikni na riadok a otvorí sa detail. Pri veľa rezerváciách je to
          prehľadnejšie.
        </p>
      </div>

      {pendingReviews.length > 0 && (
        <div className="mb-6 rounded-3xl border border-amber-500/25 bg-gradient-to-br from-amber-500/[0.1] to-transparent p-5 md:p-6">
          <h2 className="flex items-center gap-2 text-base font-semibold text-amber-200">
            <Star className="size-4 fill-amber-400 text-amber-400" />
            Čaká na tvoje hodnotenie
          </h2>
          <p className="mt-1 text-xs text-amber-200/60">
            {pendingReviews.length === 1
              ? "Máš 1 akciu, ktorú môžeš ohodnotiť."
              : `Máš ${pendingReviews.length} akcie, ktoré môžeš ohodnotiť.`}
          </p>
          <div className="mt-4 space-y-2">
            {pendingReviews.map((b) => {
              const dj = djs[b.dj_id];
              return (
                <div
                  key={b.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {dj?.full_name || "Umelec"}
                    </p>
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
      )}

      {bookings.length === 0 ? (
        <EmptyState
          title="Zatiaľ žiadne rezervácie"
          text="Prehliadaj katalóg umelcov a pošli dopyt."
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v);
            setExpandedId(null);
          }}
        >
          <TabsList className="mb-6 h-auto w-full flex-wrap gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1.5 sm:w-auto">
            <TabsTrigger
              value="pending"
              className="rounded-xl px-4 py-2.5 data-active:bg-violet-500/15 data-active:text-violet-200"
            >
              Čakajúce
              {pending.length > 0 && (
                <span className="ml-1.5 rounded-full bg-violet-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-violet-300">
                  {pending.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="confirmed"
              className="rounded-xl px-4 py-2.5 data-active:bg-fuchsia-500/15 data-active:text-fuchsia-200"
            >
              Potvrdené
              {confirmed.length > 0 && (
                <span className="ml-1.5 rounded-full bg-fuchsia-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-fuchsia-300">
                  {confirmed.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="rounded-xl px-4 py-2.5 data-active:bg-white/10 data-active:text-white"
            >
              História
              {history.length > 0 && (
                <span className="ml-1.5 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-300">
                  {history.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="outline-none">
            {pending.length === 0 ? (
              <EmptyState
                title="Žiadne čakajúce dopyty"
                text="Keď pošleš rezerváciu umelcovi, uvidíš ju tu."
              />
            ) : (
              renderList(pending)
            )}
          </TabsContent>

          <TabsContent value="confirmed" className="outline-none">
            {confirmed.length === 0 ? (
              <EmptyState
                title="Žiadne potvrdené akcie"
                text="Prijaté rezervácie s budúcim termínom uvidíš tu."
              />
            ) : (
              renderList(confirmed)
            )}
          </TabsContent>

          <TabsContent value="history" className="outline-none">
            {history.length === 0 ? (
              <EmptyState
                title="História je prázdna"
                text="Ukončené a odmietnuté rezervácie sa zobrazia tu."
              />
            ) : (
              renderList(history)
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
