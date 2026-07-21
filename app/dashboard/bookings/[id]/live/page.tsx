import { createClient } from "@/utils/supabase/server";
import { LiveBooth } from "@/components/live/LiveBooth";
import { redirect } from "next/navigation";
import {
  BOOKINGS_FROM_PARAM,
  isBookingsTab,
  type BookingsTab,
} from "@/lib/bookings-nav";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function isPastEventDate(eventDate: string | null | undefined) {
  if (!eventDate) return false;
  const [y, m, d] = eventDate.split("-").map(Number);
  const end = new Date(y, (m ?? 1) - 1, d ?? 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return end < today;
}

function returnTabForBooking(opts: {
  status: string;
  eventDate: string | null;
  fromParam: string | null;
}): BookingsTab {
  if (isBookingsTab(opts.fromParam)) return opts.fromParam;
  if (opts.status === "pending") return "new";
  if (opts.status === "accepted" && !isPastEventDate(opts.eventDate)) {
    return "confirmed";
  }
  return "history";
}

export default async function BookingLivePage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const sp = await searchParams;
  const fromRaw = sp[BOOKINGS_FROM_PARAM];
  const fromParam = Array.isArray(fromRaw) ? fromRaw[0] ?? null : fromRaw ?? null;

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) redirect("/login");

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, dj_id, event_type, event_date, client_name")
    .eq("id", id)
    .maybeSingle();

  if (!booking || booking.dj_id !== authData.user.id) {
    redirect("/dashboard/bookings");
  }
  if (booking.status !== "accepted") {
    redirect("/dashboard/bookings");
  }

  const eventLabel = [
    booking.client_name,
    booking.event_type,
    booking.event_date
      ? new Date(booking.event_date + "T12:00:00").toLocaleDateString("sk-SK")
      : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const returnTab = returnTabForBooking({
    status: booking.status,
    eventDate: booking.event_date,
    fromParam,
  });

  return (
    <LiveBooth
      bookingId={booking.id}
      eventLabel={eventLabel}
      returnTab={returnTab}
    />
  );
}
