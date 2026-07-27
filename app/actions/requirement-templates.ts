"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  DEFAULT_REQUIREMENT_TEMPLATE_ITEMS,
  DEFAULT_REQUIREMENT_TEMPLATE_NAME,
  normalizeRequirementItems,
  type RequirementItem,
} from "@/lib/tech/types";

const TEMPLATE_COLS =
  "id, dj_id, name, description, items, is_default, created_at, updated_at";

export type RequirementTemplate = {
  id: string;
  dj_id: string;
  name: string;
  description: string | null;
  items: RequirementItem[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max) || null;
}

function mapTemplate(row: Record<string, unknown>): RequirementTemplate {
  return {
    ...(row as Omit<RequirementTemplate, "items">),
    items: normalizeRequirementItems(row.items),
  };
}

async function requireDj() {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { ok: false as const, error: "Musíš byť prihlásený." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.role !== "dj") {
    return { ok: false as const, error: "Len umelec môže spravovať šablóny." };
  }

  return { ok: true as const, supabase, userId: authData.user.id };
}

async function ensureDefaultTemplate(
  supabase: Awaited<ReturnType<typeof createSSRClient>>,
  userId: string
) {
  const { count, error: countError } = await supabase
    .from("requirement_templates")
    .select("id", { count: "exact", head: true })
    .eq("dj_id", userId);

  if (countError) {
    console.error("[ensureDefaultTemplate count]", countError);
    return;
  }
  if ((count ?? 0) > 0) return;

  const { error } = await supabase.from("requirement_templates").insert({
    dj_id: userId,
    name: DEFAULT_REQUIREMENT_TEMPLATE_NAME,
    description:
      "Predvolený checklist požiadaviek na ozvučenie a setup akcie.",
    items: DEFAULT_REQUIREMENT_TEMPLATE_ITEMS,
    is_default: true,
  });

  if (error) {
    console.error("[ensureDefaultTemplate insert]", error);
  }
}

export async function listRequirementTemplates(): Promise<
  | { ok: true; templates: RequirementTemplate[] }
  | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return auth;

  await ensureDefaultTemplate(auth.supabase, auth.userId);

  const { data, error } = await auth.supabase
    .from("requirement_templates")
    .select(TEMPLATE_COLS)
    .eq("dj_id", auth.userId)
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listRequirementTemplates]", error);
    return { ok: false, error: "Šablóny sa nepodarilo načítať." };
  }

  return {
    ok: true,
    templates: (data ?? []).map((row) =>
      mapTemplate(row as Record<string, unknown>)
    ),
  };
}

export async function getRequirementTemplate(
  templateId: string
): Promise<
  | { ok: true; template: RequirementTemplate }
  | { ok: false; error: string }
