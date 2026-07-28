"use client";

import { useState } from "react";
import { Link2, MessagesSquare } from "lucide-react";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { BookingExtras } from "@/components/extras/BookingExtras";
import { LiveRequestQr } from "@/components/live/LiveRequestQr";
import { ClientShareQr } from "@/components/share/ClientShareQr";
import { ReviewInviteLink } from "@/components/reviews/ReviewInviteLink";
import { DjRequirementsPanel } from "@/components/tech/DjRequirementsPanel";
import { VenueQuestionnairePanel } from "@/components/tech/VenueQuestionnairePanel";
import type { BookingsTab } from "@/lib/bookings-nav";
import { cn } from "@/lib/utils";

type PrepTab = "interaction" | "tools";

type BookingPrepSectionProps = {
  bookingId: string;
  mode: "dj" | "client";
  clientName?: string | null;
  returnTab?: BookingsTab;
  className?: string;
};

export function BookingPrepSection({
  bookingId,
  mode,
  clientName,
  returnTab,
  className,
}: BookingPrepSectionProps) {
  const [tab, setTab] = useState<PrepTab>("interaction");
  const isDj = mode === "dj";

  const tabs: { id: PrepTab; label: string; icon: typeof MessagesSquare }[] = [
    { id: "interaction", label: "Interakcia s klientom", icon: MessagesSquare },
    {
      id: "tools",
      label: isDj ? "Nástroje / QR" : "Live / QR",
      icon: Link2,
    },
  ];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">
          Príprava akcie
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Príprava akcie"
        className="grid grid-cols-2 gap-2"
      >
        {tabs.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(item.id)}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium transition-colors sm:text-sm",
                active
                  ? "border-violet-500/40 bg-violet-500/15 text-white"
                  : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {tab === "interaction" ? (
        <div className="space-y-2.5">
          <MusicPlanner bookingId={bookingId} mode={mode} />
          <EventTimeline bookingId={bookingId} mode={mode} />
          <BookingExtras bookingId={bookingId} mode={mode} />
          <DjRequirementsPanel bookingId={bookingId} mode={mode} />
          <VenueQuestionnairePanel bookingId={bookingId} mode={mode} />
        </div>
      ) : null}

      {tab === "tools" ? (
        isDj ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <LiveRequestQr
              bookingId={bookingId}
              mode="dj"
              returnTab={returnTab}
              compact
            />
            <ClientShareQr bookingId={bookingId} compact />
            <ReviewInviteLink
              bookingId={bookingId}
              clientName={clientName}
              compact
              className="sm:col-span-2"
            />
          </div>
        ) : (
          <LiveRequestQr bookingId={bookingId} mode="client" compact />
        )
      ) : null}
    </div>
  );
}
