"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Loader2,
  PartyPopper,
  Star,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/lib/toast-context";
import { useClientUser } from "@/components/ClientUserContext";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  claimOrphanedBookings,
  submitReview,
} from "@/app/actions/reviews";
import { isPastLocalDate, parseLocalDate } from "@/lib/dates";
import { formatEventTypeLabel } from "@/lib/event-types";
import { cn } from "@/lib/utils";

type Booking = {
  id: string;
  dj_id: string;
  event_type: string;
  event_date: string;
  end_date: string | null;
  status: string;
};

type DJInfo = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  public_slug: string | null;
};

function formatDateRange(start: string, end: string | null) {
  const startLabel = parseLocalDate(start).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  if (!end || end === start) return startLabel;
  const endLabel = parseLocalDate(end).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return `${startLabel} – ${endLabel}`;
}

function isEventPast(b: Booking) {
  return isPastLocalDate(b.end_date ?? b.event_date);
}

export default function ClientReviewsPage() {
  const { showToast } = useToast();
  const { user, loading: userLoading } = useClientUser();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [djs, setDjs] = useState<Record<string, DJInfo>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [autoOpened, setAutoOpened] = useState(false);

  useEffect(() => {
    if (!user) {
      if (!userLoading) setLoading(false);
      return;
    }

    const supabase = createClient();
    setLoading(true);

    const load = async () => {
      await claimOrphanedBookings();

      const { data: bookingRows, error } = await supabase
        .from("bookings")
        .select("id, dj_id, event_type, event_date, end_date, status")
        .eq("client_id", user.id)
        .eq("status", "accepted")
        .order("event_date", { ascending: false });

      if (error) {
        console.error("[reviews bookings]", error);
        showToast("Hodnotenia sa nepodarilo načítať.", "error");
        setBookings([]);
        setLoading(false);
        return;
      }

      const rows = (bookingRows ?? []) as Booking[];
      setBookings(rows);

      const djIds = Array.from(new Set(rows.map((b) => b.dj_id)));
      if (djIds.length > 0) {
        const { data: djRows } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, public_slug")
          .in("id", djIds);
        const map: Record<string, DJInfo> = {};
        (djRows ?? []).forEach((d) => {
          map[d.id] = d as DJInfo;
        });
        setDjs(map);
      }

      const bookingIds = rows.map((b) => b.id);
      if (bookingIds.length > 0) {
        const { data: reviewRows } = await supabase
          .from("reviews")
          .select("booking_id")
          .eq("client_id", user.id)
          .in("booking_id", bookingIds);
        setReviewedIds(
          new Set((reviewRows ?? []).map((r) => r.booking_id).filter(Boolean))
        );
      } else {
        setReviewedIds(new Set());
      }

      setLoading(false);
    };

    load();
  }, [user, userLoading, showToast]);

  const pending = useMemo(
    () => bookings.filter((b) => isEventPast(b) && !reviewedIds.has(b.id)),
    [bookings, reviewedIds]
  );
  const done = useMemo(
    () => bookings.filter((b) => reviewedIds.has(b.id)),
    [bookings, reviewedIds]
  );
  const waiting = useMemo(
    () =>
      bookings.filter((b) => !isEventPast(b) && !reviewedIds.has(b.id)),
    [bookings, reviewedIds]
  );

  useEffect(() => {
    if (!autoOpened && pending.length > 0) {
      setActiveId(pending[0].id);
      setAutoOpened(true);
    }
  }, [pending, autoOpened]);

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="size-6 animate-spin text-violet-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pt-4">
      <Reveal>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Ohodnotiť umelcov
          </h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Po prijatej a skončenej akcii môžeš napísať recenziu priamo tu.
            Pomôže to ostatným klientom pri výbere.
          </p>
        </div>
      </Reveal>

      {pending.length > 0 && (
        <Reveal delay={60}>
          <section className="mb-8 space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-200">
              <Star className="size-4 fill-amber-400 text-amber-400" />
              Čaká na hodnotenie ({pending.length})
            </h2>
            {pending.map((b) => (
              <ReviewComposer
                key={b.id}
                booking={b}
                dj={djs[b.dj_id]}
                expanded={activeId === b.id}
                onExpand={() =>
                  setActiveId((prev) => (prev === b.id ? null : b.id))
                }
                onSubmitted={() => {
                  setReviewedIds((prev) => new Set([...prev, b.id]));
                  setActiveId(null);
                  showToast("Ďakujeme za hodnotenie!", "success");
                }}
              />
            ))}
          </section>
        </Reveal>
      )}

      {waiting.length > 0 && (
        <Reveal delay={100}>
          <section className="mb-8 space-y-3">
            <h2 className="text-sm font-semibold text-zinc-400">
              Ešte prebiehajúce akcie
            </h2>
            {waiting.map((b) => (
              <div
                key={b.id}
                className="rounded-2xl border border-white/8 bg-card/50 px-4 py-3 text-sm text-zinc-500"
              >
                <span className="font-medium text-zinc-300">
                  {djs[b.dj_id]?.full_name || "Umelec"}
                </span>
                {" · "}
                {formatDateRange(b.event_date, b.end_date)}
                <span className="mt-1 block text-xs">
                  Formulár na hodnotenie sa otvorí automaticky po skončení
                  akcie.
                </span>
              </div>
            ))}
          </section>
        </Reveal>
      )}

      {done.length > 0 && (
        <Reveal delay={120}>
          <section className="mb-8 space-y-3">
            <h2 className="text-sm font-semibold text-emerald-300">
              Už ste ohodnotili ({done.length})
            </h2>
            {done.map((b) => (
              <div
                key={b.id}
                className="flex items-center gap-3 rounded-2xl border border-emerald-500/15 bg-emerald-500/[0.04] px-4 py-3"
              >
                <Star className="size-4 fill-emerald-300 text-emerald-300" />
                <div>
                  <p className="text-sm font-medium text-white">
                    {djs[b.dj_id]?.full_name || "Umelec"}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatDateRange(b.event_date, b.end_date)}
                  </p>
                </div>
              </div>
            ))}
          </section>
        </Reveal>
      )}

      {pending.length === 0 && waiting.length === 0 && done.length === 0 && (
        <Reveal delay={80}>
          <div className="rounded-[2rem] border border-white/10 bg-card/50 px-6 py-16 text-center">
            <div className="mx-auto flex max-w-md flex-col items-center gap-5">
              <div className="flex size-16 items-center justify-center rounded-3xl border border-amber-500/20 bg-amber-500/10">
                <Star className="size-7 text-amber-300" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Zatiaľ nič na hodnotenie
                </h2>
                <p className="mt-2.5 text-sm leading-relaxed text-zinc-400">
                  Keď umelec potvrdí tvoju rezerváciu a akcia sa skončí, tu sa
                  objaví formulár na napísanie recenzie.
                </p>
              </div>
              <Link
                href="/djs"
                className="inline-flex h-11 items-center gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-sm font-semibold text-white transition-all hover:brightness-110"
              >
                <Users className="size-4" />
                Nájsť umelca
              </Link>
            </div>
          </div>
        </Reveal>
      )}
    </div>
  );
}

