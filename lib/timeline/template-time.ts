/** Helpers for program template offsets vs wall-clock times. */

export function parseTimeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (h > 23 || m > 59) return null;
  return h * 60 + m;
}

export function minutesToTime(totalMinutes: number): string {
  let total = Math.round(totalMinutes);
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatOffsetLabel(offsetMinutes: number | null | undefined): string {
  if (offsetMinutes == null) return "bez času";
  const h = Math.floor(offsetMinutes / 60);
  const m = offsetMinutes % 60;
  if (h > 0 && m > 0) return `+${h} h ${m} min`;
  if (h > 0) return `+${h} h`;
  return `+${m} min`;
}

export function splitOffset(offsetMinutes: number | null | undefined): {
  hours: string;
  minutes: string;
} {
  if (offsetMinutes == null) return { hours: "", minutes: "" };
  return {
    hours: String(Math.floor(offsetMinutes / 60)),
    minutes: String(offsetMinutes % 60),
  };
}

export function combineOffsetHoursMinutes(
  hoursRaw: string,
  minutesRaw: string
): number | null {
  const hoursEmpty = !hoursRaw.trim();
  const minutesEmpty = !minutesRaw.trim();
  if (hoursEmpty && minutesEmpty) return null;
  const h = hoursEmpty ? 0 : Number(hoursRaw);
  const m = minutesEmpty ? 0 : Number(minutesRaw);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  if (h < 0 || m < 0 || m > 59) return null;
  const total = Math.round(h) * 60 + Math.round(m);
  if (total < 0 || total > 1440 * 3) return null;
  return total;
}

/** Wall-clock time from template reference start + offset. */
export function absoluteFromOffset(
  referenceStart: string,
  offsetMinutes: number | null
): string {
  if (offsetMinutes == null) return "";
  const base = parseTimeToMinutes(referenceStart) ?? 16 * 60;
  return minutesToTime(base + offsetMinutes);
}

/** Offset minutes from wall-clock time vs template reference start (same-day, wraps). */
export function offsetFromAbsolute(
  referenceStart: string,
  absoluteTime: string
): number | null {
  const base = parseTimeToMinutes(referenceStart);
  const abs = parseTimeToMinutes(absoluteTime);
  if (base == null || abs == null) return null;
  let diff = abs - base;
  if (diff < 0) diff += 24 * 60;
  if (diff > 1440 * 3) return null;
  return diff;
}

export function normalizeReferenceStart(value: string | null | undefined): string {
  const mins = parseTimeToMinutes(value);
  if (mins == null) return "16:00";
  return minutesToTime(mins);
}
