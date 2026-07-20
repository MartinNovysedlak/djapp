import ical from "node-ical";
import {
  combineLocalDateTime,
  normalizeTime,
  rangesOverlap,
} from "@/lib/dates";

export type ExternalBusySlot = {
  event_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  title: string;
  source: "external";
};

type CacheEntry = {
  slots: ExternalBusySlot[];
  fetchedAt: number;
};

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const cache = new Map<string, CacheEntry>();

function toIsoDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toHHmm(d: Date) {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** Inclusive local calendar days covered by [start, end). */
function eachLocalDay(start: Date, endExclusive: Date) {
  const days: string[] = [];
  const cursor = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const last = new Date(
    endExclusive.getFullYear(),
    endExclusive.getMonth(),
    endExclusive.getDate()
  );
  // For timed events ending same day, still include that day
  if (last <= cursor) {
    days.push(toIsoDate(cursor));
    return days;
  }
  while (cursor < last) {
    days.push(toIsoDate(cursor));
    cursor.setDate(cursor.getDate() + 1);
    if (days.length > 366) break;
  }
  return days;
}

/**
 * Parse VEVENT list into busy slots.
 * Blocks any event (especially all-day / "Busy" / transparent=OPAQUE).
 */
export function parseIcsToBusySlots(raw: string): ExternalBusySlot[] {
  const data = ical.sync.parseICS(raw);
  const slots: ExternalBusySlot[] = [];

  for (const item of Object.values(data)) {
    if (!item || typeof item !== "object") continue;
    if ((item as { type?: string }).type !== "VEVENT") continue;

    const ev = item as {
      type: "VEVENT";
      summary?: string | { val?: string };
      start?: Date;
      end?: Date;
      datetype?: string;
      transparency?: string;
      status?: string;
    };

    if (ev.status === "CANCELLED") continue;
    if (!ev.start) continue;

    const titleRaw =
      typeof ev.summary === "string"
        ? ev.summary
        : ev.summary?.val || "Busy";
    const title = titleRaw.trim() || "Busy";

    // Transparent free/busy = free → skip
    if (ev.transparency === "TRANSPARENT") continue;

    const start = new Date(ev.start);
    const end = ev.end ? new Date(ev.end) : new Date(start);

    const isAllDay =
      ev.datetype === "date" ||
      (start.getHours() === 0 &&
        start.getMinutes() === 0 &&
        end.getHours() === 0 &&
        end.getMinutes() === 0 &&
        end.getTime() > start.getTime());

    if (isAllDay) {
      const days = eachLocalDay(start, end);
      for (const day of days) {
        slots.push({
          event_date: day,
          end_date: day,
          start_time: "00:00",
          end_time: "23:59",
          all_day: true,
          title,
          source: "external",
        });
      }
      continue;
    }

    // Timed event — may span midnight
    const startIso = toIsoDate(start);
    const endIso = toIsoDate(end);
    // If ends at midnight of next day, treat end date as previous day end 23:59 for overlap
    const endTime =
      end.getHours() === 0 && end.getMinutes() === 0 && end > start
        ? "23:59"
        : toHHmm(end);
    const adjustedEndDate =
      end.getHours() === 0 && end.getMinutes() === 0 && end > start
        ? toIsoDate(new Date(end.getFullYear(), end.getMonth(), end.getDate() - 1))
        : endIso;

    slots.push({
      event_date: startIso,
      end_date: adjustedEndDate < startIso ? startIso : adjustedEndDate,
      start_time: toHHmm(start),
      end_time: endTime === "00:00" ? "23:59" : endTime,
      all_day: false,
      title,
      source: "external",
    });
  }

  return slots;
}

export async function fetchExternalBusySlots(
  icsUrl: string,
  options: { forceRefresh?: boolean } = {}
): Promise<ExternalBusySlot[]> {
  const url = icsUrl.trim();
  if (!url) return [];

  const cached = cache.get(url);
  const now = Date.now();
  if (
    !options.forceRefresh &&
    cached &&
    now - cached.fetchedAt < CACHE_TTL_MS
  ) {
    return cached.slots;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/calendar, text/plain, */*",
        "User-Agent": "DJ-App-Calendar-Sync/1.0",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.error("[fetchExternalBusySlots] HTTP", res.status, url);
      if (cached) return cached.slots;
      return [];
    }

    const raw = await res.text();
    const slots = parseIcsToBusySlots(raw);
    cache.set(url, { slots, fetchedAt: now });
    return slots;
  } catch (err) {
    console.error("[fetchExternalBusySlots]", err);
    if (cached) return cached.slots;
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

export function invalidateExternalCalendarCache(icsUrl: string | null | undefined) {
  if (!icsUrl?.trim()) return;
  cache.delete(icsUrl.trim());
}

export function externalSlotsOverlap(
  slots: ExternalBusySlot[],
  eventDate: string,
  eventEndDate: string,
  startTime: string,
  endTime: string
) {
  const proposedStart = combineLocalDateTime(
    eventDate,
    normalizeTime(startTime)
  );
  const proposedEnd = combineLocalDateTime(
    eventEndDate,
    normalizeTime(endTime)
  );

  for (const slot of slots) {
    const existingStart = combineLocalDateTime(
      slot.event_date,
      slot.start_time
    );
    const existingEnd = combineLocalDateTime(slot.end_date, slot.end_time);
    if (
      rangesOverlap(proposedStart, proposedEnd, existingStart, existingEnd)
    ) {
      return { conflict: true as const, title: slot.title };
    }
  }

  return { conflict: false as const };
}
