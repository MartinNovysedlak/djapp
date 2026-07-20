"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

const WEEKDAYS = ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"];

function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function fromISODate(value: string): Date | null {
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

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

const monthFormatter = new Intl.DateTimeFormat("sk-SK", {
  month: "long",
  year: "numeric",
});
const shortFormatter = new Intl.DateTimeFormat("sk-SK", {
  day: "numeric",
  month: "short",
});

type DateRangePickerProps = {
  startValue: string;
  endValue: string;
  onChange: (start: string, end: string) => void;
  minDate?: Date;
  busyDays?: Set<string> | string[];
  placeholder?: string;
  className?: string;
};

/**
 * Od–do calendar:
 * - 1st click = start (od), immediately also sets end = same day
 * - 2nd click = end (do) for multi-day range
 */
export function DateRangePicker({
  startValue,
  endValue,
  onChange,
  minDate,
  busyDays,
  placeholder = "Vyber od – do",
  className,
}: DateRangePickerProps) {
  const start = fromISODate(startValue);
  const end = fromISODate(endValue);
  const today = startOfDay(minDate ?? new Date());
  const busy = React.useMemo(() => {
    if (!busyDays) return new Set<string>();
    return busyDays instanceof Set ? busyDays : new Set(busyDays);
  }, [busyDays]);

  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => start ?? today);
  const [hovered, setHovered] = React.useState<Date | null>(null);
  const [awaitingEnd, setAwaitingEnd] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setViewDate(start ?? today);
      setAwaitingEnd(Boolean(start && end && startValue === endValue));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = React.useMemo(() => {
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

  const rangeAnchor = start;
  const rangeEndPreview =
    awaitingEnd && rangeAnchor && hovered ? hovered : null;
  const effectiveEnd = end ?? rangeEndPreview;

  const isInRange = (date: Date) => {
    if (!rangeAnchor || !effectiveEnd) return false;
    if (isSameDay(rangeAnchor, effectiveEnd)) return false;
    const lo = rangeAnchor < effectiveEnd ? rangeAnchor : effectiveEnd;
    const hi = rangeAnchor < effectiveEnd ? effectiveEnd : rangeAnchor;
    return date > lo && date < hi;
  };

  const handleDayClick = (date: Date) => {
    const iso = toISODate(date);

    if (!awaitingEnd || !start) {
      onChange(iso, iso);
      setAwaitingEnd(true);
      return;
    }

    if (isSameDay(date, start)) {
      onChange(iso, iso);
      setAwaitingEnd(false);
      setOpen(false);
      return;
    }

    const lo = date < start ? date : start;
    const hi = date < start ? start : date;
    onChange(toISODate(lo), toISODate(hi));
    setAwaitingEnd(false);
    setOpen(false);
  };

  const label =
    start && end
      ? startValue === endValue
        ? `Od ${shortFormatter.format(start)} (1 deň)`
        : `Od ${shortFormatter.format(start)} – do ${shortFormatter.format(end)}`
      : placeholder;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        <CalendarRange className="size-4 shrink-0 text-muted-foreground/70" />
        <span
          className={cn("flex-1 truncate", !start && "text-muted-foreground")}
        >
          {label}
        </span>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup className="w-72 origin-(--transform-origin) overflow-hidden rounded-xl border border-white/10 bg-black/90 p-3 text-popover-foreground shadow-2xl backdrop-blur-xl duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <p className="mb-2 px-1 text-[11px] text-zinc-500">
              {!awaitingEnd
                ? "1. klik = od (začiatok). Potom vyber do."
                : "2. klik = do (koniec). Rovnaký deň = 1-dňová akcia."}
            </p>

            <div className="mb-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => goToMonth(-1)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-sm font-medium capitalize text-white">
                {monthFormatter.format(viewDate)}
              </span>
              <button
                type="button"
                onClick={() => goToMonth(1)}
                className="flex size-7 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((w) => (
                <div
                  key={w}
                  className="flex h-7 items-center justify-center text-[11px] font-medium text-zinc-500"
                >
                  {w}
                </div>
              ))}
            </div>

            <div
              className="grid grid-cols-7 gap-1"
              onMouseLeave={() => setHovered(null)}
            >
              {cells.map((date, i) => {
                if (!date) return <div key={i} className="size-8" />;

                const iso = toISODate(date);
                const disabled = startOfDay(date) < today;
                const isStart = rangeAnchor && isSameDay(date, rangeAnchor);
                const isEnd = effectiveEnd && isSameDay(date, effectiveEnd);
                const inRange = isInRange(date);
                const isToday = isSameDay(date, today);
                const isBusy = busy.has(iso);

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onMouseEnter={() => setHovered(date)}
                    onClick={() => handleDayClick(date)}
                    title={isBusy ? "Čiastočne obsadené" : undefined}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-lg text-sm transition-colors",
                      disabled && "cursor-not-allowed text-zinc-600 opacity-40",
                      !disabled &&
                        !isStart &&
                        !isEnd &&
                        !inRange &&
                        !isBusy &&
                        "text-zinc-200 hover:bg-white/10",
                      isBusy &&
                        !isStart &&
                        !isEnd &&
                        "bg-red-500/20 text-red-200 hover:bg-red-500/30",
                      inRange && "rounded-none bg-primary/15 text-violet-200",
                      (isStart || isEnd) &&
                        "bg-primary text-white shadow-[0_4px_16px_-4px_oklch(0.6_0.26_295)]",
                      isToday &&
                        !isStart &&
                        !isEnd &&
                        "font-semibold text-primary"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            {start && end && (
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3 flex h-9 w-full items-center justify-center rounded-xl bg-violet-500/20 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-500/30"
              >
                Potvrdiť výber
              </button>
            )}
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
