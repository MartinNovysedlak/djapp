"use client";

import * as React from "react";
import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import { Check, ChevronDown, Search, MapPin, Plus } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Optional secondary line shown under the label (e.g. region/kraj). */
  hint?: string;
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

type ComboboxProps = {
  options: ComboboxOption[];
  value: string | null;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  /**
   * When true, lets the user commit whatever they typed even if it doesn't
   * match any option in the list — useful for specific venues (hotels,
   * small villages, …) that aren't part of the curated city list.
   */
  creatable?: boolean;
  createLabel?: (query: string) => string;
};

/**
 * Searchable, keyboard-friendly select — normally forces the user to pick
 * from a known list of options (used for city selection), but can optionally
 * accept a free-typed custom value (`creatable`) for specific venues.
 */
export function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Vyber…",
  searchPlaceholder = "Hľadať…",
  emptyText = "Nič sa nenašlo.",
  disabled = false,
  className,
  icon,
  creatable = false,
  createLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fall back to showing the raw value as the label when it's a custom,
  // free-typed entry that isn't part of the curated options list.
  const selected = options.find((o) => o.value === value) ?? null;
  const displayLabel = selected?.label ?? (creatable ? value : null);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return options;
    const q = normalize(query);
    return options.filter(
      (o) =>
        normalize(o.label).includes(q) ||
        (o.hint ? normalize(o.hint).includes(q) : false)
    );
  }, [options, query]);

  const trimmedQuery = query.trim();
  const hasExactMatch = React.useMemo(
    () =>
      trimmedQuery.length > 0 &&
      options.some((o) => normalize(o.label) === normalize(trimmedQuery)),
    [options, trimmedQuery]
  );
  const showCreateOption = creatable && trimmedQuery.length > 0 && !hasExactMatch;

  return (
    <PopoverPrimitive.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setQuery("");
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }}
    >
      <PopoverPrimitive.Trigger
        disabled={disabled}
        className={cn(
          "flex h-11 w-full items-center gap-2 rounded-xl border border-input bg-transparent px-3 text-left text-sm transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
      >
        <span className="shrink-0 text-muted-foreground/70">
          {icon ?? <MapPin className="size-4" />}
        </span>
        <span
          className={cn(
            "flex-1 truncate",
            !displayLabel && "text-muted-foreground"
          )}
        >
          {displayLabel || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground/60" />
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          side="bottom"
          align="start"
          sideOffset={6}
          className="isolate z-50"
        >
          <PopoverPrimitive.Popup className="w-(--anchor-width) min-w-64 origin-(--transform-origin) overflow-hidden rounded-xl border border-white/10 bg-black/90 text-popover-foreground shadow-2xl backdrop-blur-xl duration-100 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            <div className="flex items-center gap-2 border-b border-white/10 px-3">
              <Search className="size-3.5 shrink-0 text-muted-foreground/60" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <div className="max-h-64 overflow-y-auto p-1">
              {showCreateOption && (
                <button
                  type="button"
                  onClick={() => {
                    onValueChange(trimmedQuery);
                    setOpen(false);
                  }}
                  className="mb-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-violet-500/30 bg-violet-500/10 px-2.5 py-2 text-left text-sm text-violet-200 outline-none transition-colors hover:bg-violet-500/15"
                >
                  <Plus className="size-3.5 shrink-0" />
                  <span className="flex-1 truncate">
                    {createLabel
                      ? createLabel(trimmedQuery)
                      : `Použiť „${trimmedQuery}“`}
                  </span>
                </button>
              )}

              {filtered.length === 0 && !showCreateOption ? (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground/70">
                  {emptyText}
                </p>
              ) : (
                filtered.map((option) => {
                  const isSelected = option.value === value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        onValueChange(option.value);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm outline-none transition-colors",
                        isSelected
                          ? "bg-primary/10 text-primary"
                          : "text-zinc-200 hover:bg-white/5"
                      )}
                    >
                      <span className="flex-1 truncate">
                        {option.label}
                        {option.hint && (
                          <span className="ml-1.5 text-xs text-muted-foreground/60">
                            {option.hint}
                          </span>
                        )}
                      </span>
                      {isSelected && (
                        <Check className="size-4 shrink-0 text-primary" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverPrimitive.Popup>
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