> {
  if (!templateId) return { ok: false, error: "Chýba ID šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("requirement_templates")
    .select(TEMPLATE_COLS)
    .eq("id", templateId)
    .eq("dj_id", auth.userId)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  return { ok: true, template: mapTemplate(data as Record<string, unknown>) };
}

export async function createRequirementTemplate(input: {
  name: string;
  description?: string | null;
  items?: RequirementItem[];
  useDefaultItems?: boolean;
}): Promise<
  { ok: true; template: RequirementTemplate } | { ok: false; error: string }
> {
  const name = normalizeText(input.name, 120);
  if (!name) return { ok: false, error: "Zadaj názov šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const items = normalizeRequirementItems(
    input.useDefaultItems
      ? DEFAULT_REQUIREMENT_TEMPLATE_ITEMS
      : (input.items ?? [])
  );

  const { data, error } = await auth.supabase
    .from("requirement_templates")
    .insert({
      dj_id: auth.userId,
      name,
      description: normalizeText(input.description, 400),
      items,
      is_default: false,
    })
    .select(TEMPLATE_COLS)
    .single();

  if (error || !data) {
    console.error("[createRequirementTemplate]", error);
    return { ok: false, error: "Šablónu sa nepodarilo vytvoriť." };
  }

  revalidatePath("/dashboard/requirement-templates");
  return { ok: true, template: mapTemplate(data as Record<string, unknown>) };
}

export async function updateRequirementTemplate(input: {
  templateId: string;
  name: string;
  description?: string | null;
  items: RequirementItem[];
}): Promise<
  { ok: true; template: RequirementTemplate } | { ok: false; error: string }
> {
  const name = normalizeText(input.name, 120);
  if (!name) return { ok: false, error: "Zadaj názov šablóny." };
  if (!input.templateId) return { ok: false, error: "Chýba ID šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("requirement_templates")
    .update({
      name,
      description: normalizeText(input.description, 400),
      items: normalizeRequirementItems(input.items),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.templateId)
    .eq("dj_id", auth.userId)
    .select(TEMPLATE_COLS)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Šablónu sa nepodarilo uložiť." };
  }

  revalidatePath("/dashboard/requirement-templates");
  revalidatePath(`/dashboard/requirement-templates/${input.templateId}`);
  return { ok: true, template: mapTemplate(data as Record<string, unknown>) };
}

export async function setDefaultRequirementTemplate(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!templateId) return { ok: false, error: "Chýba ID šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  await auth.supabase
    .from("requirement_templates")
    .update({ is_default: false, updated_at: new Date().toISOString() })
    .eq("dj_id", auth.userId)
    .eq("is_default", true);

  const { data, error } = await auth.supabase
    .from("requirement_templates")
    .update({ is_default: true, updated_at: new Date().toISOString() })
    .eq("id", templateId)
    .eq("dj_id", auth.userId)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Predvolenú šablónu sa nepodarilo nastaviť." };
  }

  revalidatePath("/dashboard/requirement-templates");
  return { ok: true };
}

export async function deleteRequirementTemplate(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!templateId) return { ok: false, error: "Chýba ID šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: existing } = await auth.supabase
    .from("requirement_templates")
    .select("id, is_default")
    .eq("id", templateId)
    .eq("dj_id", auth.userId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Šablóna sa nenašla." };

  const { error } = await auth.supabase
    .from("requirement_templates")
    .delete()
    .eq("id", templateId)
    .eq("dj_id", auth.userId);

  if (error) {
    return { ok: false, error: "Šablónu sa nepodarilo zmazať." };
  }

  if (existing.is_default) {
    await ensureDefaultTemplate(auth.supabase, auth.userId);
  }

  revalidatePath("/dashboard/requirement-templates");
  return { ok: true };
}

export async function duplicateRequirementTemplate(
  templateId: string
): Promise<
  { ok: true; template: RequirementTemplate } | { ok: false; error: string }
> {
  const existing = await getRequirementTemplate(templateId);
  if (!existing.ok) return existing;

  return createRequirementTemplate({
    name: `${existing.template.name} (kópia)`,
    description: existing.template.description,
    items: existing.template.items,
  });
}

export async function applyRequirementTemplateToBooking(input: {
  bookingId: string;
  templateId: string;
  replaceExisting?: boolean;
}): Promise<
  | { ok: true; itemCount: number }
  | { ok: false; error: string }
> {
  if (!input.bookingId || !input.templateId) {
    return { ok: false, error: "Chýbajú údaje." };
  }

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: booking } = await auth.supabase
    .from("bookings")
    .select("id, status, dj_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "accepted" || booking.dj_id !== auth.userId) {
    return { ok: false, error: "Dostupné len pri potvrdenej rezervácii." };
  }

  const { data: template } = await auth.supabase
    .from("requirement_templates")
    .select(TEMPLATE_COLS)
    .eq("id", input.templateId)
    .eq("dj_id", auth.userId)
    .maybeSingle();

  if (!template) return { ok: false, error: "Šablóna sa nenašla." };

  const templateItems = normalizeRequirementItems(
    (template as { items: unknown }).items
  );

  let items = templateItems;
  if (!input.replaceExisting) {
    const { data: current } = await auth.supabase
      .from("booking_dj_requirements")
      .select("items")
      .eq("booking_id", input.bookingId)
      .maybeSingle();

    const existing = normalizeRequirementItems(current?.items);
    const byId = new Map(existing.map((i) => [i.id, i]));
    for (const item of templateItems) {
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    items = Array.from(byId.values());
  }

  const { error } = await auth.supabase.from("booking_dj_requirements").upsert(
    {
      booking_id: input.bookingId,
      items,
      visible_to_client: true,
      updated_by: auth.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "booking_id" }
  );

  if (error) {
    console.error("[applyRequirementTemplateToBooking]", error);
    return { ok: false, error: "Šablónu sa nepodarilo použiť." };
  }

  return { ok: true, itemCount: items.length };
}
