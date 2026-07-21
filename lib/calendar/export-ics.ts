import { createHash, randomBytes } from "crypto";
import ical, { ICalCalendarMethod, ICalEventStatus } from "ical-generator";
import { formatEventTypeLabel } from "@/lib/event-types";
import { normalizeTime } from "@/lib/dates";

export type ExportableBooking = {
  id: string;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  event_type: string | null;
  event_location: string | null;
  client_name: string | null;
  title: string | null;
  type: string | null;
  all_day: boolean | null;
  message: string | null;
};

function siteBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
}

function toLocalDate(isoDate: string, timeHHmm: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const [hh, mm] = normalizeTime(timeHHmm).split(":").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0, 0);
}

/** Next calendar day at local midnight — exclusive end for all-day ICS events. */
function nextDayLocal(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, (d ?? 1) + 1, 0, 0, 0, 0);
}

export function buildEventSummary(booking: ExportableBooking) {
  if (booking.type === "blockout") {
    return booking.title?.trim() || "Nedostupnosť";
  }

  const typeLabel = formatEventTypeLabel(booking.event_type, "Akcia");
  const who =
    booking.title?.trim() ||
    booking.client_name?.trim() ||
    null;

  return who ? `${typeLabel} - ${who}` : typeLabel;
}

export function generateCalendarExportToken() {
  return randomBytes(24).toString("hex");
}

/**
 * Builds a VCALENDAR feed of accepted bookings + blockouts for a DJ.
 * Status "accepted" is the app equivalent of "confirmed".
 */
export function buildDjCalendarIcs(
  bookings: ExportableBooking[],
  options: { djName?: string | null; calendarName?: string } = {}
) {
  const cal = ical({
    name: options.calendarName || `${options.djName || "Umelec"} – BookTheVibe`,
    prodId: { company: "BookTheVibe", product: "Calendar Sync" },
    method: ICalCalendarMethod.PUBLISH,
    timezone: "Europe/Bratislava",
  });

  const base = siteBaseUrl();

  for (const booking of bookings) {
    const endDate = booking.end_date || booking.event_date;
    const allDay = Boolean(booking.all_day) || booking.type === "blockout";
    const summary = buildEventSummary(booking);
    const detailUrl = `${base}/dashboard/bookings?id=${booking.id}`;
    const descriptionParts = [
      booking.message?.trim() || null,
      `Detail akcie: ${detailUrl}`,
    ].filter(Boolean);

    const uid = createHash("sha256")
      .update(`dj-app-booking-${booking.id}`)
      .digest("hex")
      .slice(0, 32);

    if (allDay) {
      cal.createEvent({
        id: uid,
        start: toLocalDate(booking.event_date, "00:00"),
        end: nextDayLocal(endDate),
        allDay: true,
        floating: true,
        summary,
        description: descriptionParts.join("\n\n"),
        location: booking.event_location?.trim() || undefined,
        url: detailUrl,
        status: ICalEventStatus.CONFIRMED,
      });
      continue;
    }

    cal.createEvent({
      id: uid,
      start: toLocalDate(
        booking.event_date,
        normalizeTime(booking.start_time, "18:00")
      ),
      end: toLocalDate(endDate, normalizeTime(booking.end_time, "23:00")),
      floating: true,
      summary,
      description: descriptionParts.join("\n\n"),
      location: booking.event_location?.trim() || undefined,
      url: detailUrl,
      status: ICalEventStatus.CONFIRMED,
    });
  }

  return cal.toString();
}

export function calendarExportUrl(token: string) {
  return `${siteBaseUrl()}/api/calendar/export/${token}.ics`;
}

export function isValidExternalIcsUrl(raw: string | null | undefined) {
  if (!raw?.trim()) return true;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "https:" && url.protocol !== "http:") return false;
    const path = url.pathname.toLowerCase();
    return (
      path.endsWith(".ics") ||
      path.includes("/ical/") ||
      path.includes("calendar") ||
      url.hostname.includes("google") ||
      url.hostname.includes("icloud") ||
      url.hostname.includes("outlook") ||
      url.hostname.includes("live.com")
    );
  } catch {
    return false;
  }
}
