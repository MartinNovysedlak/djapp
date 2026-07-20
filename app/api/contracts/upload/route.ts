import { NextResponse } from "next/server";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { convertDocxToTemplateHtml } from "@/lib/contracts/docx-to-html";
import { extractPlaceholders } from "@/lib/contracts/placeholders";
import { stripMarginsComment } from "@/lib/contracts/page-spacers";
import type { ContractPlaceholderType } from "@/lib/contracts/types";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

/**
 * Uploads a .docx contract template, converts it to HTML via mammoth, and stores
 * it for the authenticated DJ. Lives as a Route Handler (not a Server Action)
 * because binary FormData + mammoth is unreliable through the RSC flight protocol
 * under Turbopack — that's what was surfacing as "An unexpected response…".
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
        { error: "Len DJ účty môžu spravovať zmluvy." },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const templateName = (formData.get("templateName") as string | null)?.trim();

    if (!(file instanceof Blob) || !("name" in file)) {
      return NextResponse.json(
        { error: "Nahraj platný súbor .docx." },
        { status: 400 }
      );
    }

    const namedFile = file as File;
    if (!namedFile.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { error: "Podporovaný je len formát .docx." },
        { status: 400 }
      );
    }
    if (namedFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Súbor je príliš veľký (max 5 MB)." },
        { status: 400 }
      );
    }

    const arrayBuffer = await namedFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const html = await convertDocxToTemplateHtml(buffer);
    const placeholders = extractPlaceholders(stripMarginsComment(html));

    const { data: template, error } = await supabase
      .from("contract_templates")
      .insert({
        dj_id: authData.user.id,
        template_name: templateName || namedFile.name.replace(/\.docx$/i, ""),
        raw_content: html,
      })
      .select("*")
      .single();

    if (error || !template) {
      console.error("[api/contracts/upload]", error);
      return NextResponse.json(
        { error: error?.message ?? "Šablónu sa nepodarilo uložiť." },
        { status: 500 }
      );
    }

    if (placeholders.length > 0) {
      const { error: placeholdersError } = await supabase
        .from("contract_placeholders")
        .insert(
          placeholders.map((key) => ({
            template_id: template.id,
            placeholder_key: key,
            type: "manual_input" as ContractPlaceholderType,
            source_field: null,
          }))
        );

      if (placeholdersError) {
        console.error("[api/contracts/upload:placeholders]", placeholdersError);
        await supabase.from("contract_templates").delete().eq("id", template.id);
        return NextResponse.json(
          { error: "Premenné sa nepodarilo uložiť." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ ok: true, template });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Nepodarilo sa spracovať dokument.";
    console.error("[api/contracts/upload]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
