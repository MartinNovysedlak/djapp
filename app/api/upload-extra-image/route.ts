import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE = 5 * 1024 * 1024;

/**
 * Uploads one optional photo for a DJ add-on (extras catalog).
 * Auth from session only — ignores any client-supplied userId.
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (profile?.role === "client") {
      return NextResponse.json(
        { error: "Len účinkujúci môžu nahrávať fotky doplnkov." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof Blob) || !("name" in file)) {
      return NextResponse.json({ error: "Chýba súbor." }, { status: 400 });
    }

    const namedFile = file as File;
    if (!ALLOWED_TYPES.includes(namedFile.type)) {
      return NextResponse.json(
        { error: "Nahraj JPG, PNG, WebP alebo GIF." },
        { status: 400 }
      );
    }

    if (namedFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Súbor je príliš veľký (max 5 MB)." },
        { status: 400 }
      );
    }

    const userId = authData.user.id;
    const fileExt = namedFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `${userId}/extras/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${fileExt}`;

    const buffer = new Uint8Array(await namedFile.arrayBuffer());
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

    return NextResponse.json({ url: publicUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Upload zlyhal.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
