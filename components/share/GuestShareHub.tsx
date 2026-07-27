"use client";

import { useState } from "react";
import { Building2, CalendarClock, Music2, Plug } from "lucide-react";
import type { GuestSharePublic } from "@/lib/guest-share";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { DjRequirementsPanel } from "@/components/tech/DjRequirementsPanel";
import { VenueQuestionnairePanel } from "@/components/tech/VenueQuestionnairePanel";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type GuestShareHubProps = {
  share: GuestSharePublic;
};

type HubTab = "timeline" | "playlist" | "tech";

function formatDateSk(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GuestShareHub({ share }: GuestShareHubProps) {
  const dateLabel = formatDateSk(share.eventDate);
  const [tab, setTab] = useState<HubTab>("timeline");

  const tabs: {
    id: HubTab;
    label: string;
    icon: typeof CalendarClock;
  }[] = [
    { id: "timeline", label: "Program", icon: CalendarClock },
    { id: "playlist", label: "Hudba", icon: Music2 },
    { id: "tech", label: "Požiadavky", icon: Plug },
  ];

  return (
    <div className="relative min-h-svh overflow-hidden bg-[#0A0A0A] px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,oklch(0.55_0.24_295/0.28),transparent_60%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-24 left-1/2 size-80 -translate-x-1/2 rounded-full bg-fuchsia-500/10 blur-3xl"
      />

      <div className="relative z-10 mx-auto w-full max-w-lg space-y-5">
        <header className="text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-300/80">
            {BRAND.name}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Príprava akcie
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {share.djName
              ? `Spolupráca s ${share.djName}`
              : "Spolupráca s umelcom"}
            {share.eventType ? ` · ${share.eventType}` : ""}
            {dateLabel ? ` · ${dateLabel}` : ""}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-zinc-500">
            Unikátny odkaz pre tvoju akciu — program, hudba, požiadavky DJ a
            krátky dotazník o mieste. Bez registrácie.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Sekcie prípravy"
          className="grid grid-cols-3 gap-2"
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
                  "inline-flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm",
                  active
                    ? "border-violet-500/40 bg-violet-500/15 text-white"
                    : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "timeline" ? (
          <EventTimeline
            bookingId={share.bookingId}
            mode="client"
            shareToken={share.slug}
            embedded
          />
        ) : null}

        {tab === "playlist" ? (
          <MusicPlanner
            bookingId={share.bookingId}
            mode="client"
            shareToken={share.slug}
            embedded
          />
        ) : null}

        {tab === "tech" ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Building2 className="size-4 text-teal-300" />
                Dotazník o mieste
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Vnútri/vonku, hostia, sála, prúd — pomôže umelcovi s prípravou.
              </p>
            </div>
            <VenueQuestionnairePanel
              bookingId={share.bookingId}
              mode="client"
              shareToken={share.slug}
              embedded
            />
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium text-white">
                <Plug className="size-4 text-amber-300" />
                Požiadavky DJ
              </p>
              <p className="mt-1 text-[11px] text-zinc-500">
                Čo umelec potrebuje na ozvučenie a setup akcie.
              </p>
            </div>
            <DjRequirementsPanel
              bookingId={share.bookingId}
              mode="client"
              shareToken={share.slug}
              embedded
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
