"use client";

import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Music2, Send } from "lucide-react";
import { submitLiveRequest } from "@/app/actions/live-requests";
import type { LiveBookingPublic } from "@/lib/live/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/lib/toast-context";
import { cn } from "@/lib/utils";

type LiveGuestFormProps = {
  booking: LiveBookingPublic;
};

export function LiveGuestForm({ booking }: LiveGuestFormProps) {
  const { showToast } = useToast();
  const [songTitle, setSongTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [guestName, setGuestName] = useState("");
  const [url, setUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    const result = await submitLiveRequest({
      slug: booking.slug,
      songTitle,
      artist,
      guestName,
      url,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    setSent(true);
    setSongTitle("");
    setArtist("");
    setGuestName("");
    setUrl("");
    showToast("Tvoja požiadavka letí k DJ-ovi!", "success");
    window.setTimeout(() => setSent(false), 3200);
  }

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

      <div className="relative z-10 mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/10 shadow-[0_0_40px_-10px_oklch(0.6_0.26_295/0.7)]">
            <Music2 className="size-6 text-violet-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Pesnička na želanie
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            {booking.djName
              ? `Pošli tip pre ${booking.djName}`
              : "Pošli tip priamo DJ-ovi"}
            {booking.eventType ? ` · ${booking.eventType}` : ""}
          </p>
        </div>

        <div
          className={cn(
            "relative overflow-hidden rounded-3xl border border-white/10 bg-black/40 p-5 shadow-[0_24px_80px_-40px_oklch(0_0_0/0.9)] backdrop-blur-xl transition-all duration-500",
            sent && "border-emerald-500/40"
          )}
        >
          {sent ? (
            <div className="flex flex-col items-center gap-3 py-10 text-center animate-in fade-in zoom-in-95 duration-500">
              <CheckCircle2 className="size-12 text-emerald-400" />
              <p className="text-lg font-semibold text-white">
                Letí to k DJ-ovi!
              </p>
              <p className="text-sm text-zinc-400">
                Môžeš poslať ďalšiu, keď budeš chcieť.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  Napíš skladbu
                </p>
                <div className="space-y-1.5">
                  <Label htmlFor="song">Názov skladby</Label>
                  <Input
                    id="song"
                    value={songTitle}
                    onChange={(e) => setSongTitle(e.target.value)}
                    placeholder="napr. September"
                    className="h-11 rounded-xl"
                    maxLength={120}
                    required={!url.trim()}
                    autoComplete="off"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="artist">Interpret</Label>
                  <Input
                    id="artist"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    placeholder="napr. Earth, Wind & Fire"
                    className="h-11 rounded-xl"
                    maxLength={120}
                    required={!url.trim()}
                    autoComplete="off"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-white/10" />
                <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                  alebo
                </span>
                <div className="h-px flex-1 bg-white/10" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="url">YouTube / Spotify link</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  className="h-11 rounded-xl"
                  maxLength={500}
                  required={!songTitle.trim() || !artist.trim()}
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1.5 border-t border-white/8 pt-4">
                <Label htmlFor="from">
                  Poznámka{" "}
                  <span className="font-normal text-zinc-500">(voliteľné)</span>
                </Label>
                <Input
                  id="from"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="napr. Od Marty pre Tomáša"
                  className="h-11 rounded-xl"
                  maxLength={80}
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full gap-2 rounded-full text-sm font-semibold"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Poslať DJ-ovi
              </Button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-zinc-600">
          Bez registrácie · len pre hostí tejto akcie
        </p>
      </div>
    </div>
  );
}
