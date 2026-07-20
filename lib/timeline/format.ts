/** Format Postgres TIME / "HH:MM:SS" → "HH:MM" for UI and PDF. */
export function formatTimelineTime(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).slice(0, 5);
}
