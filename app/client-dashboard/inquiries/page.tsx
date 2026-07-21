"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, MapPin, MessagesSquare } from "lucide-react";
import { listClientBulkInquiries } from "@/app/actions/bulk-inquiries";
import { formatEventTypeLabel } from "@/lib/event-types";
import { parseLocalDate } from "@/lib/dates";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InquiryRow = {
  id: string;
  event_date: string;
  event_type: string;
  event_location: string | null;
  status: string;
  created_at: string;
  genre: string | null;
  items_count: number;
  offered_count: number;
};

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ClientInquiriesPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<InquiryRow[]>([]);

  useEffect(() => {
    void (async () => {
      const result = await listClientBulkInquiries();
      if (result.ok) setRows(result.inquiries);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-3xl py-6">
      <Reveal>
        <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-500">
              Porovnanie ponúk
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-white">
              Hromadné dopyty
            </h1>
          </div>
          <Link
            href="/djs?compare=1"
            className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
          >
            Nový dopyt
          </Link>
        </div>
      </Reveal>

      {loading ? (
        <div className="flex justify-center py-16 text-zinc-500">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/[0.03] px-6 py-12 text-center">
          <MessagesSquare className="mx-auto size-8 text-zinc-600" />
          <p className="mt-3 text-sm text-zinc-400">
            Zatiaľ nemáš žiadny hromadný dopyt.
          </p>
          <Link
            href="/djs?compare=1"
            className={cn(
              buttonVariants(),
              "mt-5 inline-flex rounded-full"
            )}
          >
            Vybrať až 4 umelcov
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((row, i) => (
            <Reveal key={row.id} delay={i * 50}>
              <Link
                href={`/client-dashboard/inquiries/${row.id}`}
                className="card-lift group flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-card/70 p-5 backdrop-blur-md transition-colors hover:border-violet-500/30"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-white">
                      {formatEventTypeLabel(row.event_type)}
                    </p>
                    <Badge
                      className={
                        row.status === "open"
                          ? "border-violet-500/30 bg-violet-500/15 text-violet-300"
                          : "border-zinc-500/30 bg-zinc-500/15 text-zinc-300"
                      }
                    >
                      {row.status === "open" ? "Otvorený" : "Uzavretý"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-zinc-400">
                    {formatDate(row.event_date)}
                    {row.event_location ? (
                      <>
                        <span className="text-zinc-600"> · </span>
                        <MapPin className="inline size-3 text-violet-400" />{" "}
                        {row.event_location}
                      </>
                    ) : null}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Ponuky: {row.offered_count}/{row.items_count}
                    {row.genre ? ` · ${row.genre}` : ""}
                  </p>
                </div>
                <ArrowRight className="size-4 shrink-0 text-zinc-600 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-300" />
              </Link>
            </Reveal>
          ))}
        </div>
      )}
    </div>
  );
}
