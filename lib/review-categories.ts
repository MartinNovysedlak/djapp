export const REVIEW_CATEGORIES = [
  {
    key: "communication",
    label: "Komunikácia",
    hint: "Odpovedal rýchlo, dohodol sa jasne",
  },
  {
    key: "punctuality",
    label: "Dochvíľnosť",
    hint: "Prišiel / pripravil sa včas",
  },
  {
    key: "performance",
    label: "Výkon / hudba",
    hint: "Kvalita zábavy a výber hudby",
  },
  {
    key: "requests",
    label: "Ochota vyhovieť",
    hint: "Live requesty a špeciálne priania",
  },
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]["key"];

export type CategoryRatings = Record<ReviewCategoryKey, number>;

export const DEFAULT_CATEGORY_RATINGS: CategoryRatings = {
  communication: 5,
  punctuality: 5,
  performance: 5,
  requests: 5,
};

export type StoredCategoryRatings = {
  rating_communication: number | null;
  rating_punctuality: number | null;
  rating_performance: number | null;
  rating_requests: number | null;
};

export function clampRating(value: number): number {
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function averageCategoryRating(ratings: CategoryRatings): number {
  const values = REVIEW_CATEGORIES.map((c) => clampRating(ratings[c.key]));
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

export function hasCategoryRatings(
  r: Partial<StoredCategoryRatings> | null | undefined
): boolean {
  if (!r) return false;
  return (
    r.rating_communication != null ||
    r.rating_punctuality != null ||
    r.rating_performance != null ||
    r.rating_requests != null
  );
}

export function categoryValuesFromRow(
  r: Partial<StoredCategoryRatings>
): { key: ReviewCategoryKey; label: string; value: number }[] {
  return REVIEW_CATEGORIES.map((c) => {
    const col = `rating_${c.key}` as keyof StoredCategoryRatings;
    const raw = r[col];
    return {
      key: c.key,
      label: c.label,
      value: typeof raw === "number" ? raw : 0,
    };
  }).filter((item) => item.value >= 1 && item.value <= 5);
}
