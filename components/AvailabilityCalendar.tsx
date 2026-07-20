"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { formatTimeSk, normalizeTime } from "@/lib/dates";
import { formatEventTypeLabel } from "@/lib/event-types";
import {
  getSpanEdge,
  showSpanLabel,
  spanStripClass,
} from "@/lib/calendar-span";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

const monthFormatter = new Intl.DateTimeFormat("sk-SK", {
  month: "long",
  year: "numeric",
});

const dayFormatter = new Intl.DateTimeFormat("sk-SK", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

type BusySlot = {
  start: string;
  end: string;
  startTime: string;
  endTime: string;
  eventType: string;
  entryType: "booking" | "blockout" | "external";
  title: string | null;
  allDay: boolean;
};

function slotLabel(slot: BusySlot) {
  if (slot.entryType === "blockout" || slot.entryType === "external") {
    return slot.title?.trim() || "Nedostupnosť";
  }
  return formatEventTypeLabel(slot.eventType);
}

/**
 * Public availability month grid — connected multi-day strips,
 * full-day blockouts paint the whole cell grey.
 */
export function AvailabilityCalendar({ djId }: { djId: string }) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedIso, setSelectedIso] = useState<string | null>(null);

  useEffect(() => {
    if (!djId) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
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
            event_type: string | null;
            entry_type: string;
            title: string | null;
            all_day: boolean;
          }[];
        };
        if (cancelled) return;
        setBusy(
          (json.slots ?? []).map((row) => ({
            start: row.event_date,
            end: row.end_date || row.event_date,
            startTime: normalizeTime(
              row.all_day ? "00:00" : row.start_time,
              "00:00"
            ),
            endTime: normalizeTime(
              row.all_day ? "23:59" : row.end_time,
              "23:59"
            ),
            eventType: row.event_type || "akcia",
            entryType:
              row.entry_type === "blockout"
                ? "blockout"
                : row.entry_type === "external"
                  ? "external"
                  : "booking",
            title: row.title,
            allDay: Boolean(row.all_day),
          }))
        );
      } catch {
        const supabase = createClient();
        const { data } = await supabase
          .from("dj_busy_dates")
          .select(
            "event_date, end_date, start_time, end_time, event_type, type, title, all_day"
          )
          .eq("dj_id", djId);

        if (cancelled) return;
        setBusy(
          (
            (data ?? []) as {
              event_date: string;
              end_date: string;
              start_time: string;
              end_time: string;
              event_type: string | null;
              type: string | null;
              title: string | null;
              all_day: boolean | null;
            }[]
          ).map((row) => ({
            start: row.event_date,
            end: row.end_date,
            startTime: normalizeTime(row.start_time),
            endTime: normalizeTime(row.end_time),
            eventType: row.event_type || "akcia",
            entryType: row.type === "blockout" ? "blockout" : "booking",
            title: row.title,
            allDay: Boolean(row.all_day),
          }))
        );
      }
      if (!cancelled) setLoading(false);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [djId]);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, BusySlot[]>();
    for (const range of busy) {
      const start = fromISODate(range.start);
      const end = fromISODate(range.end);
      const cursor = new Date(start);
      let guard = 0;
      while (cursor <= end && guard < 366) {
        const key = toISODate(cursor);
        const list = map.get(key) ?? [];
        list.push(range);
        map.set(key, list);
        cursor.setDate(cursor.getDate() + 1);
        guard += 1;
      }
    }
    return map;
  }, [busy]);

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

  const goToMonth = (delta: number) =>
    setViewDate(new Date(year, month + delta, 1));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedSlots = selectedIso ? slotsByDay.get(selectedIso) ?? [] : [];

  return (
    <div className="rounded-[0.75rem] border border-white/10 bg-black/40 p-5 backdrop-blur-md md:p-6">
      <div className="mb-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
          <span className="flex size-8 items-center justify-center rounded-[0.75rem] bg-violet-500/15">
            <CalendarDays className="size-4 text-violet-300" />
          </span>
          Dostupnosť
        </h3>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => goToMonth(-1)}
          className="flex size-8 items-center justify-center rounded-[0.75rem] border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Predchádzajúci mesiac"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium capitalize text-white">
          {monthFormatter.format(viewDate)}
        </span>
        <button
          type="button"
          onClick={() => goToMonth(1)}
          className="flex size-8 items-center justify-center rounded-[0.75rem] border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Ďalší mesiac"
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

      {loading ? (
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: 35 }).map((_, i) => (
            <div
              key={i}
              className="min-h-[4.5rem] animate-pulse rounded-[0.75rem] bg-white/[0.04] sm:min-h-[5.25rem]"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1.5">
          {cells.map((date, i) => {
            if (!date) {
              return (
                <div
                  key={i}
                  className="min-h-[4.5rem] sm:min-h-[5.25rem]"
                />
              );
            }

            const iso = toISODate(date);
            const daySlots = slotsByDay.get(iso) ?? [];
            const isToday = isSameDay(date, today);
            const isPast = date < today && !isToday;
            const isSelected = selectedIso === iso;
            const fullDayBlockouts = daySlots.filter(
              (s) =>
                s.allDay &&
                (s.entryType === "blockout" || s.entryType === "external")
            );
            const timedSlots = daySlots.filter(
              (s) =>
                !(
                  s.allDay &&
                  (s.entryType === "blockout" || s.entryType === "external")
                )
            );
            const hasFullDayGrey = fullDayBlockouts.length > 0;
            const visible = timedSlots.slice(0, 2);
            const overflow =
              timedSlots.length -
              visible.length +
              Math.max(0, fullDayBlockouts.length - 1);

            return (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setSelectedIso((prev) => (prev === iso ? null : iso))
                }
                className={cn(
                  "relative flex min-h-[4.5rem] flex-col gap-0.5 overflow-visible rounded-[0.75rem] p-1 text-left transition-all sm:min-h-[5.25rem]",
                  hasFullDayGrey && "bg-zinc-500/25 ring-1 ring-zinc-500/20",
                  isSelected
                    ? "bg-violet-500/15 ring-2 ring-violet-400/50"
                    : !hasFullDayGrey && "hover:bg-white/[0.04]",
                  isToday && !isSelected && "ring-1 ring-violet-500/30",
                  isPast && daySlots.length === 0 && "opacity-40"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium sm:size-6 sm:text-xs",
                    isToday
                      ? "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white"
                      : hasFullDayGrey
                        ? "text-zinc-200"
                        : "text-zinc-400"
                  )}
                >
                  {date.getDate()}
                </span>

                <div className="flex flex-1 flex-col gap-0.5 overflow-visible">
                  {fullDayBlockouts.slice(0, 1).map((slot, idx) => {
                    const edge = getSpanEdge(iso, slot.start, slot.end);
                    const label = slotLabel(slot);
                    return (
                      <span
                        key={`fd-${slot.start}-${idx}`}
                        className={cn(
                          "truncate bg-zinc-500/40 px-1 py-[2px] text-[8px] font-medium leading-tight text-zinc-100 ring-1 ring-zinc-400/20 sm:text-[9px]",
                          spanStripClass(edge)
                        )}
                        title={label}
                      >
                        {showSpanLabel(edge) ? label : "\u00A0"}
                      </span>
                    );
                  })}
                  {visible.map((slot, idx) => {
                    const edge = getSpanEdge(iso, slot.start, slot.end);
                    const label = slotLabel(slot);
                    const timeRange = `${formatTimeSk(slot.startTime)}–${formatTimeSk(slot.endTime)}`;
                    const isBlockout =
                      slot.entryType === "blockout" ||
                      slot.entryType === "external";
                    const text = showSpanLabel(edge)
                      ? `${timeRange} ${label}`
                      : "\u00A0";
                    return (
                      <span
                        key={`${slot.start}-${slot.startTime}-${idx}`}
                        className={cn(
                          "truncate px-1 py-[2px] text-[8px] font-medium leading-tight ring-1 sm:text-[9px]",
                          spanStripClass(edge),
                          isBlockout
                            ? "bg-zinc-500/35 text-zinc-100 ring-zinc-500/25"
                            : "bg-red-500/20 text-red-200 ring-red-500/25"
                        )}
                        title={`${timeRange} · ${label}`}
                      >
                        {text}
                      </span>
                    );
                  })}
                  {overflow > 0 && (
                    <span className="px-1 text-[8px] text-zinc-500">
                      +{overflow} viac
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIso && (
        <div className="mt-4 rounded-[0.75rem] border border-white/8 bg-black/25 px-4 py-3">
          <p className="text-xs font-medium capitalize text-zinc-300">
            {dayFormatter.format(fromISODate(selectedIso))}
          </p>
          {selectedSlots.length === 0 ? (
            <p className="mt-1.5 text-xs text-emerald-300/80">
              V tento deň zatiaľ nie je potvrdená žiadna akcia.
            </p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {selectedSlots.map((slot, idx) => {
                const label = slotLabel(slot);
                const isBlockout =
                  slot.entryType === "blockout" ||
                  slot.entryType === "external";
                return (
                  <li
                    key={idx}
                    className={cn(
                      "flex flex-wrap items-center gap-2 text-xs",
                      isBlockout ? "text-zinc-300" : "text-red-200/90"
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-md px-2 py-0.5 font-medium ring-1",
                        isBlockout
                          ? "bg-zinc-500/25 ring-zinc-500/30"
                          : "bg-red-500/20 ring-red-500/25"
                      )}
                    >
                      {label}
                    </span>
                    <span>
                      {slot.allDay
                        ? "Celý deň"
                        : `${formatTimeSk(slot.startTime)}–${formatTimeSk(slot.endTime)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
