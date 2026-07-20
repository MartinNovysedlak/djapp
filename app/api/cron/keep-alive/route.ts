import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Lightweight health check for UptimeRobot / external pingers.
 * Hits Supabase with a tiny SELECT so a paused free-tier project wakes up
 * and the inactivity timer resets. Safe: read-only, no auth required.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("profiles").select("id").limit(1);

    if (error) {
      return NextResponse.json(
        { status: "error", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[cron/keep-alive]", err);
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Keep-alive failed",
      },
      { status: 500 }
    );
  }
}
