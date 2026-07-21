"use client";

import { useCallback, useEffect, useMemo, useState, cloneElement, type ReactElement } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  Clock,
  Loader2,
  MapPin,
  PartyPopper,
  Phone,
  Send,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from "@/lib/toast-context";
import { submitBooking } from "@/app/actions/bookings";
import { getClientProfile } from "@/app/actions/client-profile";
import {
  combineLocalDateTime,
  normalizeTime,
  rangesOverlap,
  timeOptions,
} from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTRIES, type Country } from "@/lib/locations";
import { EVENT_TYPES, formatEventTypeLabel } from "@/lib/event-types";
import { cn } from "@/lib/utils";
import { getArtistNoun, getArtistNounCap, getArtistWillSend, normalizeArtistKind, type ArtistKind } from "@/lib/dj-display";

const TIME_OPTS = timeOptions(30);

type BookingDialogProps = {
  djId: string;
  djName: string;
  artistKind?: ArtistKind | string | null;
  children: ReactElement<Record<string, unknown>>;
};

type AuthState = "checking" | "guest" | "dj" | "client";

type BusySlot = {
  event_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
};

function formatFullAddress(parts: {
  street: string;
  houseNumber: string;
  city: string;
  postalCode: string;
  country: Country;
}) {
  const streetLine = `${parts.street.trim()} ${parts.houseNumber.trim()}`.trim();
  const cityLine = `${parts.postalCode.trim()} ${parts.city.trim()}`.trim();
  return `${streetLine}, ${cityLine}, ${parts.country}`;
}

