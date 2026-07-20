"use client";

import { useEffect, useMemo, useState, cloneElement, type ReactElement } from "react";
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
import { EVENT_TYPES } from "@/lib/event-types";
import { cn } from "@/lib/utils";

const TIME_OPTS = timeOptions(30);

type BookingDialogProps = {
  djId: string;
  djName: string;
  children: ReactElement<Record<string, unknown>>;
};

type AuthState = "checking" | "guest" | "dj" | "client";

type BusySlot = {
  event_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
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
  children,
}: BookingDialogProps) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

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
  const [busySlots, setBusySlots] = useState<BusySlot[]>([]);

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
          ((data ?? []) as BusySlot[]).map((row) => ({
            event_date: row.event_date,
            end_date: row.end_date,
            start_time: normalizeTime(row.start_time),
            end_time: normalizeTime(row.end_time),
          }))
        );
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [open, djId]);

  const blockedDates = useMemo(() => {
    const set = new Set<string>();
    for (const slot of busySlots) {
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
      reason: "Tento termín sa prekrýva s už potvrdenou akciou DJ-a.",
      slots: colliding,
    };
  }, [busySlots, startDate, endDate, startTime, endTime]);

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
        clientPhone.trim()
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
      showToast("DJ účty nemôžu odosielať rezervácie.", "error");
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
      message: message.trim() || undefined,
    });

    setSubmitting(false);

    if (!result.ok) {
      showToast(result.error ?? "Dopyt sa nepodarilo odoslať.", "error");
      return;
    }

    showToast(
      "Vaša správa bola odoslaná! DJ bol upozornený e-mailom.",
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
              Pošli DJ-ovi <span className="text-zinc-200">{djName}</span>{" "}
              dopyt s dátumom, časom a adresou akcie.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="client-phone">
                Telefón <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Phone className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  id="client-phone"
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="+421 900 123 456"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Dátum od <span className="text-red-400">*</span>
                </Label>
                <DatePicker
                  value={startDate}
                  placeholder="Od"
                  disabledDates={blockedDates}
                  onChange={(iso) => {
                    setStartDate(iso);
                    if (!endDate || endDate < iso) setEndDate(iso);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Dátum do <span className="text-red-400">*</span>
                </Label>
                <DatePicker
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
                    {TIME_OPTS.map((t) => (
                      <SelectItem key={`s-${t}`} value={t}>
                        {t}
                      </SelectItem>
                    ))}
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
                    {TIME_OPTS.map((t) => (
                      <SelectItem key={`e-${t}`} value={t}>
                        {t}
                      </SelectItem>
                    ))}
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
                  <SelectValue placeholder="Vyber typ akcie" />
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
                    onChange={(e) => setStreet(e.target.value)}
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
                    onChange={(e) => setHouseNumber(e.target.value)}
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
                    onChange={(e) => setPostalCode(e.target.value)}
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
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Bratislava"
                    required
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Správa</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Rozpovedz DJ-ovi viac o svojej akcii…"
                rows={3}
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
