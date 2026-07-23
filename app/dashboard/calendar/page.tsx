"use client";

import { useEffect, useMemo, useState } from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import {
  Ban,
  CalendarDays,
  CalendarOff,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hourglass,
  Loader2,
  Mail,
  MapPin,
  PartyPopper,
  Phone,
  Plus,
  Sparkles,
  Trash2,
  Pencil,
  User as UserIcon,
} from "lucide-react";
import { useDashboardUser } from "@/components/DashboardUserContext";
import { Reveal } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { normalizeTime, parseLocalDate, timeOptions } from "@/lib/dates";
import { EVENT_TYPES, formatEventTypeLabel } from "@/lib/event-types";
import {
  getSpanEdge,
  showSpanLabel,
  spanStripClass,
} from "@/lib/calendar-span";
import { useToast } from "@/lib/toast-context";
import {
  createBlockout,
  createDjOwnEvent,
  deleteCalendarEntry,
  updateBlockout,
  updateDjOwnEvent,
} from "@/app/actions/calendar-entries";
import { useDjBookings, type CachedBooking } from "@/hooks/useDjBookings";
import { CalendarSyncPanel } from "@/components/CalendarSyncPanel";

type BookingStatus = "pending" | "accepted" | "rejected";

type Booking = CachedBooking;

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];
const TIME_OPTS = timeOptions(30);

const STATUS_STYLES: Record<
  BookingStatus,
  { strip: string; dot: string; label: string; icon: typeof Check }
> = {
  pending: {
    strip: "bg-amber-500/20 text-amber-200 hover:bg-amber-500/30",
    dot: "bg-amber-400",
    label: "Čaká na vyjadrenie",
    icon: Hourglass,
  },
  accepted: {
    strip: "bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30",
    dot: "bg-emerald-400",
    label: "Potvrdené",
    icon: Check,
  },
  rejected: {
    strip: "bg-red-500/15 text-red-300/80 hover:bg-red-500/25",
    dot: "bg-red-400",
    label: "Zamietnuté",
    icon: Ban,
  },
};

const BLOCKOUT_STYLE = {
  strip: "bg-zinc-500/30 text-zinc-100 hover:bg-zinc-500/40",
  dot: "bg-zinc-300",
  label: "Nedostupnosť",
  icon: CalendarOff,
};

