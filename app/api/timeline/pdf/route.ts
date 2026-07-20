import { NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { formatTimelineTimeRange, sortTimelineItems } from "@/lib/timeline/sort";
import {
  getTimelineEnergyLabel,
  getTimelineStartModeLabel,
  getTimelineTypeMeta,
  type TimelineItem,
} from "@/lib/timeline/types";
import { formatEventTypeLabel } from "@/lib/event-types";
import {
  TimelinePdfDocument,
  type TimelinePdfData,
} from "@/lib/timeline/pdf-document";

export const runtime = "nodejs";

type Body = {
  bookingId?: string;
};

function formatDateSk(iso: string | null | undefined) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("sk-SK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatDateRangeSk(start: string, end: string | null) {
  if (!end || end === start) return formatDateSk(start);
  return `${formatDateSk(start)} – ${formatDateSk(end)}`;
}

function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/**
 * Generates a DJ cue-sheet PDF for an accepted booking owned by the DJ.
 */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Neplatná požiadavka." }, { status: 400 });
  }

  const bookingId = body.bookingId?.trim();
  if (!bookingId) {
    return NextResponse.json({ error: "Chýba bookingId." }, { status: 400 });
  }

  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Musíš byť prihlásený." }, { status: 401 });
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "id, dj_id, status, client_name, event_type, event_date, end_date, event_location"
      )
      .eq("id", bookingId)
      .eq("dj_id", authData.user.id)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: "Rezervácia sa nenašla." },
        { status: 404 }
      );
    }

    if (booking.status !== "accepted") {
      return NextResponse.json(
        { error: "PDF export je dostupný len pri potvrdenej rezervácii." },
        { status: 400 }
      );
    }

    const { data: rows, error: timelineError } = await supabase
      .from("booking_timeline")
      .select(
        "id, booking_id, added_by, event_time, end_time, duration_minutes, item_type, title, notes, song_title, song_artist, tech_notes, energy, start_mode, start_detail, is_critical, sort_order, is_done, created_at, updated_at"
      )
      .eq("booking_id", bookingId)
      .order("sort_order", { ascending: true });

    if (timelineError) {
      console.error("[timeline/pdf]", timelineError);
      return NextResponse.json(
        { error: "Harmonogram sa nepodarilo načítať." },
        { status: 500 }
      );
    }

    const items = sortTimelineItems((rows ?? []) as TimelineItem[]);

    const pdfData: TimelinePdfData = {
      clientName: booking.client_name?.trim() || "Klient",
      eventType: formatEventTypeLabel(booking.event_type),
      eventDateLabel: formatDateRangeSk(
        booking.event_date,
        booking.end_date
      ),
      eventLocation: booking.event_location?.trim() || null,
      items: items.map((row) => {
        const songLabel =
          row.song_title && row.song_artist
            ? `${row.song_title} — ${row.song_artist}`
            : row.song_title || null;
        const startLabel = getTimelineStartModeLabel(row.start_mode);
        const startDetail = row.start_detail
          ? row.start_mode === "on_word"
            ? `Slovo: „${row.start_detail}"`
            : row.start_mode === "on_signal"
              ? `Znamenie: ${row.start_detail}`
              : row.start_detail
          : startLabel;
        return {
          timeLabel: formatTimelineTimeRange(row.event_time, row.end_time),
          typeLabel: getTimelineTypeMeta(row.item_type).label,
          title: row.title,
          notes: row.notes,
          songLabel,
          techNotes: row.tech_notes,
          energyLabel: getTimelineEnergyLabel(row.energy),
          startLabel,
          startDetail,
          durationLabel: row.duration_minutes
            ? `~${row.duration_minutes} min`
            : null,
          isCritical: row.is_critical,
          itemType: row.item_type,
        };
      }),
    };

    const pdfBuffer = await renderToBuffer(
      React.createElement(TimelinePdfDocument, { data: pdfData })
    );

    const fileName = `program-${safeFileName(pdfData.clientName) || "akcia"}.pdf`;

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("[timeline/pdf]", err);
    return NextResponse.json(
      { error: "PDF sa nepodarilo vygenerovať." },
      { status: 500 }
    );
  }
}
