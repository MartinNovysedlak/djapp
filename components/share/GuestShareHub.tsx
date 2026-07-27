"use client";

import { useState } from "react";
import { CalendarClock, Music2 } from "lucide-react";
import type { GuestSharePublic } from "@/lib/guest-share";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { BRAND } from "@/lib/brand";
import { cn } from "@/lib/utils";

type GuestShareHubProps = {
  share: GuestSharePublic;
};

type HubTab = "timeline" | "playlist";

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
            Tento odkaz je unikátny pre tvoju akciu. Môžeš sa k nemu kedykoľvek
            vrátiť a upraviť harmonogram alebo playlist — bez registrácie.
          </p>
        </header>

        <div
          role="tablist"
          aria-label="Sekcie prípravy"
          className="flex gap-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "timeline"}
            onClick={() => setTab("timeline")}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
              tab === "timeline"
                ? "border-violet-500/40 bg-violet-500/15 text-white"
                : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            )}
          >
            <CalendarClock className="size-4 shrink-0" />
            Harmonogram
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "playlist"}
            onClick={() => setTab("playlist")}
            className={cn(
              "inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
              tab === "playlist"
                ? "border-violet-500/40 bg-violet-500/15 text-white"
                : "border-white/10 bg-black/30 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
            )}
          >
            <Music2 className="size-4 shrink-0" />
            Playlist
          </button>
        </div>

        {tab === "timeline" ? (
          <EventTimeline
            bookingId={share.bookingId}
            mode="client"
            shareToken={share.slug}
            embedded
          />
        ) : (
          <MusicPlanner
            bookingId={share.bookingId}
            mode="client"
            shareToken={share.slug}
            embedded
          />
        )}
      </div>
    </div>
  );
}