const monthFormatter = new Intl.DateTimeFormat("sk-SK", {
  month: "long",
  year: "numeric",
});

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(value: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDate(iso: string) {
  return parseLocalDate(iso).toLocaleDateString("sk-SK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateRange(startIso: string, endIso: string | null) {
  if (!endIso || endIso === startIso) {
    return parseLocalDate(startIso).toLocaleDateString("sk-SK", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }
  const start = parseLocalDate(startIso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
  });
  const end = parseLocalDate(endIso).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
  return `${start} – ${end}`;
}

function displayName(b: Booking) {
  if (b.type === "blockout") return b.title?.trim() || "Nedostupnosť";
  return b.title?.trim() || b.client_name?.trim() || "Akcia";
}

function isDeletable(b: Booking) {
  return b.type === "blockout" || b.client_id === null;
}

export default function CalendarPage() {
  const { user, loading: userLoading } = useDashboardUser();
  const { showToast } = useToast();
  const {
    bookings,
    setBookings,
    loading: bookingsLoading,
    refresh: loadBookings,
  } = useDjBookings(user?.id);

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [blockoutOpen, setBlockoutOpen] = useState(false);
  const [ownEventOpen, setOwnEventOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bookingsByDate = useMemo(() => {
    const map = new Map<string, Booking[]>();
    for (const b of bookings) {
      const start = fromISODate(b.event_date);
      const end = fromISODate(b.end_date ?? b.event_date) ?? start;
      if (!start) continue;

      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= (end ?? start) && guard < 366) {
        const key = toISODate(cursor);
        const list = map.get(key) ?? [];
        list.push(b);
        map.set(key, list);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return map;
  }, [bookings]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return new Date(year, month, dayNum);
    });
  }, [year, month]);

  const goToMonth = (delta: number) => setViewDate(new Date(year, month + delta, 1));
  const goToToday = () => {
    const now = new Date();
    setViewDate(now);
    setSelectedDate(now);
  };

  const selectedBookings = bookingsByDate.get(toISODate(selectedDate)) ?? [];
  const today = new Date();

  const handleDelete = async (booking: Booking) => {
    if (!isDeletable(booking)) return;
    setDeletingId(booking.id);
    const result = await deleteCalendarEntry(booking.id);
    setDeletingId(null);
    if (!result.ok) {
      showToast(result.error ?? "Záznam sa nepodarilo zmazať.", "error");
      return;
    }
    setBookings((prev) => prev.filter((b) => b.id !== booking.id));
    showToast(
      booking.type === "blockout" ? "Blokácia bola zrušená." : "Akcia bola odstránená.",
      "success"
    );
  };

  if (userLoading || (bookingsLoading && bookings.length === 0)) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 animate-pulse">
        <div className="h-8 w-40 rounded-xl bg-white/5" />
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="h-48 rounded-3xl bg-white/[0.03]" />
          <div className="h-80 rounded-3xl bg-white/[0.03]" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Reveal>
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">Kalendár</h1>
            <p className="mt-1.5 text-sm text-zinc-500">
              Rezervácie, vlastné akcie a nedostupnosť v mesačnom pohľade.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="gap-2 rounded-[0.75rem] border-zinc-500/40 bg-zinc-500/10 text-zinc-200 hover:bg-zinc-500/20"
              onClick={() => {
                setEditingBooking(null);
                setBlockoutOpen(true);
              }}
            >
              <CalendarOff className="size-4" />
              Nedostupnosť
            </Button>
            <Button
              type="button"
              className="gap-2 rounded-[0.75rem]"
              onClick={() => {
                setEditingBooking(null);
                setOwnEventOpen(true);
              }}
            >
              <Plus className="size-4" />
              Pridať akciu
            </Button>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3.5 py-1.5 text-xs font-semibold text-emerald-300">
              <Sparkles className="size-3.5" />
              {bookings.length} záznamov
            </span>
          </div>
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
          <div className="order-2 space-y-3 lg:order-1">
            <div className="glass rounded-3xl p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Vybraný deň
              </p>
              <p className="mt-1 text-lg font-semibold capitalize text-white">
                {formatDate(toISODate(selectedDate))}
              </p>
              <p className="mt-2 text-[11px] text-zinc-500">
                Klikni na deň v kalendári, aby si tu videl detaily.
              </p>
            </div>

            {selectedBookings.length === 0 ? (
              <div className="glass flex flex-col items-center gap-2 rounded-3xl px-5 py-10 text-center">
                <CalendarDays className="size-6 text-zinc-500" />
                <p className="text-sm text-zinc-500">
                  V tento deň nemáš žiadny záznam.
                </p>
              </div>
            ) : (
              selectedBookings.map((b) => (
                <BookingDetailCard
                  key={b.id}
                  booking={b}
                  deleting={deletingId === b.id}
                  onDelete={isDeletable(b) ? () => handleDelete(b) : undefined}
                  onEdit={
                    isDeletable(b)
                      ? () => {
                          setEditingBooking(b);
                          if (b.type === "blockout") setBlockoutOpen(true);
                          else setOwnEventOpen(true);
                        }
                      : undefined
                  }
                />
              ))
            )}
          </div>

          <div className="glass card-lift order-1 rounded-3xl p-5 md:p-6 lg:order-2">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-base font-semibold capitalize text-white">
                  {monthFormatter.format(viewDate)}
                </span>
                <button
                  type="button"
                  onClick={goToToday}
                  className="text-[11px] font-medium text-violet-300 hover:text-violet-200"
                >
                  Dnes
                </button>
              </div>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1.5 grid grid-cols-7 gap-1.5">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="flex h-7 items-center justify-center text-[11px] font-medium text-zinc-500"
                >
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1.5">
              {cells.map((date, i) => {
                if (!date)
                  return (
                    <div key={i} className="min-h-[5.5rem] sm:min-h-[6.5rem]" />
                  );

                const iso = toISODate(date);
                const dayBookings = bookingsByDate.get(iso) ?? [];
                const isSelected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const fullDayBlockouts = dayBookings.filter(
                  (b) => b.type === "blockout" && b.all_day
                );
                const otherBookings = dayBookings.filter(
                  (b) => !(b.type === "blockout" && b.all_day)
                );
                const hasFullDayGrey = fullDayBlockouts.length > 0;
                const visibleStrips = [
                  ...fullDayBlockouts.slice(0, 1),
                  ...otherBookings.slice(0, 2),
                ];
                const overflowCount =
                  dayBookings.length - visibleStrips.length;

                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    onClick={() => setSelectedDate(new Date(date))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDate(new Date(date));
                      }
                    }}
                    className={cn(
                      "relative flex min-h-[5.5rem] cursor-pointer flex-col gap-1 overflow-visible rounded-xl p-1 text-sm transition-all duration-200 sm:min-h-[6.5rem]",
                      hasFullDayGrey && "bg-zinc-500/25 ring-1 ring-zinc-500/20",
                      isSelected
                        ? "bg-violet-500/20 ring-2 ring-violet-400/60"
                        : !hasFullDayGrey && "hover:bg-white/[0.04]",
                      isToday && !isSelected && "ring-1 ring-violet-500/30"
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center self-start rounded-full text-xs font-medium",
                        isSelected && !isToday && "bg-violet-500/40 text-white",
                        isToday
                          ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                          : hasFullDayGrey
                            ? "text-zinc-200"
                            : "text-zinc-400"
                      )}
                    >
                      {date.getDate()}
                    </span>

                    <div className="flex flex-1 flex-col gap-1 overflow-visible">
                      {visibleStrips.map((b) => (
                        <BookingStrip
                          key={b.id}
                          booking={b}
                          dayIso={iso}
                          deleting={deletingId === b.id}
                          onDelete={
                            isDeletable(b) ? () => handleDelete(b) : undefined
                          }
                          onEdit={
                            isDeletable(b)
                              ? () => {
                                  setEditingBooking(b);
                                  if (b.type === "blockout") setBlockoutOpen(true);
                                  else setOwnEventOpen(true);
                                }
                              : undefined
                          }
                        />
                      ))}
                      {overflowCount > 0 && (
                        <span className="truncate rounded-md px-1.5 py-[3px] text-left text-[10px] font-medium text-zinc-500">
                          +{overflowCount} viac
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 border-t border-white/5 pt-4 text-[11px] text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-400" /> Potvrdené
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-400" /> Čakajúce
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-zinc-300" /> Nedostupnosť
              </span>
            </div>
          </div>
        </div>
      </Reveal>

      <BlockoutDialog
        open={blockoutOpen}
        onOpenChange={(open) => {
          setBlockoutOpen(open);
          if (!open) setEditingBooking(null);
        }}
        saving={saving}
        defaultDate={toISODate(selectedDate)}
        initial={
          editingBooking?.type === "blockout" ? editingBooking : null
        }
        onSubmit={async (values) => {
          setSaving(true);
          const result = editingBooking
            ? await updateBlockout({ id: editingBooking.id, ...values })
            : await createBlockout(values);
          setSaving(false);
          if (!result.ok) {
            showToast(result.error ?? "Blokáciu sa nepodarilo uložiť.", "error");
            return;
          }
          showToast(
            editingBooking
              ? "Blokácia bola upravená."
              : "Nedostupnosť bola pridaná.",
            "success"
          );
          setBlockoutOpen(false);
          setEditingBooking(null);
          await loadBookings();
        }}
      />

      <OwnEventDialog
        open={ownEventOpen}
        onOpenChange={(open) => {
          setOwnEventOpen(open);
          if (!open) setEditingBooking(null);
        }}
        saving={saving}
        defaultDate={toISODate(selectedDate)}
        initial={
          editingBooking && editingBooking.type !== "blockout"
            ? editingBooking
            : null
        }
        onSubmit={async (values) => {
          setSaving(true);
          const result = editingBooking
            ? await updateDjOwnEvent({ id: editingBooking.id, ...values })
            : await createDjOwnEvent(values);
          setSaving(false);
          if (!result.ok) {
            showToast(result.error ?? "Akciu sa nepodarilo uložiť.", "error");
            return;
          }
          showToast(
            editingBooking
              ? "Akcia bola upravená."
              : "Akcia bola pridaná do kalendára.",
            "success"
          );
          setOwnEventOpen(false);
          setEditingBooking(null);
          await loadBookings();
        }}
      />

      <Reveal delay={160}>
        <div className="mt-8">
          <CalendarSyncPanel />
        </div>
      </Reveal>
    </div>
  );
}

function BookingStrip({
  booking,
  dayIso,
  onDelete,
  onEdit,
  deleting,
}: {
  booking: Booking;
  dayIso: string;
  onDelete?: () => void;
  onEdit?: () => void;
  deleting?: boolean;
}) {
  const isBlockout = booking.type === "blockout";
  const style = isBlockout ? BLOCKOUT_STYLE : STATUS_STYLES[booking.status];
  const edge = getSpanEdge(
    dayIso,
    booking.event_date,
    booking.end_date ?? booking.event_date
  );
  const timeLabel =
    !booking.all_day && booking.start_time && booking.end_time
      ? `${normalizeTime(booking.start_time)}–${normalizeTime(booking.end_time)}`
      : null;
  const label = displayName(booking);
  const text = showSpanLabel(edge)
    ? timeLabel
      ? `${timeLabel} · ${label}`
      : label
    : "\u00A0";

  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "flex w-full items-center gap-1 truncate px-1.5 py-[3px] text-left text-[10px] font-medium transition-colors",
          style.strip,
          spanStripClass(edge),
          booking.all_day && isBlockout && "bg-zinc-500/40"
        )}
      >
        {showSpanLabel(edge) && (
          <span className={cn("size-1.5 shrink-0 rounded-full", style.dot)} />
        )}
        <span className="truncate">{text}</span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="right"
          align="start"
          sideOffset={8}
          className="isolate z-[200]"
        >
          <PopoverPrimitive.Popup className="w-80 origin-(--transform-origin) overflow-hidden rounded-2xl border border-white/10 bg-black/90 p-4 text-popover-foreground shadow-2xl backdrop-blur-xl duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <BookingDetailContent
              booking={booking}
              onDelete={onDelete}
              onEdit={onEdit}
              deleting={deleting}
            />
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

function BookingDetailCard({
  booking,
  onDelete,
  onEdit,
  deleting,
}: {
  booking: Booking;
  onDelete?: () => void;
  onEdit?: () => void;
  deleting?: boolean;
}) {
  return (
    <div className="card-lift rounded-2xl border border-white/8 bg-card/70 p-4 backdrop-blur-md">
      <BookingDetailContent
        booking={booking}
        onDelete={onDelete}
        onEdit={onEdit}
        deleting={deleting}
      />
    </div>
  );
}

function BookingDetailContent({
  booking: b,
  onDelete,
  onEdit,
  deleting,
}: {
  booking: Booking;
  onDelete?: () => void;
  onEdit?: () => void;
  deleting?: boolean;
}) {
  const isBlockout = b.type === "blockout";
  const style = isBlockout ? BLOCKOUT_STYLE : STATUS_STYLES[b.status];
  const StatusIcon = style.icon;

  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg",
              isBlockout
                ? "bg-zinc-500/20"
                : "bg-gradient-to-br from-violet-500/30 to-fuchsia-500/10"
            )}
          >
            {isBlockout ? (
              <CalendarOff className="size-4 text-zinc-300" />
            ) : (
              <UserIcon className="size-4 text-violet-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {displayName(b)}
            </p>
            <Badge
              className={cn(
                "mt-0.5 text-[10px]",
                isBlockout
                  ? "border-zinc-500/30 bg-zinc-500/15 text-zinc-200"
                  : "border-violet-500/30 bg-violet-500/15 text-violet-200"
              )}
            >
              {isBlockout ? (
                <CalendarOff className="mr-1 size-2.5" />
              ) : (
                <PartyPopper className="mr-1 size-2.5" />
              )}
              {isBlockout
                ? "Nedostupnosť"
                : formatEventTypeLabel(b.event_type)}
            </Badge>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
            isBlockout && "bg-zinc-500/20 text-zinc-200",
            !isBlockout && b.status === "pending" && "bg-amber-500/15 text-amber-300",
            !isBlockout && b.status === "accepted" && "bg-emerald-500/15 text-emerald-300",
            !isBlockout && b.status === "rejected" && "bg-red-500/15 text-red-300"
          )}
        >
          <StatusIcon className="size-2.5" />
          {style.label}
        </span>
      </div>

      <div className="mt-3 space-y-1.5 border-t border-white/5 pt-3 text-xs">
        <p className="flex items-center gap-2 text-zinc-400">
          <CalendarDays className="size-3.5 shrink-0 text-violet-400/70" />
          {formatDateRange(b.event_date, b.end_date)}
        </p>
        {(b.start_time || b.end_time) && (
          <p className="flex items-center gap-2 text-zinc-400">
            <Clock className="size-3.5 shrink-0 text-violet-400/70" />
            {b.all_day
              ? "Celý deň"
              : `${normalizeTime(b.start_time)}–${normalizeTime(b.end_time)}`}
          </p>
        )}
        {b.client_email && (
          <a
            href={`mailto:${b.client_email}`}
            className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-violet-300"
          >
            <Mail className="size-3.5 shrink-0 text-violet-400/80" />
            <span className="truncate">{b.client_email}</span>
          </a>
        )}
        {b.client_phone && (
          <a
            href={`tel:${b.client_phone}`}
            className="flex items-center gap-2 text-zinc-300 transition-colors hover:text-violet-300"
          >
            <Phone className="size-3.5 shrink-0 text-violet-400/80" />
            {b.client_phone}
          </a>
        )}
        {b.event_location && (
          <p className="flex items-center gap-2 text-zinc-400">
            <MapPin className="size-3.5 shrink-0 text-violet-400/70" />
            {b.event_location}
          </p>
        )}
      </div>

      {b.message && (
        <p className="mt-3 border-t border-white/5 pt-3 text-xs leading-relaxed text-zinc-400">
          {b.message}
        </p>
      )}

      {b.status === "rejected" && b.rejection_reason && (
        <div className="mt-3 rounded-xl border border-red-500/15 bg-red-500/[0.04] px-3 py-2 text-xs text-red-300/90">
          <span className="font-medium text-red-300">Dôvod zamietnutia: </span>
          {b.rejection_reason}
        </div>
      )}

      {(onEdit || onDelete) && (
        <div className="mt-3 flex flex-col gap-2">
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-[0.75rem] border-violet-500/30 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="size-3.5" />
              Upraviť
            </Button>
          )}
          {onDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full gap-2 rounded-[0.75rem] border-red-500/30 bg-red-500/10 text-red-200 hover:bg-red-500/20"
              disabled={deleting}
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              {deleting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              {isBlockout ? "Zrušiť blokáciu" : "Odstrániť z kalendára"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function BlockoutDialog({
  open,
  onOpenChange,
  saving,
  defaultDate,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  defaultDate: string;
  initial?: Booking | null;
  onSubmit: (values: {
    title: string;
    eventDate: string;
    eventEndDate: string;
    allDay: boolean;
    startTime?: string;
    endTime?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title?.trim() || initial.client_name || "");
      setStartDate(initial.event_date);
      setEndDate(initial.end_date ?? initial.event_date);
      setAllDay(Boolean(initial.all_day));
      setStartTime(normalizeTime(initial.start_time, "09:00"));
      setEndTime(normalizeTime(initial.end_time, "17:00"));
    } else {
      setTitle("");
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setAllDay(true);
      setStartTime("09:00");
      setEndTime("17:00");
    }
  }, [open, defaultDate, initial]);

  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upraviť nedostupnosť" : "Pridať nedostupnosť"}
          </DialogTitle>
          <DialogDescription>
            Dovolenka, PN alebo iný termín, kedy si nedostupný.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            await onSubmit({
              title: title.trim(),
              eventDate: startDate,
              eventEndDate: endDate,
              allDay,
              startTime: allDay ? undefined : startTime,
              endTime: allDay ? undefined : endTime,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="blockout-title">Názov</Label>
            <Input
              id="blockout-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Napr. Dovolenka v Tatrách"
              required
              className="rounded-[0.75rem]"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dátum od</Label>
              <DatePicker
                value={startDate}
                placeholder="Od"
                onChange={(iso) => {
                  setStartDate(iso);
                  if (!endDate || endDate < iso) setEndDate(iso);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Dátum do</Label>
              <DatePicker
                value={endDate}
                placeholder="Do"
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

          <div className="flex gap-2 rounded-[0.75rem] border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setAllDay(true)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                allDay
                  ? "bg-zinc-500/30 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Celý deň
            </button>
            <button
              type="button"
              onClick={() => setAllDay(false)}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                !allDay
                  ? "bg-violet-500/25 text-violet-200"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Len určitý čas
            </button>
          </div>

          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Od</Label>
                <Select
                  value={startTime}
                  onValueChange={(v) => v && setStartTime(v)}
                >
                  <SelectTrigger className="w-full rounded-[0.75rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" side="bottom">
                    {TIME_OPTS.map((t) => (
                      <SelectItem key={`bs-${t}`} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Do</Label>
                <Select
                  value={endTime}
                  onValueChange={(v) => v && setEndTime(v)}
                >
                  <SelectTrigger className="w-full rounded-[0.75rem]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-60" side="bottom">
                    {TIME_OPTS.map((t) => (
                      <SelectItem key={`be-${t}`} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="submit"
              disabled={saving || !title.trim() || !startDate || !endDate}
              className="gap-2 rounded-[0.75rem]"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarOff className="size-4" />
              )}
              {isEdit ? "Uložiť zmeny" : "Uložiť blokáciu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function OwnEventDialog({
  open,
  onOpenChange,
  saving,
  defaultDate,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  defaultDate: string;
  initial?: Booking | null;
  onSubmit: (values: {
    title: string;
    eventType: string;
    eventDate: string;
    eventEndDate: string;
    startTime: string;
    endTime: string;
    eventLocation?: string;
  }) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<string | null>(null);
  const [customEventType, setCustomEventType] = useState("");
  const [startDate, setStartDate] = useState(defaultDate);
  const [endDate, setEndDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("23:00");
  const [location, setLocation] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      const known = EVENT_TYPES.some((t) => t.value === initial.event_type);
      setTitle(initial.title?.trim() || initial.client_name || "");
      if (known) {
        setEventType(initial.event_type);
        setCustomEventType("");
      } else {
        setEventType("ine");
        setCustomEventType(initial.event_type);
      }
      setStartDate(initial.event_date);
      setEndDate(initial.end_date ?? initial.event_date);
      setStartTime(normalizeTime(initial.start_time, "18:00"));
      setEndTime(normalizeTime(initial.end_time, "23:00"));
      setLocation(initial.event_location ?? "");
    } else {
      setTitle("");
      setEventType(null);
      setCustomEventType("");
      setStartDate(defaultDate);
      setEndDate(defaultDate);
      setStartTime("18:00");
      setEndTime("23:00");
      setLocation("");
    }
  }, [open, defaultDate, initial]);

  const resolvedType =
    eventType === "ine" ? customEventType.trim() : eventType;
  const isEdit = Boolean(initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Upraviť akciu" : "Pridať vlastnú akciu"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Zmeň dátum, čas alebo detaily akcie."
              : "Nahraj do kalendára akciu, ktorú máš obsadenú mimo platformy."}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!resolvedType) return;
            await onSubmit({
              title: title.trim(),
              eventType: resolvedType,
              eventDate: startDate,
              eventEndDate: endDate,
              startTime,
              endTime,
              eventLocation: location.trim() || undefined,
            });
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="own-title">Názov</Label>
            <Input
              id="own-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Napr. Firemný večierok XYZ"
              required
              className="rounded-[0.75rem]"
            />
          </div>
          <div className="space-y-2">
            <Label>Typ akcie</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger className="w-full rounded-[0.75rem]">
                <SelectValue placeholder="Vyber typ">
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
            {eventType === "ine" && (
              <Input
                value={customEventType}
                onChange={(e) => setCustomEventType(e.target.value)}
                placeholder="Napíš typ akcie…"
                required
                className="rounded-[0.75rem]"
              />
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Dátum od</Label>
              <DatePicker
                value={startDate}
                placeholder="Od"
                onChange={(iso) => {
                  setStartDate(iso);
                  if (!endDate || endDate < iso) setEndDate(iso);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Dátum do</Label>
              <DatePicker
                value={endDate}
                placeholder="Do"
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Začiatok</Label>
              <Select value={startTime} onValueChange={(v) => v && setStartTime(v)}>
                <SelectTrigger className="w-full rounded-[0.75rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60" side="bottom">
                  {TIME_OPTS.map((t) => (
                    <SelectItem key={`os-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Koniec</Label>
              <Select value={endTime} onValueChange={(v) => v && setEndTime(v)}>
                <SelectTrigger className="w-full rounded-[0.75rem]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-60" side="bottom">
                  {TIME_OPTS.map((t) => (
                    <SelectItem key={`oe-${t}`} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="own-location">Miesto (voliteľné)</Label>
            <Input
              id="own-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Mesto / adresa"
              className="rounded-[0.75rem]"
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={
                saving ||
                !title.trim() ||
                !resolvedType ||
                !startDate ||
                !endDate
              }
              className="gap-2 rounded-[0.75rem]"
            >
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Plus className="size-4" />
              )}
              {isEdit ? "Uložiť zmeny" : "Uložiť akciu"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
