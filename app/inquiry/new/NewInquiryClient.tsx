"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Clock,
  HelpCircle,
  Info,
  Loader2,
  Send,
  Users,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { submitBulkInquiry } from "@/app/actions/bulk-inquiries";
import { EVENT_TYPES, formatEventTypeLabel } from "@/lib/event-types";
import { useToast } from "@/lib/toast-context";
import { Aurora, Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SiteFooter } from "@/components/SiteFooter";
import { getDjStageName } from "@/lib/dj-display";
import { DatePicker } from "@/components/ui/date-picker";
import { timeOptions } from "@/lib/dates";

const TIME_OPTS = timeOptions(30);

type DjMini = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  public_slug: string | null;
  location: string | null;
};

export default function NewInquiryClient() {
  const router = useRouter();
  const params = useSearchParams();
  const { showToast } = useToast();
  const djIds = useMemo(
    () =>
      [
        ...new Set(
          (params.get("djs") || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
        ),
      ].slice(0, 4),
    [params]
  );

  const [djs, setDjs] = useState<DjMini[]>([]);
  const [loadingDjs, setLoadingDjs] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [eventType, setEventType] = useState("svadba");
  const [eventLocation, setEventLocation] = useState("");
  const [genre, setGenre] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [message, setMessage] = useState("");
  const [clientBudget, setClientBudget] = useState("");
  const [phoneFromProfile, setPhoneFromProfile] = useState(false);

  useEffect(() => {
    if (djIds.length === 0) {
      setLoadingDjs(false);
      return;
    }
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, public_slug, location")
        .in("id", djIds);
      setDjs((data as DjMini[]) ?? []);
      setLoadingDjs(false);
    })();
  }, [djIds]);

  useEffect(() => {
    void (async () => {
      const { getClientProfile } = await import("@/app/actions/client-profile");
      const result = await getClientProfile();
      if (!result.ok) return;
      if (result.profile.phone?.trim()) {
        setClientPhone(result.profile.phone.trim());
        setPhoneFromProfile(true);
      }
      const b = result.billing;
      if (b?.city?.trim() && !eventLocation) {
        setEventLocation(b.city.trim());
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (djIds.length === 0) {
      showToast("Vyber aspoň jedného umelca v katalógu.", "error");
      return;
    }
    const budget = Number(clientBudget.replace(",", "."));
    if (!Number.isFinite(budget) || budget < 0) {
      showToast("Zadaj približný rozpočet v EUR.", "error");
      return;
    }
    if (!message.trim()) {
      showToast("Napíš, čo chceš / ako si to predstavuješ.", "error");
      return;
    }
    setSubmitting(true);
    const result = await submitBulkInquiry({
      djIds,
      clientPhone,
      eventDate,
      eventEndDate: eventEndDate || eventDate,
      startTime,
      endTime,
      eventType,
      eventLocation,
      message: message.trim(),
      genre: genre || undefined,
      clientBudget: budget,
    });
    setSubmitting(false);
    if (!result.ok) {
      showToast(result.error, "error");
      return;
    }
    showToast("Dopyt odoslaný. Porovnaj ponuky v dashboarde.", "success");
    router.push(`/client-dashboard/inquiries/${result.inquiryId}`);
  };

  return (
    <div className="relative flex min-h-svh flex-col bg-[#0A0A0A]">
      <Aurora subtle />
      <main className="relative z-10 mx-auto w-full max-w-2xl flex-1 px-6 pb-20 pt-8">
        <Link
          href="/djs?compare=1"
          className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <ArrowLeft className="size-4" />
          Späť do katalógu
        </Link>

        <Reveal>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-zinc-300">
            <Users className="size-3.5 text-violet-300" />
            Hromadný dopyt
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-white md:text-4xl">
            Dostaň ponuky od umelcov
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Jedna nezáväzná požiadavka — až 4 umelci ti pošlú ponuku. Potom
            porovnáš a vyberieš.
          </p>
        </Reveal>

        <div className="mt-6 space-y-2.5 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-violet-100">
            <Info className="mt-0.5 size-4 shrink-0 text-violet-300" />
            Ako to funguje?
          </p>
          <ol className="space-y-1.5 pl-6 text-xs leading-relaxed text-zinc-400">
            <li>
              <span className="font-medium text-zinc-300">1.</span> Vyplň termín
              a detaily akcie — pošle sa všetkým vybraným umelcom naraz.
            </li>
            <li>
              <span className="font-medium text-zinc-300">2.</span> Každý môže
              odpovedať ponukou (cena + poznámka) alebo odmietnuť. Medzitým
              môžete chatovať.
            </li>
            <li>
              <span className="font-medium text-zinc-300">3.</span> V dashboarde
              pod <span className="text-zinc-300">Dopyty</span> porovnáš ponuky
              a vyberieš / potvrdíš jedného.
            </li>
          </ol>
          <p className="flex items-start gap-2 border-t border-white/8 pt-2.5 text-[11px] leading-relaxed text-zinc-500">
            <HelpCircle className="mt-0.5 size-3.5 shrink-0" />
            Ak má umelec v daný deň inú akciu, dopyt mu stále príde — vie, či sa
            časy zmestia. Systém zabráni potvrdeniu, ak by sa časy prekrývali.
          </p>
        </div>

        {loadingDjs ? (
          <div className="mt-10 flex justify-center text-zinc-500">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : djIds.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
            <p className="text-sm text-zinc-400">
              Najprv vyber umelcov v katalógu (režim Porovnať).
            </p>
            <Link
              href="/djs?compare=1"
              className="mt-4 inline-flex h-10 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-sm font-semibold text-white"
            >
              Otvoriť katalóg
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-8">
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">
                Vybraní umelci ({djIds.length}/4)
              </p>
              <div className="flex flex-wrap gap-3">
                {djs.map((dj) => {
                  const name = getDjStageName(dj);
                  return (
                    <div
                      key={dj.id}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2"
                    >
                      <div className="relative size-8 overflow-hidden rounded-full bg-violet-500/20">
                        {dj.avatar_url ? (
                          <Image
                            src={dj.avatar_url}
                            alt={name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <span className="flex size-full items-center justify-center text-xs font-bold text-violet-200">
                            {name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-medium text-zinc-200">
                        {name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <DatePicker
                  label={
                    <>
                      Dátum akcie <span className="text-red-400">*</span>
                    </>
                  }
                  value={eventDate}
                  placeholder="Vyber dátum"
                  onChange={(iso) => {
                    setEventDate(iso);
                    if (!eventEndDate || eventEndDate < iso) {
                      setEventEndDate(iso);
                    }
                  }}
                />
                <DatePicker
                  label="Do (voliteľné)"
                  value={eventEndDate}
                  placeholder="Ak je viac dní"
                  minDate={
                    eventDate
                      ? (() => {
                          const [y, m, d] = eventDate.split("-").map(Number);
                          return new Date(y, (m ?? 1) - 1, d ?? 1);
                        })()
                      : undefined
                  }
                  onChange={setEventEndDate}
                />
                <div className="space-y-1.5">
                  <Label>
                    Od <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={startTime}
                    onValueChange={(v) => v && setStartTime(v)}
                  >
                    <SelectTrigger className="h-11 w-full justify-start gap-2 rounded-xl border-white/10 bg-white/[0.03] px-3">
                      <Clock className="size-4 shrink-0 text-violet-300" />
                      <SelectValue placeholder="Začiatok" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_OPTS.map((t) => (
                        <SelectItem key={`s-${t}`} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    Do <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={endTime}
                    onValueChange={(v) => v && setEndTime(v)}
                  >
                    <SelectTrigger className="h-11 w-full justify-start gap-2 rounded-xl border-white/10 bg-white/[0.03] px-3">
                      <Clock className="size-4 shrink-0 text-violet-300" />
                      <SelectValue placeholder="Koniec" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {TIME_OPTS.map((t) => (
                        <SelectItem key={`e-${t}`} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Typ akcie *</Label>
                <Select
                  value={eventType}
                  onValueChange={(v) => {
                    if (v) setEventType(v);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl border-white/10 bg-white/[0.03]">
                    <SelectValue>
                      {(value: string | null) =>
                        value ? formatEventTypeLabel(value) : null
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">Lokalita *</Label>
                <Input
                  id="location"
                  required
                  placeholder="Mesto / miesto konania"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="genre">Žáner / vibe</Label>
                  <Input
                    id="genre"
                    placeholder="napr. house, 90s, svadba…"
                    value={genre}
                    onChange={(e) => setGenre(e.target.value)}
                    className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone">
                    Telefón *
                    {phoneFromProfile ? (
                      <span className="ml-1.5 text-[10px] font-normal text-zinc-500">
                        (z profilu)
                      </span>
                    ) : null}
                  </Label>
                  <Input
                    id="phone"
                    required
                    type="tel"
                    placeholder="+421…"
                    value={clientPhone}
                    onChange={(e) => {
                      setClientPhone(e.target.value);
                      setPhoneFromProfile(false);
                    }}
                    className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="budget">
                  Rozpočet cca (EUR) *
                </Label>
                <Input
                  id="budget"
                  required
                  inputMode="decimal"
                  placeholder="napr. 400"
                  value={clientBudget}
                  onChange={(e) => setClientBudget(e.target.value)}
                  className="h-11 rounded-xl border-white/10 bg-white/[0.03]"
                />
                <p className="text-[11px] text-zinc-500">
                  Orientačná suma — každý umelec ti pošle svoju ponuku.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="message">
                  Čo chceš / ako si to predstavuješ *
                </Label>
                <Textarea
                  id="message"
                  required
                  rows={4}
                  placeholder="Počet hostí, vibe, čo má umelec pripraviť…"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="rounded-xl border-white/10 bg-white/[0.03]"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !eventDate}
                className="h-12 w-full gap-2 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-sm font-semibold"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Odoslať dopyt ({djIds.length}/4)
              </Button>
            </form>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
