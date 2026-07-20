/**
 * Google Maps share / place links accepted in DJ profiles.
 * Empty string is allowed (clears the field).
 */
export const GOOGLE_MAPS_URL_ERROR =
  "Prosím, vložte validný odkaz na Google Maps (napr. https://maps.app.goo.gl/...)";

/** Must start with maps.app.goo.gl/ or www.google.com/maps/ */
export const GOOGLE_MAPS_URL_REGEX =
  /^https:\/\/(maps\.app\.goo\.gl\/|www\.google\.com\/maps\/)/i;

export function normalizeGoogleMapsUrl(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function isValidGoogleMapsUrl(value: string | null | undefined) {
  const trimmed = normalizeGoogleMapsUrl(value);
  if (!trimmed) return true;
  return GOOGLE_MAPS_URL_REGEX.test(trimmed);
}
