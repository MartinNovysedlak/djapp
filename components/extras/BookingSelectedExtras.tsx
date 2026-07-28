"use client";

import { Check, Sparkles } from "lucide-react";
import type { BookingExtraSummary } from "@/app/actions/extras";
import { cn } from "@/lib/utils";

type BookingSelectedExtrasProps = {
  items: BookingExtraSummary[];
  /** Compact chips for collapsed booking row. */
  variant?: "chips" | "panel";
  className?: string;
};

/** Always-visible selected extras so DJ does not dig into an accordion. */
export function BookingSelectedExtras({
  items,
  variant = "panel",
  className,
}: BookingSelectedExtrasProps) {
  if (items.length === 0) return null;

  if (variant === "chips") {
    return (
      <div
        className={cn(
          "mt-1.5 flex flex-wrap items-center gap-1.5",
          className
        )}
      >
        <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/30 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-200">
          <Sparkles className="size-2.5" />
          Ponuka
        </span>
        {items.map((item) => (
          <span
            key={item.id}
            className="max-w-[10rem] truncate rounded-full border border-fuchsia-500/20 bg-fuchsia-500/[0.08] px-2 py-0.5 text-[10px] font-medium text-fuchsia-100/90"
            title={item.description ?? item.title}
          >
            {item.title}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-2xl border border-fuchsia-500/25 bg-gradient-to-br from-fuchsia-500/[0.12] to-transparent px-4 py-3.5",
        className
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10">
          <Sparkles className="size-3.5 text-fuchsia-300" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">
            Klient chce zo špeciálnej ponuky
          </p>
          <p className="text-[11px] text-fuchsia-200/70">
            {items.length}{" "}
            {items.length === 1
              ? "položka"
              : items.length < 5
                ? "položky"
                : "položiek"}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-2.5 rounded-xl border border-fuchsia-500/15 bg-black/25 px-3 py-2.5"
          >
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/10 text-fuchsia-200">
              <Check className="size-3" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-[11px] leading-relaxed text-zinc-500">
                  {item.description}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
