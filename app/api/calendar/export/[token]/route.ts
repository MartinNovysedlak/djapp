import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  buildDjCalendarIcs,
  type ExportableBooking,
} from "@/lib/calendar/export-ics";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Chýbajú Supabase serverové premenné prostredia.");
  }
  return createServiceClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function normalizeToken(raw: string) {
  return decodeURIComponent(raw).replace(/\.ics$/i, "").trim();
}

/**
 * Public ICS feed: /api/calendar/export/{secret_token}.ics
 * Includes accepted (confirmed) bookings + blockouts for the DJ.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token: rawToken } = await context.params;
    const token = normalizeToken(rawToken);

    if (!token || token.length < 16) {
      return new NextResponse("Not found", { status: 404 });
    }

    const admin = getAdminClient();
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .eq("calendar_export_token", token)
      .maybeSingle();

    if (profileError || !profile || profile.role === "client") {
      return new NextResponse("Not found", { status: 404 });
    }

    const { data: bookings, error: bookingsError } = await admin
      .from("bookings")
      .select(
        "id, event_date, end_date, start_time, end_time, event_type, event_location, client_name, title, type, all_day, message, status"
      )
      .eq("dj_id", profile.id)
      .or("status.eq.accepted,type.eq.blockout")
      .order("event_date", { ascending: true });

    if (bookingsError) {
      console.error("[calendar export]", bookingsError);
      return new NextResponse("Error generating calendar", { status: 500 });
    }

    const ics = buildDjCalendarIcs(
      (bookings ?? []) as ExportableBooking[],
      {
        djName: profile.full_name,
        calendarName: `${profile.full_name || "DJ"} – DJ App`,
      }
    );

    return new NextResponse(ics, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="dj-app-${token.slice(0, 8)}.ics"`,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    console.error("[calendar export]", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
