"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

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
const fullFormatter = new Intl.DateTimeFormat("sk-SK", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

type DatePickerProps = {
  value: string; // ISO yyyy-mm-dd
  onChange: (isoDate: string) => void;
  minDate?: Date;
  /** Allow selecting dates before today (e.g. blog publish date). */
  allowPastDates?: boolean;
  /** ISO dates that cannot be selected (full-day blockouts). */
  disabledDates?: ReadonlySet<string> | readonly string[];
  placeholder?: string;
  className?: string;
  label?: React.ReactNode;
};

export function DatePicker({
  value,
  onChange,
  minDate,
  allowPastDates = false,
  disabledDates,
  placeholder = "Vyber dátum akcie",
  className,
  label,
}: DatePickerProps) {
  const blocked =
    disabledDates instanceof Set
      ? disabledDates
      : new Set(disabledDates ?? []);
  const selected = fromISODate(value);
  const today = startOfDay(new Date());
  const floor = startOfDay(
    minDate ?? (allowPastDates ? new Date(2000, 0, 1) : today)
  );

  const [open, setOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(() => selected ?? today);

  React.useEffect(() => {
    if (open) setViewDate(selected ?? today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = React.useMemo(() => {
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // Monday-first index
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, i) => {
      const dayNum = i - startOffset + 1;
      if (dayNum < 1 || dayNum > daysInMonth) return null;
      return new Date(year, month, dayNum);
    });
  }, [year, month]);

  const goToMonth = (delta: number) => {
    setViewDate(new Date(year, month + delta, 1));
  };

  const trigger = (
    <PopoverPrimitive.Trigger
      className={cn(
        "flex h-11 w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-left text-sm transition-colors outline-none select-none",
        "hover:border-violet-500/30 focus-visible:border-violet-500/40 focus-visible:ring-3 focus-visible:ring-violet-500/20",
        className
      )}
    >
      <CalendarDays className="size-4 shrink-0 text-violet-300" />
      <span
        className={cn("flex-1 truncate", !selected && "text-zinc-500")}
      >
        {selected ? fullFormatter.format(selected) : placeholder}
      </span>
    </PopoverPrimitive.Trigger>
  );

  return (
    <div className="space-y-1.5">
      {label ? (
        <div className="text-sm font-medium text-zinc-300">{label}</div>
      ) : null}
      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        {trigger}

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            side="bottom"
            align="start"
            sideOffset={6}
            className="isolate z-[200]"
          >
            <PopoverPrimitive.Popup className="w-72 origin-(--transform-origin) overflow-hidden rounded-2xl border border-white/10 bg-[#121212]/95 p-3 text-popover-foreground shadow-[0_24px_60px_-20px_rgba(0,0,0,0.85)] backdrop-blur-xl duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
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

              <div className="grid grid-cols-7 gap-1">
                {cells.map((date, i) => {
                  if (!date) return <div key={i} className="size-8" />;

                  const iso = toISODate(date);
                  const beforeFloor = startOfDay(date) < floor;
                  const fullyBlocked = blocked.has(iso);
                  const disabled = beforeFloor || fullyBlocked;
                  const isSelected = selected && isSameDay(date, selected);
                  const isToday = isSameDay(date, today);

                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      title={
                        fullyBlocked ? "Celý deň je zablokovaný" : undefined
                      }
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={cn(
                        "relative flex size-8 items-center justify-center rounded-lg text-sm transition-colors",
                        disabled &&
                          "cursor-not-allowed text-zinc-600 opacity-40",
                        fullyBlocked &&
                          !beforeFloor &&
                          "line-through decoration-zinc-500",
                        !disabled &&
                          !isSelected &&
                          "text-zinc-200 hover:bg-violet-500/15",
                        isSelected &&
                          "bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_4px_16px_-4px_oklch(0.6_0.26_295)]",
                        isToday &&
                          !isSelected &&
                          "font-semibold text-violet-300"
                      )}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
