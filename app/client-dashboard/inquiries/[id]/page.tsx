"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Loader2,
  MapPin,
  MessageCircle,
} from "lucide-react";
import {
  chooseBulkOffer,
  getBulkInquiryDetail,
} from "@/app/actions/bulk-inquiries";
import { formatEventTypeLabel } from "@/lib/event-types";
import { parseLocalDate } from "@/lib/dates";
import { useToast } from "@/lib/toast-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function statusLabel(status: string) {
  switch (status) {
    case "offered":
      return "Ponuka pripravená";
    case "pending":
      return "Čaká na ponuku";
    case "declined":
      return "Odmietnuté";
    case "accepted":
      return "Vybrané";
    case "expired":
      return "Expirované";
    default:
      return status;
  }
}

export default function InquiryDetailPage() {
  const params = useParams();
  const inquiryId = String(params?.id || "");
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getBulkInquiryDetail>
  > | null>(null);

  const load = useCallback(async () => {
    const result = await getBulkInquiryDetail(inquiryId);
    setData(result);
    setLoading(false);
  }, [inquiryId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleChoose = async (bookingId: string) => {
    setBusyId(bookingId);
    const result = await chooseBulkOffer(inquiryId, bookingId);
    setBusyId(null);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Umelec vybraný. Ostatné dopyty sme uzavreli.", "success");
    router.push(`/client-dashboard/bookings/${bookingId}/chat`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20 text-zinc-500">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (!data || !data.ok) {
    return (
      <div className="mx-auto max-w-3xl py-10 text-center text-sm text-zinc-400">
        {data && !data.ok ? data.error : "Dopyt sa nenašiel."}
        <div className="mt-4">
          <Link
            href="/client-dashboard/inquiries"
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-full"
            )}
          >
            Späť
          </Link>
        </div>
      </div>
    );
  }

  const { inquiry, items } = data;

  return (
    <div className="mx-auto max-w-3xl py-6">
      <Link
        href="/client-dashboard/inquiries"
        className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300"
      >
        <ArrowLeft className="size-4" />
        Všetky dopyty
      </Link>

      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-white">
            {formatEventTypeLabel(inquiry.event_type)}
          </h1>
          <Badge
            className={
              inquiry.status === "open"
                ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                : "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
            }
          >
            {inquiry.status === "open" ? "Otvorený" : "Uzavretý"}
          </Badge>
        </div>
        <p className="mt-2 text-sm text-zinc-400">
          {formatDate(inquiry.event_date)}
          {inquiry.start_time
            ? ` · ${String(inquiry.start_time).slice(0, 5)}–${String(inquiry.end_time).slice(0, 5)}`
            : ""}
        </p>
        {inquiry.event_location ? (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-zinc-500">
            <MapPin className="size-3.5 text-violet-400" />
            {inquiry.event_location}
          </p>
        ) : null}
        {inquiry.message ? (
          <p className="mt-3 text-sm leading-relaxed text-zinc-500">
            {inquiry.message}
          </p>
        ) : null}
        {inquiry.client_budget != null ? (
          <p className="mt-2 text-sm text-zinc-400">
            Rozpočet cca:{" "}
            <span className="font-semibold text-zinc-200">
              {inquiry.client_budget.toLocaleString("sk-SK")} €
            </span>
          </p>
        ) : null}
      </div>

      <div className="space-y-4">
        {items.map((item) => {
          const name = item.dj_name || "Umelec";
          const canChoose =
            inquiry.status === "open" && item.item_status === "offered";
          return (
            <article
              key={item.id}
              className="rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative size-12 overflow-hidden rounded-2xl bg-violet-500/20">
                    {item.dj_avatar ? (
                      <Image
                        src={item.dj_avatar}
                        alt={name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <span className="flex size-full items-center justify-center text-sm font-bold text-violet-200">
                        {name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    {item.dj_slug ? (
                      <Link
                        href={`/djs/${item.dj_slug}`}
                        className="font-semibold text-white hover:text-violet-300"
                      >
                        {name}
                      </Link>
                    ) : (
                      <p className="font-semibold text-white">{name}</p>
                    )}
                    <Badge className="mt-1 border-white/10 bg-white/5 text-zinc-400">
                      {statusLabel(item.item_status)}
                    </Badge>
                  </div>
                </div>
                {item.offer_price != null ? (
                  <p className="text-xl font-semibold text-violet-200">
                    {item.offer_price.toLocaleString("sk-SK")} €
                  </p>
                ) : (
                  <p className="text-sm text-zinc-500">Bez ceny</p>
                )}
              </div>

              {item.offer_message ? (
                <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                  {item.offer_message}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                {item.booking_id ? (
                  <Link
                    href={`/client-dashboard/bookings/${item.booking_id}/chat`}
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "inline-flex items-center gap-1.5 rounded-full"
                    )}
                  >
                    <MessageCircle className="size-3.5" />
                    Chat
                  </Link>
                ) : null}
                {canChoose ? (
                  <Button
                    className="gap-1.5 rounded-full"
                    disabled={busyId === item.booking_id}
                    onClick={() =>
                      item.booking_id && void handleChoose(item.booking_id)
                    }
                  >
                    {busyId === item.booking_id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    Vybrať tohto umelca
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
