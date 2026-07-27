"use client";

import { CalendarClock, Music2 } from "lucide-react";
import type { GuestSharePublic } from "@/lib/guest-share";
import { MusicPlanner } from "@/components/playlist/MusicPlanner";
import { EventTimeline } from "@/components/timeline/EventTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BRAND } from "@/lib/brand";

type GuestShareHubProps = {
  share: GuestSharePublic;
};

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

      <div className="relative z-10 mx-auto w-full max-w-lg space-y-6">
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

        <Tabs defaultValue="timeline" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 rounded-2xl border border-white/10 bg-black/40 p-1 backdrop-blur-xl">
            <TabsTrigger
              value="timeline"
              className="gap-1.5 rounded-xl py-2.5 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <CalendarClock className="size-3.5" />
              Harmonogram
            </TabsTrigger>
            <TabsTrigger
              value="playlist"
              className="gap-1.5 rounded-xl py-2.5 text-xs data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              <Music2 className="size-3.5" />
              Playlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="mt-4 space-y-3">
            <EventTimeline
              bookingId={share.bookingId}
              mode="client"
              shareToken={share.slug}
              defaultOpen
            />
          </TabsContent>

          <TabsContent value="playlist" className="mt-4 space-y-3">
            <MusicPlanner
              bookingId={share.bookingId}
              mode="client"
              shareToken={share.slug}
              defaultOpen
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
