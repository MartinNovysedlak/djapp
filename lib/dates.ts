/**
 * Parse a DATE / `yyyy-mm-dd` string as a local calendar day.
 * Avoids the UTC midnight shift from `new Date("2026-07-16")`.
 */
export function parseLocalDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function todayLocal() {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** True when the event's last day is strictly before today (local). */
export function isPastLocalDate(iso: string) {
  return parseLocalDate(iso) < todayLocal();
}

/** Normalize "HH:MM" or "HH:MM:SS" → "HH:MM". */
export function normalizeTime(value: string | null | undefined, fallback = "18:00") {
  if (!value) return fallback;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  const h = Math.min(23, Math.max(0, Number(match[1])));
  const m = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Combine local date + "HH:MM" into a Date. */
export function combineLocalDateTime(dateIso: string, timeHHmm: string) {
  const [y, m, d] = dateIso.split("-").map(Number);
  const [hh, mm] = normalizeTime(timeHHmm).split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/**
 * Two intervals overlap if each starts before the other ends.
 * Used to block double-booking accepted DJ slots.
 */
export function rangesOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
) {
  return aStart < bEnd && aEnd > bStart;
}

/** Half-hour options from 00:00 to 23:30 for booking forms. */
export function timeOptions(stepMinutes = 30) {
  const out: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    out.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
    );
  }
  return out;
}

export function formatTimeSk(timeHHmm: string | null | undefined) {
  return normalizeTime(timeHHmm, "—");
}
