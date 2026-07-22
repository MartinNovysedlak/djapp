import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * Uploads a public cover/banner image for the authenticated DJ.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json(
        { error: "Musíš byť prihlásený." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob) || !("name" in file)) {
      return NextResponse.json({ error: "Chýba súbor." }, { status: 400 });
    }

    const namedFile = file as File;
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(namedFile.type)) {
      return NextResponse.json(
        { error: "Neplatný typ súboru." },
        { status: 400 }
      );
    }

    if (namedFile.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Súbor je príliš veľký (max 8 MB)." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    const fileExt = namedFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${userId}/${Date.now()}-cover.${fileExt}`;

    const arrayBuffer = await namedFile.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const admin = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: uploadError } = await admin.storage
      .from("avatars")
      .upload(fileName, buffer, {
        contentType: namedFile.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const {
      data: { publicUrl },
    } = admin.storage.from("avatars").getPublicUrl(fileName);

    await supabase
      .from("profiles")
      .update({ cover_url: publicUrl })
      .eq("id", userId);

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload zlyhal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
