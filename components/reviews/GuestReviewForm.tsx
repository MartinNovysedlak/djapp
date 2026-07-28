"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import type { ReviewInvitePublic } from "@/lib/review-invite";
import {
  averageCategoryRating,
  DEFAULT_CATEGORY_RATINGS,
  type CategoryRatings,
  type ReviewCategoryKey,
} from "@/lib/review-categories";
import { CategoryRatingInputs } from "@/components/reviews/CategoryRatings";
import { submitGuestReview } from "@/app/actions/review-invite";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BRAND } from "@/lib/brand";
import { formatEventTypeLabel } from "@/lib/event-types";
import { parseLocalDate } from "@/lib/dates";

function formatDateRange(start: string | null, end: string | null) {
  if (!start) return null;
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

export function GuestReviewForm({ invite }: { invite: ReviewInvitePublic }) {
  const [categories, setCategories] = useState<CategoryRatings>(
    DEFAULT_CATEGORY_RATINGS
  );
  const [reviewerName, setReviewerName] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(invite.alreadyReviewed);
  const [error, setError] = useState<string | null>(null);

  const djName = invite.djName || "Umelec";
  const overall = averageCategoryRating(categories);
  const dateLabel = formatDateRange(invite.eventDate, invite.endDate);

  const setCategory = (key: ReviewCategoryKey, value: number) => {
    setCategories((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const result = await submitGuestReview({
      slug: invite.slug,
      categories,
      comment: comment.trim() || undefined,
      reviewerName: reviewerName.trim() || undefined,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/[0.06] px-6 py-12 text-center backdrop-blur-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-emerald-500/25 bg-emerald-500/10">
          <CheckCircle2 className="size-7 text-emerald-300" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">Ďakujeme!</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Tvoje hodnotenie pre {djName} je uložené a pomôže ostatným klientom.
        </p>
      </div>
    );
  }

  if (!invite.canSubmit) {
    return (
      <div className="rounded-3xl border border-white/10 bg-card/70 px-6 py-12 text-center backdrop-blur-md">
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-amber-500/25 bg-amber-500/10">
          <Star className="size-7 text-amber-300" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-white">Ešte chvíľu</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-400">
          Formulár na hodnotenie {djName} sa odomkne automaticky po skončení
          akcie
          {dateLabel ? ` (${dateLabel})` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md md:p-6">
      <div className="flex items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10">
          {invite.djAvatarUrl ? (
            <Image
              src={invite.djAvatarUrl}
              alt={djName}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-lg font-bold text-violet-200">
              {djName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-lg font-semibold text-white">Ohodnotiť {djName}</p>
          <p className="mt-0.5 text-xs text-zinc-500">
            {invite.eventType
              ? formatEventTypeLabel(invite.eventType)
              : "Akcia"}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </p>
        </div>
      </div>

      <p className="mt-5 text-sm text-zinc-400">
        Ohodnoť v 4 kategóriách (1–5). Účet na {BRAND.name} nepotrebuješ.
      </p>

      <div className="mt-5 space-y-4">
        <CategoryRatingInputs values={categories} onChange={setCategory} />

        <p className="text-center text-xs text-zinc-500">
          Celkovo{" "}
          <span className="font-semibold text-amber-300">{overall}★</span>
        </p>

        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400" htmlFor="name">
            Tvoje meno (voliteľné)
          </label>
          <Input
            id="name"
            value={reviewerName}
            onChange={(e) => setReviewerName(e.target.value)}
            placeholder="Napr. Martin"
            maxLength={80}
            className="rounded-xl border-white/10 bg-black/30"
          />
        </div>

        <div className="space-y-2">
          <label
            className="text-xs font-medium text-zinc-400"
            htmlFor="comment"
          >
            Komentár (voliteľné)
          </label>
          <Textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Ako to prebehlo? Odporučil by si tohto umelca ďalej?"
            rows={3}
            maxLength={2000}
            className="rounded-xl border-white/10 bg-black/30"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full gap-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-110"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Ukladám…
            </>
          ) : (
            <>
              <Star className="size-4" />
              Odoslať hodnotenie ({overall}★)
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
