import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Deletes booking chat messages older than 365 days (and their attachments).
 * Auth: Authorization Bearer CRON_SECRET (same as other crons).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization");
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      return NextResponse.json(
        { error: "Missing Supabase env" },
        { status: 500 }
      );
    }

    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cutoff = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: old, error: selectError } = await admin
      .from("booking_messages")
      .select("id, attachment_path")
      .lt("created_at", cutoff)
      .limit(500);

    if (selectError) {
      return NextResponse.json({ error: selectError.message }, { status: 500 });
    }

    const rows = old ?? [];
    const paths = rows
      .map((r) => r.attachment_path)
      .filter((p): p is string => Boolean(p));

    if (paths.length > 0) {
      await admin.storage.from("chat-attachments").remove(paths);
    }

    const ids = rows.map((r) => r.id);
    let deleted = 0;
    if (ids.length > 0) {
      const { error: delError, count } = await admin
        .from("booking_messages")
        .delete({ count: "exact" })
        .in("id", ids);
      if (delError) {
        return NextResponse.json({ error: delError.message }, { status: 500 });
      }
      deleted = count ?? ids.length;
    }

    return NextResponse.json({
      status: "ok",
      deleted,
      attachmentsRemoved: paths.length,
      cutoff,
    });
  } catch (err) {
    console.error("[cron/purge-chat]", err);
    return NextResponse.json(
      {
        status: "error",
        message: err instanceof Error ? err.message : "Purge failed",
      },
      { status: 500 }
    );
  }
}
