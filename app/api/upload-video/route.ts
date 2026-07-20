import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_SIZE = 50 * 1024 * 1024; // 50 MB
const BUCKET = "dj-media";

/**
 * Uploads a single DJ showreel video into the public `dj-media` bucket
 * under `{userId}/videos/…`.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const file = formData.get("file") as File | null;

    if (!userId || !file) {
      return NextResponse.json(
        { error: "Missing userId or file" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Podporované formáty: MP4, WebM, MOV." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Video je príliš veľké (max 50 MB)." },
        { status: 400 }
      );
    }

    const fileExt =
      file.name.split(".").pop()?.toLowerCase() ||
      (file.type === "video/webm" ? "webm" : "mp4");
    const fileName = `${userId}/videos/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${fileExt}`;

    const buffer = new Uint8Array(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Deletes an uploaded video from `dj-media` given its public URL. */
export async function DELETE(request: Request) {
  try {
    const { url, userId } = (await request.json()) as {
      url?: string;
      userId?: string;
    };
    if (!url || !userId) {
      return NextResponse.json(
        { error: "Missing url or userId" },
        { status: 400 }
      );
    }

    const marker = `/storage/v1/object/public/${BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    const path = decodeURIComponent(url.slice(idx + marker.length));

    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
