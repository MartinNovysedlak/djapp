"use client";

import { useRef } from "react";
import { CalendarDays } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type DatePickerFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  min?: string;
  className?: string;
};

/** Native date picker with calendar affordance (no free-text typing). */
export function DatePickerField({
  id,
  label,
  value,
  onChange,
  required,
  min,
  className,
}: DatePickerFieldProps) {
  const ref = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.showPicker?.();
    } catch {
      el.focus();
      el.click();
    }
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <input
          ref={ref}
          id={id}
          type="date"
          required={required}
          min={min}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={openPicker}
          onClick={openPicker}
          className={cn(
            "h-10 w-full rounded-xl border border-input bg-transparent px-3 pr-10 text-sm text-foreground outline-none transition-colors",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "dark:bg-input/30",
            "[&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={openPicker}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-violet-300"
          aria-hidden
        >
          <CalendarDays className="size-4" />
        </button>
      </div>
    </div>
  );
}
