"use client";

import { useEffect, useMemo, useState } from "react";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { cn } from "@/lib/utils";

type ApiSlot = {
  event_date: string;
  title: string | null;
  entry_type: string;
};

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function CalendarMonthSection({
  djId,
  className,
}: {
  djId: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto w-full max-w-xl", className)}>
      <AvailabilityCalendar djId={djId} />
    </div>
  );
}

export function CalendarCompactSection({
  djId,
  className,
}: {
  djId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar/availability/${djId}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { slots?: ApiSlot[] };
        if (!cancelled && Array.isArray(json?.slots)) {
          setBusy(json.slots);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [djId]);

  const upcoming = useMemo(() => {
    const today = toISODate(new Date());
    const days = new Map<string, string>();
    for (const slot of busy) {
      const start = String(slot.event_date).slice(0, 10);
      if (start < today) continue;
      if (!days.has(start)) {
        days.set(
          start,
          slot.title?.trim() ||
            (slot.entry_type === "blockout" ? "Nedostupnosť" : "Obsadené")
        );
      }
    }
    return [...days.entries()].slice(0, 8);
  }, [busy]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Načítavam dostupnosť…</p>;
  }

  if (!upcoming.length) {
    return (
      <p className={cn("text-sm text-zinc-400", className)}>
        Najbližšie dni vyzerajú voľne — pošli dopyt na overenie.
      </p>
    );
  }

  return (
    <ul className={cn("mx-auto max-w-md space-y-2", className)}>
      {upcoming.map(([date, label]) => (
        <li
          key={date}
          className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
        >
          <span className="text-zinc-200">
            {new Date(date + "T12:00:00").toLocaleDateString("sk-SK", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </span>
          <span className="text-zinc-500">{label}</span>
        </li>
      ))}
    </ul>
  );
}

export function CalendarCardSection({
  djId,
  title,
  subtitle,
  className,
}: {
  djId: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto max-w-lg rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-5 sm:p-6",
        className
      )}
    >
      <h3 className="text-center text-lg font-semibold text-white">{title}</h3>
      {subtitle ? (
        <p className="mt-1 text-center text-sm text-zinc-400">{subtitle}</p>
      ) : null}
      <div className="mt-4">
        <AvailabilityCalendar djId={djId} />
      </div>
    </div>
  );
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

/** 2-week square grid with prev/next navigation — matches the insert preview sketch. */
export function CalendarWeeksSection({
  djId,
  className,
}: {
  djId: string;
  className?: string;
}) {
  const [busy, setBusy] = useState<ApiSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/calendar/availability/${djId}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as { slots?: ApiSlot[] };
        if (!cancelled && Array.isArray(json?.slots)) {
          setBusy(json.slots);
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [djId]);

  const busyMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const slot of busy) {
      const start = String(slot.event_date).slice(0, 10);
      if (!map.has(start)) {
        map.set(
          start,
          slot.title?.trim() ||
            (slot.entry_type === "blockout" ? "Nedostupnosť" : "Obsadené")
        );
      }
    }
    return map;
  }, [busy]);

  const days = useMemo(() => {
    const start = startOfWeek(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const iso = toISODate(d);
      return {
        date: d,
        iso,
        label: busyMap.get(iso) ?? null,
        isToday: iso === toISODate(new Date()),
        isPast: iso < toISODate(new Date()),
      };
    });
  }, [busyMap, weekOffset]);

  const rangeLabel = useMemo(() => {
    const first = days[0]?.date;
    const last = days[13]?.date;
    if (!first || !last) return "";
    const fmt = (d: Date) =>
      d.toLocaleDateString("sk-SK", { day: "numeric", month: "short" });
    return `${fmt(first)} – ${fmt(last)}`;
  }, [days]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Načítavam dostupnosť…</p>;
  }

  return (
    <div className={cn("mx-auto w-full max-w-md space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekOffset((v) => Math.max(0, v - 2))}
          disabled={weekOffset <= 0}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5 disabled:opacity-30"
        >
          ←
        </button>
        <p className="text-sm font-medium text-zinc-200">{rangeLabel}</p>
        <button
          type="button"
          onClick={() => setWeekOffset((v) => v + 2)}
          className="rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:bg-white/5"
        >
          →
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {["Po", "Ut", "St", "Št", "Pi", "So", "Ne"].map((d) => (
          <div
            key={d}
            className="pb-0.5 text-center text-[10px] uppercase tracking-wide text-zinc-500"
          >
            {d}
          </div>
        ))}
        {days.map((day) => {
          const busyDay = Boolean(day.label);
          return (
            <div
              key={day.iso}
              title={day.label ?? (day.isPast ? undefined : "Voľné")}
              className={cn(
                "aspect-square rounded-md border text-center text-[11px] leading-none transition",
                "flex flex-col items-center justify-center gap-0.5",
                day.isToday && "ring-1 ring-violet-400/70",
                busyDay
                  ? "border-rose-500/30 bg-rose-500/15 text-rose-200"
                  : day.isPast
                    ? "border-white/5 bg-white/[0.02] text-zinc-600"
                    : "border-white/10 bg-emerald-500/10 text-emerald-200"
              )}
            >
              <span className="font-medium">{day.date.getDate()}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap justify-center gap-3 text-[11px] text-zinc-500">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500/30" /> Voľné
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-rose-500/30" /> Obsadené
        </span>
      </div>
    </div>
  );
}
