import { createClient as createServiceClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendGoogleReviewRequestEmail } from "@/lib/email";
import { isValidGoogleReviewLink } from "@/lib/google-review";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

/** YYYY-MM-DD in Europe/Bratislava. */
function bratislavaIsoDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Bratislava",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Subtract calendar days from an ISO date string (local arithmetic). */
function shiftIsoDate(iso: string, deltaDays: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function authorizeCron(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    // Allow in local/dev without secret; require in production.
    if (process.env.NODE_ENV === "production") {
      return false;
    }
    return true;
  }
  const auth = request.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

type CandidateRow = {
  id: string;
  client_name: string | null;
  client_email: string | null;
  event_type: string | null;
  event_date: string;
  end_date: string | null;
  dj_id: string;
};

/**
 * Daily cron: thank clients 1–2 days after an accepted gig and ask for a Google review.
 * Schedule: vercel.json → every day 08:00 UTC (~10:00 Europe/Bratislava in summer).
 */
export async function GET(request: Request) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = getAdminClient();
    const today = bratislavaIsoDate();
    // Event ended 1 or 2 days ago (inclusive window).
    const fromDate = shiftIsoDate(today, -2);
    const toDate = shiftIsoDate(today, -1);

    const { data: bookings, error } = await admin
      .from("bookings")
      .select(
        "id, client_name, client_email, event_type, event_date, end_date, dj_id"
      )
      .eq("status", "accepted")
      .eq("type", "booking")
      .eq("review_email_sent", false)
      .not("client_email", "is", null);

    if (error) {
      console.error("[cron/send-reviews] query", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const candidates = ((bookings ?? []) as CandidateRow[]).filter((row) => {
      const lastDay = row.end_date || row.event_date;
      return lastDay >= fromDate && lastDay <= toDate && Boolean(row.client_email?.trim());
    });

    if (candidates.length === 0) {
      return NextResponse.json({
        ok: true,
        sent: 0,
        skipped: 0,
        window: { fromDate, toDate, today },
      });
    }

    const djIds = [...new Set(candidates.map((c) => c.dj_id))];
    const { data: profiles, error: profilesError } = await admin
      .from("profiles")
      .select("id, full_name, google_review_link")
      .in("id", djIds);

    if (profilesError) {
      console.error("[cron/send-reviews] profiles", profilesError);
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    const profileById = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        {
          full_name: p.full_name as string | null,
          google_review_link: p.google_review_link as string | null,
        },
      ])
    );

    // Resolve DJ auth emails for Reply-To (only DJs that will send)
    const emailByUserId = new Map<string, string>();
    const djsWithLink = djIds.filter((id) => {
      const link = profileById.get(id)?.google_review_link?.trim();
      return Boolean(link && isValidGoogleReviewLink(link));
    });
    await Promise.all(
      djsWithLink.map(async (djId) => {
        try {
          const { data } = await admin.auth.admin.getUserById(djId);
          if (data.user?.email) emailByUserId.set(djId, data.user.email);
        } catch (err) {
          console.warn("[cron/send-reviews] getUserById", djId, err);
        }
      })
    );
    let sent = 0;
    let skipped = 0;
    const errors: { bookingId: string; error: string }[] = [];

    for (const booking of candidates) {
      const profile = profileById.get(booking.dj_id);
      const reviewUrl = profile?.google_review_link?.trim() || "";

      if (!reviewUrl || !isValidGoogleReviewLink(reviewUrl)) {
        skipped += 1;
        continue;
      }

      const clientEmail = booking.client_email!.trim();
      const result = await sendGoogleReviewRequestEmail({
        clientEmail,
        clientName: booking.client_name,
        djName: profile?.full_name,
        djEmail: emailByUserId.get(booking.dj_id) ?? null,
        eventType: booking.event_type || "akcia",
        eventDate: booking.end_date || booking.event_date,
        reviewUrl,
      });

      if (!result.ok) {
        errors.push({
          bookingId: booking.id,
          error: result.error || "send failed",
        });
        continue;
      }

      const { error: updateError } = await admin
        .from("bookings")
        .update({ review_email_sent: true })
        .eq("id", booking.id)
        .eq("review_email_sent", false);

      if (updateError) {
        errors.push({ bookingId: booking.id, error: updateError.message });
        continue;
      }

      sent += 1;
    }

    return NextResponse.json({
      ok: true,
      sent,
      skipped,
      failed: errors.length,
      errors: errors.length ? errors : undefined,
      window: { fromDate, toDate, today },
    });
  } catch (err) {
    console.error("[cron/send-reviews]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
