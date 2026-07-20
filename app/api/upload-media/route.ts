import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 8 * 1024 * 1024; // 8MB per photo
const MAX_FILES = 12;

/**
 * Uploads one or more gallery photos for a DJ's portfolio. Files are stored
 * in the existing public "avatars" bucket under `{userId}/gallery/…`, which
 * is already covered by the bucket's per-user storage RLS policies.
 */
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const userId = formData.get("userId") as string;
    const files = formData.getAll("files") as File[];

    if (!userId || files.length === 0) {
      return NextResponse.json(
        { error: "Missing userId or files" },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Naraz môžeš nahrať max ${MAX_FILES} fotiek` },
        { status: 400 }
      );
    }

    const urls: string[] = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `Nepodporovaný typ súboru: ${file.name}` },
          { status: 400 }
        );
      }
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: `Súbor ${file.name} je príliš veľký (max 8 MB)` },
          { status: 400 }
        );
      }

      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${userId}/gallery/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}.${fileExt}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
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

      const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
      urls.push(data.publicUrl);
    }

    return NextResponse.json({ urls });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Deletes a single gallery photo from storage given its public URL. */
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

    const marker = "/storage/v1/object/public/avatars/";
    const idx = url.indexOf(marker);
    if (idx === -1) {
      return NextResponse.json({ error: "Invalid url" }, { status: 400 });
    }
    const path = decodeURIComponent(url.slice(idx + marker.length));

    if (!path.startsWith(`${userId}/`)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { error } = await supabase.storage.from("avatars").remove([path]);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Delete failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
