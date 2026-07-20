import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { normalizeTime } from "@/lib/dates";
import { fetchExternalBusySlots } from "@/lib/calendar/import-ics";

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

export type AvailabilitySlot = {
  event_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  all_day: boolean;
  title: string | null;
  event_type: string | null;
  entry_type: "booking" | "blockout" | "external";
  source: "app" | "external";
};

/**
 * Combined busy slots for a DJ: accepted bookings/blockouts + external ICS (cached 1h).
 * Used by the client booking form and public availability calendar.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ djId: string }> }
) {
  try {
    const { djId } = await context.params;
    if (!djId) {
      return NextResponse.json({ error: "Missing djId" }, { status: 400 });
    }

    const admin = getAdminClient();

    const [busyRes, profileRes] = await Promise.all([
      admin
        .from("bookings")
        .select(
          "event_date, end_date, start_time, end_time, event_type, type, title, all_day"
        )
        .eq("dj_id", djId)
        .or("status.eq.accepted,type.eq.blockout"),
      admin
        .from("profiles")
        .select("external_calendar_url")
        .eq("id", djId)
        .maybeSingle(),
    ]);

    if (busyRes.error) {
      console.error("[availability]", busyRes.error);
      return NextResponse.json({ error: "DB error" }, { status: 500 });
    }

    const slots: AvailabilitySlot[] = (
      (busyRes.data ?? []) as {
        event_date: string;
        end_date: string | null;
        start_time: string;
        end_time: string;
        event_type: string | null;
        type: string | null;
        title: string | null;
        all_day: boolean | null;
      }[]
    ).map((row) => ({
      event_date: row.event_date,
      end_date: row.end_date || row.event_date,
      start_time: normalizeTime(row.start_time, "00:00"),
      end_time: normalizeTime(row.end_time, "23:59"),
      all_day: Boolean(row.all_day),
      title: row.title,
      event_type: row.event_type,
      entry_type: row.type === "blockout" ? "blockout" : "booking",
      source: "app" as const,
    }));

    const icsUrl = profileRes.data?.external_calendar_url as string | null;
    if (icsUrl?.trim()) {
      const external = await fetchExternalBusySlots(icsUrl);
      for (const slot of external) {
        slots.push({
          event_date: slot.event_date,
          end_date: slot.end_date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          all_day: slot.all_day,
          title: slot.title,
          event_type: null,
          entry_type: "external",
          source: "external",
        });
      }
    }

    return NextResponse.json(
      { slots },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (err) {
    console.error("[availability]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
