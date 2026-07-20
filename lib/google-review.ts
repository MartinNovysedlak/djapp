/**
 * Google Business Profile / write-a-review short links.
 * Empty string clears the field.
 */
export const GOOGLE_REVIEW_LINK_ERROR =
  "Vlož platný Google odkaz na recenzie (g.page, search.google.com/local/writereview, maps.app.goo.gl alebo google.com/maps).";

/** Accepted Google review / Maps share hosts. */
export const GOOGLE_REVIEW_LINK_REGEX =
  /^https:\/\/((g\.page\/)|(search\.google\.com\/local\/writereview)|(maps\.app\.goo\.gl\/)|(www\.google\.com\/maps\/)|(google\.com\/maps\/))/i;

export function normalizeGoogleReviewLink(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function isValidGoogleReviewLink(value: string | null | undefined) {
  const trimmed = normalizeGoogleReviewLink(value);
  if (!trimmed) return true;
  return GOOGLE_REVIEW_LINK_REGEX.test(trimmed);
}