function ReviewComposer({
  booking,
  dj,
  expanded,
  onExpand,
  onSubmitted,
}: {
  booking: Booking;
  dj?: DJInfo;
  expanded: boolean;
  onExpand: () => void;
  onSubmitted: () => void;
}) {
  const { showToast } = useToast();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const djName = dj?.full_name || "Umelec";
  const displayRating = hoverRating || rating;

  const handleSubmit = async () => {
    setSubmitting(true);
    const result = await submitReview({
      bookingId: booking.id,
      djId: booking.dj_id,
      rating,
      comment: comment.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error ?? "Hodnotenie sa nepodarilo uložiť.", "error");
      return;
    }
    onSubmitted();
  };

  return (
    <article className="rounded-3xl border border-amber-500/20 bg-card/70 p-4 backdrop-blur-md md:p-5">
      <button
        type="button"
        onClick={onExpand}
        className="flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="relative size-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
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
          <div>
            <p className="text-sm font-semibold text-white">
              Ohodnotiť: {djName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1">
                <PartyPopper className="size-3 text-violet-300" />
                {formatEventTypeLabel(booking.event_type)}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3 text-violet-300" />
                {formatDateRange(booking.event_date, booking.end_date)}
              </span>
            </p>
          </div>
        </div>
        {!expanded && (
          <span className="inline-flex h-7 items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-2.5 text-[0.8rem] font-medium text-white">
            <Star className="size-3.5" />
            Napísať recenziu
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-5 space-y-4 border-t border-white/8 pt-5">
          <p className="text-sm text-zinc-400">
            Klikni na hviezdičky a ulož hodnotenie pre {djName}.
          </p>

          <div className="flex items-center justify-center gap-1.5 py-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="transition-transform duration-150 hover:scale-110"
                aria-label={`${star} hviezdičiek`}
              >
                <Star
                  className={cn(
                    "size-9 transition-colors duration-150",
                    star <= displayRating
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-zinc-600"
                  )}
                />
              </button>
            ))}
          </div>

          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ako to prebehlo? Odporučil by si tohto umelca ďalej?"
            rows={3}
            className="rounded-xl border-white/10 bg-black/30"
          />

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              className="gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-110"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Ukladám…
                </>
              ) : (
                <>
                  <Star className="size-4" />
                  Uložiť recenziu ({rating}★)
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={submitting}
              onClick={onExpand}
              className="rounded-full text-zinc-400"
            >
              Zrušiť
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}
