import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Vercel Cron keep-alive: tiny Supabase SELECT so a paused free-tier DB
 * wakes up and the inactivity timer resets. Read-only, no auth required.
 * Scheduled in vercel.json → every 6 hours (`0 */6 * * *`).
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
