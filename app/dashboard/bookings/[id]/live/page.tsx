import { createClient } from "@/utils/supabase/server";
import { LiveBooth } from "@/components/live/LiveBooth";
import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function BookingLivePage({ params }: PageProps) {
  const { id } = await params;
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

  return <LiveBooth bookingId={booking.id} eventLabel={eventLabel} />;
}
