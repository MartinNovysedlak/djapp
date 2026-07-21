import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createSSRClient } from "@/utils/supabase/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    const ssr = await createSSRClient();
    const { data: authData } = await ssr.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Nie si prihlásený." }, { status: 401 });
    }

    const formData = await request.formData();
    const bookingId = String(formData.get("bookingId") || "").trim();
    const file = formData.get("file") as File | null;

    if (!bookingId || !file) {
      return NextResponse.json(
        { error: "Chýba rezervácia alebo súbor." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Povolené sú len JPEG, PNG, WebP a GIF." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Fotka môže mať maximálne 2 MB." },
        { status: 400 }
      );
    }

    const { data: booking } = await ssr
      .from("bookings")
      .select("id, status, dj_id, client_id")
      .eq("id", bookingId)
      .maybeSingle();

    if (
      !booking ||
      (booking.status !== "pending" && booking.status !== "accepted")
    ) {
      return NextResponse.json(
        { error: "Chat pre túto rezerváciu nie je dostupný." },
        { status: 403 }
      );
    }

    const isParty =
      booking.dj_id === authData.user.id ||
      booking.client_id === authData.user.id;
    if (!isParty) {
      return NextResponse.json({ error: "Nemáš prístup." }, { status: 403 });
    }

    const ext =
      file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : file.type === "image/gif"
            ? "gif"
            : "jpg";
    const path = `${bookingId}/${authData.user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const admin = adminClient();
    const { error: uploadError } = await admin.storage
      .from("chat-attachments")
      .upload(path, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: signed } = await admin.storage
      .from("chat-attachments")
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({
      path,
      mime: file.type,
      url: signed?.signedUrl ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload zlyhal";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
