"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  REVIEW_CATEGORIES,
  type CategoryRatings,
  type ReviewCategoryKey,
  type StoredCategoryRatings,
  categoryValuesFromRow,
  hasCategoryRatings,
} from "@/lib/review-categories";

function StarRow({
  value,
  onChange,
  size = "md",
  interactive = false,
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
  interactive?: boolean;
}) {
  const iconClass = size === "sm" ? "size-3.5" : "size-6";

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= value;
        const starEl = (
          <Star
            className={cn(
              iconClass,
              "transition-colors duration-150",
              filled
                ? "fill-amber-400 text-amber-400"
                : "fill-transparent text-zinc-600"
            )}
          />
        );

        if (!interactive || !onChange) {
          return (
            <span key={star} aria-hidden>
              {starEl}
            </span>
          );
        }

        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform duration-150 hover:scale-110"
            aria-label={`${star} z 5`}
          >
            {starEl}
          </button>
        );
      })}
    </div>
  );
}

export function CategoryRatingInputs({
  values,
  onChange,
}: {
  values: CategoryRatings;
  onChange: (key: ReviewCategoryKey, value: number) => void;
}) {
  return (
    <div className="space-y-3">
      {REVIEW_CATEGORIES.map((cat) => (
        <div
          key={cat.key}
          className="flex flex-col gap-2 rounded-xl border border-white/8 bg-black/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">{cat.label}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{cat.hint}</p>
          </div>
          <StarRow
            value={values[cat.key]}
            onChange={(n) => onChange(cat.key, n)}
            interactive
          />
        </div>
      ))}
    </div>
  );
}

export function CategoryRatingsDisplay({
  ratings,
  className,
}: {
  ratings: Partial<StoredCategoryRatings>;
  className?: string;
}) {
  if (!hasCategoryRatings(ratings)) return null;
  const items = categoryValuesFromRow(ratings);
  if (items.length === 0) return null;

  return (
    <div className={cn("mt-3 space-y-1.5", className)}>
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-2 text-xs"
        >
          <span className="truncate text-zinc-500">{item.label}</span>
          <StarRow value={item.value} size="sm" />
        </div>
      ))}
    </div>
  );
}
