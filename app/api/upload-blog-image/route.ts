import { createClient as createServiceClient } from "@supabase/supabase-js";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { isAuthorizedAdmin } from "@/lib/admin-auth";

/** Admin-only blog image upload. */
export async function POST(request: Request) {
  try {
    const supabase = await createSSRClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      return NextResponse.json({ error: "Musíš byť prihlásený." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .maybeSingle();

    if (
      !isAuthorizedAdmin({
        role: profile?.role,
        email: authData.user.email,
      })
    ) {
      return NextResponse.json({ error: "Len admin." }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof Blob) || !("name" in file)) {
      return NextResponse.json({ error: "Chýba súbor." }, { status: 400 });
    }

    const namedFile = file as File;
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(namedFile.type)) {
      return NextResponse.json({ error: "Neplatný typ súboru." }, { status: 400 });
    }
    if (namedFile.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Max 8 MB." }, { status: 400 });
    }

    const ext = namedFile.name.split(".").pop()?.toLowerCase() || "jpg";
    const fileName = `blog/${authData.user.id}/${Date.now()}.${ext}`;
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
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
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
