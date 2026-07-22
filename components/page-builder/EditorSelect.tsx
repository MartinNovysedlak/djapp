"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const triggerClass =
  "h-9 w-full min-w-0 justify-between gap-2 rounded-xl border border-white/10 bg-black/40 pl-3 pr-2.5 text-sm text-white shadow-none hover:bg-black/55 focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20 dark:bg-black/40 dark:hover:bg-black/55 [&_svg]:text-zinc-400";

export function EditorSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
}) {
  const selected = options.find((o) => o.value === value);

  return (
    <div className={cn("space-y-1", className)}>
      {label ? (
        <Label className="text-[11px] text-zinc-500">{label}</Label>
      ) : null}
      <Select
        value={value}
        onValueChange={(next) => {
          if (typeof next === "string") onChange(next as T);
        }}
      >
        <SelectTrigger className={triggerClass}>
          <SelectValue placeholder="Vyber…">
            {selected?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start" sideOffset={6} className="z-[300]">
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