export default function BookingDialog({
  djId,
  djName,
  artistKind: artistKindProp = null,
  children,
}: BookingDialogProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [resolvedKind, setResolvedKind] = useState<ArtistKind>(
    normalizeArtistKind(artistKindProp)
  );
  const artistKind = normalizeArtistKind(resolvedKind);
  const artistWillSend = getArtistWillSend(artistKind);

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clientPhone, setClientPhone] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [eventType, setEventType] = useState<string | null>(null);
  const [customEventType, setCustomEventType] = useState("");
  const [eventCountry, setEventCountry] = useState<Country>("SK");
  const [street, setStreet] = useState("");
  const [houseNumber, setHouseNumber] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [message, setMessage] = useState("");
  const [clientBudget, setClientBudget] = useState("");
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);
  const [phoneFromProfile, setPhoneFromProfile] = useState(false);
  const [addressFromProfile, setAddressFromProfile] = useState(false);

  useEffect(() => {
    setResolvedKind(normalizeArtistKind(artistKindProp));
  }, [artistKindProp]);

  useEffect(() => {
    if (!open || !djId) return;
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("artist_kind")
        .eq("id", djId)
        .maybeSingle();
      if (cancelled || !data) return;
      setResolvedKind(normalizeArtistKind(data.artist_kind));
    })();
    return () => {
      cancelled = true;
    };
  }, [open, djId]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        setAuthState("guest");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .maybeSingle();
      setAuthState(profile?.role === "dj" ? "dj" : "client");
    });
  }, []);

  useEffect(() => {
    if (!open || authState !== "client") return;
    let cancelled = false;
    void (async () => {
      const result = await getClientProfile();
      if (!result.ok || cancelled) return;
      if (result.profile.phone?.trim()) {
        setClientPhone(result.profile.phone.trim());
        setPhoneFromProfile(true);
      }
      const b = result.billing;
      if (b) {
        let filled = false;
        if (b.street_address?.trim() && !street) {
          setStreet(b.street_address.trim());
          filled = true;
        }
        if (b.city?.trim() && !city) {
          setCity(b.city.trim());
          filled = true;
        }
        if (b.postal_code?.trim() && !postalCode) {
          setPostalCode(b.postal_code.trim());
          filled = true;
        }
        if (b.country === "Slovensko" || b.country === "SK") {
          setEventCountry("SK");
        } else if (b.country === "Česko" || b.country === "CZ") {
          setEventCountry("CZ");
        }
        if (filled) setAddressFromProfile(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, authState]);

  useEffect(() => {
    if (!open || !djId) return;
    let cancelled = false;

    const load = async () => {
      try {
        const res = await fetch(`/api/calendar/availability/${djId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("availability fetch failed");
        const json = (await res.json()) as {
          slots?: {
            event_date: string;
            end_date: string;
            start_time: string;
            end_time: string;
            all_day?: boolean;
          }[];
        };
        if (cancelled) return;
        setBusySlots(
          (json.slots ?? []).map((row) => ({
            event_date: row.event_date,
            end_date: row.end_date || row.event_date,
            start_time: normalizeTime(
              row.all_day ? "00:00" : row.start_time,
              "00:00"
            ),
            end_time: normalizeTime(
              row.all_day ? "23:59" : row.end_time,
              "23:59"
            ),
            all_day: Boolean(row.all_day),
          }))
        );
      } catch {
        // Fallback to DB view if availability API fails
        const supabase = createClient();
        const { data } = await supabase
          .from("dj_busy_dates")
          .select("event_date, end_date, start_time, end_time")
          .eq("dj_id", djId);
        if (cancelled) return;
        setBusySlots(
          ((data ?? []) as BusySlot[]).map((row) => {
            const start = normalizeTime(row.start_time);
            const end = normalizeTime(row.end_time);
            const allDay =
              start === "00:00" && (end === "23:59" || end === "23:59:00");
            return {
              event_date: row.event_date,
              end_date: row.end_date,
              start_time: start,
              end_time: end,
              all_day: allDay,
            };
          })
        );
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, djId]);

  // Only full-day blockouts disable the calendar day.
  // Partial bookings stay selectable — conflict is checked by time overlap.
  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const slot of busySlots) {
      const isFullDay =
        slot.all_day ||
        (slot.start_time.slice(0, 5) === "00:00" &&
          (slot.end_time.slice(0, 5) === "23:59" ||
            slot.end_time.slice(0, 5) === "24:00"));
      if (!isFullDay) continue;
      const start = slot.event_date;
      const end = slot.end_date || slot.event_date;
      const [ys, ms, ds] = start.split("-").map(Number);
      const [ye, me, de] = end.split("-").map(Number);
      const cursor = new Date(ys, (ms ?? 1) - 1, ds ?? 1);
      const last = new Date(ye, (me ?? 1) - 1, de ?? 1);
      let guard = 0;
      while (cursor <= last && guard < 400) {
        const y = cursor.getFullYear();
        const m = String(cursor.getMonth() + 1).padStart(2, "0");
        const d = String(cursor.getDate()).padStart(2, "0");
        set.add(`${y}-${m}-${d}`);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return set;
  }, [busySlots]);

  const isStartTimeBlocked = useCallback(
    (time: string) => {
      if (!startDate) return false;
      const t = time.slice(0, 5);
      // Point-in-busy: can't start during an existing gig
      for (const slot of busySlots) {
        if (startDate < slot.event_date || startDate > (slot.end_date || slot.event_date)) {
          continue;
        }
        const s = slot.start_time.slice(0, 5);
        const e = slot.end_time.slice(0, 5);
        if (t >= s && t < e) return true;
      }
      // Full proposed range vs busy (when end time already chosen)
      if (!endDate || !endTime || endTime <= time) return false;
      const proposedStart = combineLocalDateTime(startDate, time);
      const proposedEnd = combineLocalDateTime(endDate, endTime);
      return busySlots.some((slot) =>
        rangesOverlap(
          proposedStart,
          proposedEnd,
          combineLocalDateTime(slot.event_date, slot.start_time),
          combineLocalDateTime(slot.end_date, slot.end_time)
        )
      );
    },
    [busySlots, startDate, endDate, endTime]
  );

  const isEndTimeBlocked = useCallback(
    (time: string) => {
      if (!startDate || !endDate || !startTime) return false;
      if (startDate === endDate && time.slice(0, 5) <= startTime.slice(0, 5)) {
        return true;
      }
      const proposedStart = combineLocalDateTime(startDate, startTime);
      const proposedEnd = combineLocalDateTime(endDate, time);
      if (!(proposedStart < proposedEnd)) return true;
      return busySlots.some((slot) =>
        rangesOverlap(
          proposedStart,
          proposedEnd,
          combineLocalDateTime(slot.event_date, slot.start_time),
          combineLocalDateTime(slot.end_date, slot.end_time)
        )
      );
    },
    [busySlots, startDate, endDate, startTime]
  );

  useEffect(() => {
    if (!startDate) return;
    if (isStartTimeBlocked(startTime)) {
      const next = TIME_OPTS.find((t) => !isStartTimeBlocked(t));
      if (next) setStartTime(next);
    }
  }, [startDate, busySlots, startTime, isStartTimeBlocked]);

  useEffect(() => {
    if (!startDate || !endDate) return;
    if (isEndTimeBlocked(endTime)) {
      const next = TIME_OPTS.find((t) => !isEndTimeBlocked(t));
      if (next) setEndTime(next);
    }
  }, [startDate, endDate, startTime, busySlots, endTime, isEndTimeBlocked]);

  const overlap = useMemo(() => {
    if (!startDate || !endDate || !startTime || !endTime) {
      return { conflict: false as const, slots: [] as BusySlot[] };
    }

    const proposedStart = combineLocalDateTime(startDate, startTime);
    const proposedEnd = combineLocalDateTime(endDate, endTime);

    if (!(proposedStart < proposedEnd)) {
      return {
        conflict: true as const,
        reason: "Koniec musí byť po začiatku akcie.",
        slots: [] as BusySlot[],
      };
    }

    const colliding = busySlots.filter((slot) => {
      const existingStart = combineLocalDateTime(
        slot.event_date,
        slot.start_time
      );
      const existingEnd = combineLocalDateTime(slot.end_date, slot.end_time);
      return rangesOverlap(
        proposedStart,
        proposedEnd,
        existingStart,
        existingEnd
      );
    });

    if (colliding.length === 0) {
      return { conflict: false as const, slots: [] as BusySlot[] };
    }

    return {
      conflict: true as const,
      reason: `Tento termín sa prekrýva s už potvrdenou akciou ${getArtistNoun(artistKind, "gen")}.`,
      slots: colliding,
    };
  }, [busySlots, startDate, endDate, startTime, endTime, artistKind]);

  const addressComplete =
    street.trim().length > 0 &&
    houseNumber.trim().length > 0 &&
    city.trim().length > 0 &&
    postalCode.trim().length >= 3;

  const resolvedEventType =
    eventType === "ine" ? customEventType.trim() : eventType;

  const canSubmit =
    Boolean(
      startDate &&
        endDate &&
        startTime &&
        endTime &&
        resolvedEventType &&
        clientPhone.trim() &&
        message.trim() &&
        clientBudget.trim()
    ) &&
    addressComplete &&
    !overlap.conflict &&
    !submitting;

  const resetForm = () => {
    setClientPhone("");
    setStartDate("");
    setEndDate("");
    setStartTime("18:00");
    setEndTime("23:00");
    setEventType(null);
    setCustomEventType("");
    setEventCountry("SK");
    setStreet("");
    setHouseNumber("");
    setCity("");
    setPostalCode("");
    setMessage("");
    setClientBudget("");
    setPhoneFromProfile(false);
    setAddressFromProfile(false);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    const existingOnClick = children.props.onClick as
      | ((e: React.MouseEvent) => void)
      | undefined;
    existingOnClick?.(e);
    if (authState === "checking") return;

    if (authState === "guest") {
      showToast("Pre rezerváciu sa najprv prihlás ako zákazník.", "info");
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }
    if (authState === "dj") {
      showToast("Účty umelcov nemôžu odosielať rezervácie.", "error");
      return;
    }
    setOpen(true);
  };

  const trigger = cloneElement(children, { onClick: handleTriggerClick });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit || !resolvedEventType) {
      if (overlap.conflict) {
        showToast(
          overlap.reason ?? "Termín sa prekrýva — rezerváciu nie je možné odoslať.",
          "error"
        );
        return;
      }
      showToast("Prosím, vyplň všetky povinné údaje.", "error");
      return;
    }

    const budget = Number(clientBudget.replace(",", "."));
    if (!Number.isFinite(budget) || budget < 0) {
      showToast("Zadaj približný rozpočet v EUR.", "error");
      return;
    }

    setSubmitting(true);

    const result = await submitBooking({
      djId,
      clientPhone: clientPhone.trim(),
      eventDate: startDate,
      eventEndDate: endDate,
      startTime,
      endTime,
      eventType: resolvedEventType,
      eventLocation: formatFullAddress({
        street,
        houseNumber,
        city,
        postalCode,
        country: eventCountry,
      }),
      message: message.trim(),
      clientBudget: budget,
    });

    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error ?? "Dopyt sa nepodarilo odoslať.", "error");
      return;
    }

    showToast(
      `Vaša správa bola odoslaná! ${getArtistNounCap(artistKind)} ${
        artistKind === "band" ? "bola upozornená" : "bol upozornený"
      } e-mailom.`,
      "success"
    );
    resetForm();
    setOpen(false);
  };

  return (
    <>
      {trigger}
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Nezáväzná rezervácia</DialogTitle>
            <DialogDescription>
              Pošli {djName} popis akcie a rozpočet. {artistWillSend} svoju cenu
              — potom môžete chatovať a ty rezerváciu potvrdíš.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-phone">
                Telefón <span className="text-red-400">*</span>
                {phoneFromProfile ? (
                  <span className="ml-1.5 text-[10px] font-normal text-zinc-500">
                    (z profilu)
                  </span>
                ) : null}
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => {
                    setClientPhone(e.target.value);
                    setPhoneFromProfile(false);
                  }}
                  placeholder="+421 900 123 456"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DatePicker
                label={
                  <>
                    Dátum od <span className="text-red-400">*</span>
                  </>
                }
                value={startDate}
                placeholder="Od"
                disabledDates={blockedDates}
                onChange={(iso) => {
                  setStartDate(iso);
                  if (!endDate || endDate < iso) setEndDate(iso);
                }}
              />
              <DatePicker
                label={
                  <>
                    Dátum do <span className="text-red-400">*</span>
                  </>
                }
                value={endDate}
                placeholder="Do"
                disabledDates={blockedDates}
                minDate={
                  startDate
                    ? (() => {
                        const [y, m, d] = startDate.split("-").map(Number);
                        return new Date(y, (m ?? 1) - 1, d ?? 1);
                      })()
                    : undefined
                }
                onChange={(iso) => {
                  setEndDate(iso);
                  if (!startDate || startDate > iso) setStartDate(iso);
                }}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Začiatok <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={startTime}
                  onValueChange={(v) => v && setStartTime(v)}
                >
                  <SelectTrigger className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-11">
                    <Clock className="size-4 shrink-0 text-muted-foreground/60" />
                    <SelectValue placeholder="Čas začiatku" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" side="bottom">
                    {TIME_OPTS.map((t) => {
                      const blocked = isStartTimeBlocked(t);
                      return (
                        <SelectItem
                          key={`s-${t}`}
                          value={t}
                          disabled={blocked}
                          className={
                            blocked
                              ? "line-through decoration-zinc-500 opacity-40"
                              : undefined
                          }
                        >
                          {t}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Predpokladaný koniec <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={endTime}
                  onValueChange={(v) => v && setEndTime(v)}
                >
                  <SelectTrigger className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-11">
                    <Clock className="size-4 shrink-0 text-muted-foreground/60" />
                    <SelectValue placeholder="Čas konca" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" side="bottom">
                    {TIME_OPTS.map((t) => {
                      const blocked = isEndTimeBlocked(t);
                      return (
                        <SelectItem
                          key={`e-${t}`}
                          value={t}
                          disabled={blocked}
                          className={
                            blocked
                              ? "line-through decoration-zinc-500 opacity-40"
                              : undefined
                          }
                        >
                          {t}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {overlap.conflict && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/40 bg-red-500/15 px-3.5 py-3 text-sm text-red-200"
              >
                <p className="flex items-start gap-2 font-semibold">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  {overlap.reason ?? "Termín sa prekrýva"}
                </p>
                {overlap.slots.length > 0 && (
                  <ul className="mt-2 space-y-1 pl-6 text-xs text-red-200/80">
                    {overlap.slots.map((slot, i) => (
                      <li key={i}>
                        {slot.event_date === slot.end_date
                          ? slot.event_date
                          : `${slot.event_date} – ${slot.end_date}`}
                        {" · "}
                        {slot.start_time}–{slot.end_time}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-xs text-red-200/70">
                  Rezerváciu nie je možné odoslať, kým nezmeníš dátum alebo čas.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="event-type">
                Typ akcie <span className="text-red-400">*</span>
              </Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger
                  id="event-type"
                  className="w-full justify-start gap-2 rounded-xl px-3 data-[size=default]:h-11"
                >
                  <PartyPopper className="size-4 shrink-0 text-muted-foreground/60" />
                  <SelectValue placeholder="Vyber typ akcie">
                    {(value: string | null) =>
                      value ? formatEventTypeLabel(value) : null
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {eventType === "ine" && (
                <Input
                  value={customEventType}
                  onChange={(e) => setCustomEventType(e.target.value)}
                  placeholder="Napíš typ akcie…"
                  required
                  className="rounded-xl"
                />
              )}
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-3.5">
              <Label className="flex items-center gap-1.5">
                <MapPin className="size-3.5 text-violet-300" />
                Adresa akcie <span className="text-red-400">*</span>
                {addressFromProfile ? (
                  <span className="ml-1 text-[10px] font-normal text-zinc-500">
                    (z fakturačných údajov)
                  </span>
                ) : null}
              </Label>

              <div className="flex h-10 items-center gap-0.5 rounded-xl border border-input bg-transparent p-1">
                {COUNTRIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => setEventCountry(c.code)}
                    className={cn(
                      "flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                      eventCountry === c.code
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {c.code}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-[1fr_5.5rem] gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="street" className="text-xs text-zinc-500">
                    Ulica
                  </Label>
                  <Input
                    id="street"
                    value={street}
                    onChange={(e) => {
                      setStreet(e.target.value);
                      setAddressFromProfile(false);
                    }}
                    placeholder="Hlavná"
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="house" className="text-xs text-zinc-500">
                    Č. domu
                  </Label>
                  <Input
                    id="house"
                    value={houseNumber}
                    onChange={(e) => {
                      setHouseNumber(e.target.value);
                      setAddressFromProfile(false);
                    }}
                    placeholder="12"
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-[5.5rem_1fr] gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="psc" className="text-xs text-zinc-500">
                    PSČ
                  </Label>
                  <Input
                    id="psc"
                    value={postalCode}
                    onChange={(e) => {
                      setPostalCode(e.target.value);
                      setAddressFromProfile(false);
                    }}
                    placeholder="81101"
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="city" className="text-xs text-zinc-500">
                    Mesto
                  </Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setAddressFromProfile(false);
                    }}
                    placeholder="Bratislava"
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">
                Rozpočet cca (EUR) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="budget"
                inputMode="decimal"
                value={clientBudget}
                onChange={(e) => setClientBudget(e.target.value)}
                placeholder="napr. 400"
                required
                className="rounded-xl"
              />
              <p className="text-[11px] text-zinc-500">
                Orientačná suma — {artistWillSend} svoju skutočnú ponuku.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">
                Čo chceš / ako si to predstavuješ{" "}
                <span className="text-red-400">*</span>
              </Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Typ hostí, vibe, playlist, čo má umelec pripraviť…"
                rows={4}
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  "gap-2",
                  overlap.conflict && "opacity-50"
                )}
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Odosielam…
                  </>
                ) : overlap.conflict ? (
                  <>
                    <AlertTriangle className="size-4" />
                    Termín sa prekrýva
                  </>
                ) : (
                  <>
                    <Send className="size-4" />
                    Odoslať dopyt
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
