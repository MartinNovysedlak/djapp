"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import { requirePremiumAccess } from "@/lib/require-premium";
import {
  TIMELINE_ITEM_TYPES,
  TIMELINE_START_MODES,
  type TimelineItemType,
  type TimelineStartMode,
} from "@/lib/timeline/types";

export type ProgramTemplate = {
  id: string;
  dj_id: string;
  name: string;
  description: string | null;
  reference_start_time: string;
  created_at: string;
  updated_at: string;
  item_count?: number;
};

export type ProgramTemplateItem = {
  id: string;
  template_id: string;
  sort_order: number;
  item_type: TimelineItemType;
  title: string;
  notes: string | null;
  duration_minutes: number | null;
  default_offset_minutes: number | null;
  start_mode: TimelineStartMode | null;
  start_detail: string | null;
  is_critical: boolean;
  song_title: string | null;
  song_artist: string | null;
  tech_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ProgramTemplateItemInput = {
  itemType: TimelineItemType;
  title: string;
  notes?: string | null;
  durationMinutes?: number | null;
  defaultOffsetMinutes?: number | null;
  startMode?: TimelineStartMode | null;
  startDetail?: string | null;
  isCritical?: boolean;
  songTitle?: string | null;
  songArtist?: string | null;
  techNotes?: string | null;
};

const TEMPLATE_COLS =
  "id, dj_id, name, description, reference_start_time, created_at, updated_at";

const ITEM_COLS =
  "id, template_id, sort_order, item_type, title, notes, duration_minutes, default_offset_minutes, start_mode, start_detail, is_critical, song_title, song_artist, tech_notes, created_at, updated_at";

const ITEM_TYPE_SET = new Set(TIMELINE_ITEM_TYPES.map((t) => t.value));
const START_MODE_SET = new Set(TIMELINE_START_MODES.map((m) => m.value));

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

function normalizeDuration(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Math.round(value);
  if (n < 1 || n > 1440) return null;
  return n;
}

function normalizeOffset(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  const n = Math.round(value);
  if (n < 0 || n > 1440 * 3) return null;
  return n;
}

function parseItemInput(input: ProgramTemplateItemInput) {
  const title = normalizeText(input.title, 160);
  const notes = normalizeText(input.notes, 500) || null;
  const songTitle = normalizeText(input.songTitle, 160) || null;
  const songArtist = normalizeText(input.songArtist, 160) || null;
  const techNotes = normalizeText(input.techNotes, 500) || null;
  const startDetail = normalizeText(input.startDetail, 300) || null;
  const itemType = input.itemType;
  const startMode = input.startMode ?? null;
  const durationMinutes = normalizeDuration(input.durationMinutes ?? null);
  const defaultOffsetMinutes = normalizeOffset(
    input.defaultOffsetMinutes ?? null
  );

  if (!ITEM_TYPE_SET.has(itemType)) {
    return { ok: false as const, error: "Neplatný typ bodu." };
  }
  if (startMode && !START_MODE_SET.has(startMode)) {
    return { ok: false as const, error: "Neplatný spôsob spustenia." };
  }
  if (!title) {
    return { ok: false as const, error: "Zadaj názov bodu." };
  }
  if (
    input.durationMinutes != null &&
    String(input.durationMinutes) !== "" &&
    durationMinutes == null
  ) {
    return { ok: false as const, error: "Trvanie musí byť 1–1440 minút." };
  }
  if (
    input.defaultOffsetMinutes != null &&
    String(input.defaultOffsetMinutes) !== "" &&
    defaultOffsetMinutes == null
  ) {
    return {
      ok: false as const,
      error: "Offset musí byť 0–4320 minút od začiatku.",
    };
  }

  return {
    ok: true as const,
    data: {
      item_type: itemType,
      title,
      notes,
      duration_minutes: durationMinutes,
      default_offset_minutes: defaultOffsetMinutes,
      start_mode: startMode,
      start_detail: startDetail,
      is_critical: Boolean(input.isCritical),
      song_title: songTitle,
      song_artist: songArtist,
      tech_notes: techNotes,
    },
  };
}

function addMinutesToTime(base: string, minutes: number): string {
  const match = base.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return "00:00:00";
  const h = Number(match[1]);
  const m = Number(match[2]);
  const s = Number(match[3] ?? "0");
  let total = h * 60 + m + Math.round(minutes);
  total = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const nh = Math.floor(total / 60);
  const nm = total % 60;
  return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

async function requireDj() {
  const gate = await requirePremiumAccess();
  if (!gate.ok) {
    return { ok: false as const, error: gate.error };
  }
  if (gate.profile.role && gate.profile.role !== "dj") {
    return { ok: false as const, error: "Len umelec môže spravovať šablóny." };
  }
  const supabase = await createSSRClient();
  return { ok: true as const, supabase, userId: gate.userId };
}

export async function listProgramTemplates(): Promise<
  | { ok: true; templates: ProgramTemplate[] }
  | { ok: false; error: string }
> {
  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("program_templates")
    .select(TEMPLATE_COLS)
    .eq("dj_id", auth.userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[listProgramTemplates]", error);
    return { ok: false, error: "Šablóny sa nepodarilo načítať." };
  }

  const templates = (data ?? []) as ProgramTemplate[];
  if (templates.length === 0) return { ok: true, templates: [] };

  const ids = templates.map((t) => t.id);
  const { data: counts } = await auth.supabase
    .from("program_template_items")
    .select("template_id")
    .in("template_id", ids);

  const map = new Map<string, number>();
  for (const row of counts ?? []) {
    map.set(row.template_id, (map.get(row.template_id) ?? 0) + 1);
  }

  return {
    ok: true,
    templates: templates.map((t) => ({
      ...t,
      item_count: map.get(t.id) ?? 0,
    })),
  };
}

export async function getProgramTemplate(
  templateId: string
): Promise<
  | { ok: true; template: ProgramTemplate; items: ProgramTemplateItem[] }
  | { ok: false; error: string }
> {
  if (!templateId) return { ok: false, error: "Chýba ID šablóny." };
  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: template, error } = await auth.supabase
    .from("program_templates")
    .select(TEMPLATE_COLS)
    .eq("id", templateId)
    .eq("dj_id", auth.userId)
    .maybeSingle();

  if (error || !template) {
    return { ok: false, error: "Šablóna sa nenašla." };
  }

  const { data: items, error: itemsError } = await auth.supabase
    .from("program_template_items")
    .select(ITEM_COLS)
    .eq("template_id", templateId)
    .order("sort_order", { ascending: true });

  if (itemsError) {
    console.error("[getProgramTemplate]", itemsError);
    return { ok: false, error: "Body šablóny sa nepodarilo načítať." };
  }

  return {
    ok: true,
    template: template as ProgramTemplate,
    items: (items ?? []) as ProgramTemplateItem[],
  };
}

export async function createProgramTemplate(input: {
  name: string;
  description?: string | null;
}): Promise<
  { ok: true; template: ProgramTemplate } | { ok: false; error: string }
> {
  const name = normalizeText(input.name, 120);
  if (!name) return { ok: false, error: "Zadaj názov šablóny." };

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data, error } = await auth.supabase
    .from("program_templates")
    .insert({
      dj_id: auth.userId,
      name,
      description: normalizeText(input.description, 400) || null,
    })
    .select(TEMPLATE_COLS)
    .single();

  if (error || !data) {
    console.error("[createProgramTemplate]", error);
    return { ok: false, error: "Šablónu sa nepodarilo vytvoriť." };
  }

  revalidatePath("/dashboard/program-templates");
  return { ok: true, template: data as ProgramTemplate };
}

export async function updateProgramTemplate(input: {
  templateId: string;
  name: string;
  description?: string | null;
  referenceStartTime?: string | null;
}): Promise<
  { ok: true; template: ProgramTemplate } | { ok: false; error: string }
> {
  const name = normalizeText(input.name, 120);
  if (!name) return { ok: false, error: "Zadaj názov šablóny." };
  if (!input.templateId) return { ok: false, error: "Chýba ID šablóny." };

  let referenceStart: string | undefined;
  if (input.referenceStartTime != null && input.referenceStartTime !== "") {
    const match = input.referenceStartTime
      .trim()
      .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      return { ok: false, error: "Neplatný predpokladaný začiatok." };
    }
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (h > 23 || m > 59) {
      return { ok: false, error: "Neplatný predpokladaný začiatok." };
    }
    referenceStart = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
  }

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const patch: Record<string, string | null> = {
    name,
    description: normalizeText(input.description, 400) || null,
    updated_at: new Date().toISOString(),
  };
  if (referenceStart) {
    patch.reference_start_time = referenceStart;
  }

  const { data, error } = await auth.supabase
    .from("program_templates")
    .update(patch)
    .eq("id", input.templateId)
    .eq("dj_id", auth.userId)
    .select(TEMPLATE_COLS)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, error: "Šablónu sa nepodarilo uložiť." };
  }

  revalidatePath("/dashboard/program-templates");
  revalidatePath(`/dashboard/program-templates/${input.templateId}`);
  return { ok: true, template: data as ProgramTemplate };
}

export async function deleteProgramTemplate(
  templateId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!templateId) return { ok: false, error: "Chýba ID šablóny." };
  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("program_templates")
    .delete()
    .eq("id", templateId)
    .eq("dj_id", auth.userId);

  if (error) {
    console.error("[deleteProgramTemplate]", error);
    return { ok: false, error: "Šablónu sa nepodarilo zmazať." };
  }

  revalidatePath("/dashboard/program-templates");
  return { ok: true };
}

export async function duplicateProgramTemplate(
  templateId: string
): Promise<
  { ok: true; template: ProgramTemplate } | { ok: false; error: string }
> {
  const existing = await getProgramTemplate(templateId);
  if (!existing.ok) return existing;

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: created, error } = await auth.supabase
    .from("program_templates")
    .insert({
      dj_id: auth.userId,
      name: `${existing.template.name} (kópia)`.slice(0, 120),
      description: existing.template.description,
    })
    .select(TEMPLATE_COLS)
    .single();

  if (error || !created) {
    console.error("[duplicateProgramTemplate]", error);
    return { ok: false, error: "Šablónu sa nepodarilo duplikovať." };
  }

  if (existing.items.length > 0) {
    const rows = existing.items.map((item, index) => ({
      template_id: created.id,
      sort_order: index,
      item_type: item.item_type,
      title: item.title,
      notes: item.notes,
      duration_minutes: item.duration_minutes,
      default_offset_minutes: item.default_offset_minutes,
      start_mode: item.start_mode,
      start_detail: item.start_detail,
      is_critical: item.is_critical,
      song_title: item.song_title,
      song_artist: item.song_artist,
      tech_notes: item.tech_notes,
    }));

    const { error: itemsError } = await auth.supabase
      .from("program_template_items")
      .insert(rows);

    if (itemsError) {
      console.error("[duplicateProgramTemplate items]", itemsError);
      await auth.supabase
        .from("program_templates")
        .delete()
        .eq("id", created.id);
      return { ok: false, error: "Body šablóny sa nepodarilo skopírovať." };
    }
  }

  revalidatePath("/dashboard/program-templates");
  return { ok: true, template: created as ProgramTemplate };
}

export async function addProgramTemplateItem(input: {
  templateId: string;
} & ProgramTemplateItemInput): Promise<
  { ok: true; item: ProgramTemplateItem } | { ok: false; error: string }
> {
  if (!input.templateId) return { ok: false, error: "Chýba ID šablóny." };
  const parsed = parseItemInput(input);
  if (!parsed.ok) return parsed;

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const owned = await getProgramTemplate(input.templateId);
  if (!owned.ok) return owned;

  const nextOrder =
    owned.items.reduce((max, i) => Math.max(max, i.sort_order), -1) + 1;

  const { data, error } = await auth.supabase
    .from("program_template_items")
    .insert({
      template_id: input.templateId,
      sort_order: nextOrder,
      ...parsed.data,
    })
    .select(ITEM_COLS)
    .single();

  if (error || !data) {
    console.error("[addProgramTemplateItem]", error);
    return { ok: false, error: "Bod sa nepodarilo pridať." };
  }

  await auth.supabase
    .from("program_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", input.templateId);

  revalidatePath(`/dashboard/program-templates/${input.templateId}`);
  return { ok: true, item: data as ProgramTemplateItem };
}

export async function updateProgramTemplateItem(input: {
  itemId: string;
} & ProgramTemplateItemInput): Promise<
  { ok: true; item: ProgramTemplateItem } | { ok: false; error: string }
> {
  if (!input.itemId) return { ok: false, error: "Chýba ID bodu." };
  const parsed = parseItemInput(input);
  if (!parsed.ok) return parsed;

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: existing } = await auth.supabase
    .from("program_template_items")
    .select("id, template_id")
    .eq("id", input.itemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Bod sa nenašiel." };

  const owned = await getProgramTemplate(existing.template_id);
  if (!owned.ok) return owned;

  const { data, error } = await auth.supabase
    .from("program_template_items")
    .update({
      ...parsed.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.itemId)
    .select(ITEM_COLS)
    .single();

  if (error || !data) {
    return { ok: false, error: "Bod sa nepodarilo uložiť." };
  }

  await auth.supabase
    .from("program_templates")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", existing.template_id);

  revalidatePath(`/dashboard/program-templates/${existing.template_id}`);
  return { ok: true, item: data as ProgramTemplateItem };
}

export async function deleteProgramTemplateItem(
  itemId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!itemId) return { ok: false, error: "Chýba ID bodu." };
  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: existing } = await auth.supabase
    .from("program_template_items")
    .select("id, template_id")
    .eq("id", itemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Bod sa nenašiel." };

  const owned = await getProgramTemplate(existing.template_id);
  if (!owned.ok) return owned;

  const { error } = await auth.supabase
    .from("program_template_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { ok: false, error: "Bod sa nepodarilo zmazať." };
  }

  revalidatePath(`/dashboard/program-templates/${existing.template_id}`);
  return { ok: true };
}

export async function moveProgramTemplateItem(
  itemId: string,
  direction: "up" | "down"
): Promise<
  { ok: true; items: ProgramTemplateItem[] } | { ok: false; error: string }
> {
  if (!itemId) return { ok: false, error: "Chýba ID bodu." };
  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: existing } = await auth.supabase
    .from("program_template_items")
    .select("id, template_id, sort_order")
    .eq("id", itemId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Bod sa nenašiel." };

  const owned = await getProgramTemplate(existing.template_id);
  if (!owned.ok) return owned;

  const items = [...owned.items].sort((a, b) => a.sort_order - b.sort_order);
  const index = items.findIndex((i) => i.id === itemId);
  if (index < 0) return { ok: false, error: "Bod sa nenašiel." };

  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= items.length) {
    return { ok: true, items };
  }

  const a = items[index];
  const b = items[swapWith];

  const { error: e1 } = await auth.supabase
    .from("program_template_items")
    .update({
      sort_order: b.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", a.id);
  const { error: e2 } = await auth.supabase
    .from("program_template_items")
    .update({
      sort_order: a.sort_order,
      updated_at: new Date().toISOString(),
    })
    .eq("id", b.id);

  if (e1 || e2) {
    return { ok: false, error: "Poradie sa nepodarilo zmeniť." };
  }

  const refreshed = await getProgramTemplate(existing.template_id);
  if (!refreshed.ok) return refreshed;
  return { ok: true, items: refreshed.items };
}

export async function applyProgramTemplateToBooking(input: {
  bookingId: string;
  templateId: string;
  eventStartTime: string;
  replaceExisting?: boolean;
}): Promise<{ ok: true; inserted: number } | { ok: false; error: string }> {
  if (!input.bookingId || !input.templateId) {
    return { ok: false, error: "Chýba rezervácia alebo šablóna." };
  }

  const startMatch = input.eventStartTime
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!startMatch) {
    return { ok: false, error: "Zadaj čas začiatku (napr. 16:00)." };
  }
  const startH = Number(startMatch[1]);
  const startM = Number(startMatch[2]);
  if (startH > 23 || startM > 59) {
    return { ok: false, error: "Neplatný čas začiatku." };
  }
  const startBase = `${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`;

  const auth = await requireDj();
  if (!auth.ok) return auth;

  const { data: booking } = await auth.supabase
    .from("bookings")
    .select("id, status, dj_id")
    .eq("id", input.bookingId)
    .maybeSingle();

  if (
    !booking ||
    booking.dj_id !== auth.userId ||
    booking.status !== "accepted"
  ) {
    return {
      ok: false,
      error: "Šablónu môžeš použiť len pri potvrdenej rezervácii.",
    };
  }

  const tpl = await getProgramTemplate(input.templateId);
  if (!tpl.ok) return tpl;
  if (tpl.items.length === 0) {
    return { ok: false, error: "Šablóna nemá žiadne body." };
  }

  if (input.replaceExisting) {
    await auth.supabase
      .from("booking_timeline")
      .delete()
      .eq("booking_id", input.bookingId);
  }

  const { data: existing } = await auth.supabase
    .from("booking_timeline")
    .select("sort_order")
    .eq("booking_id", input.bookingId)
    .order("sort_order", { ascending: false })
    .limit(1);

  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;

  const rows = tpl.items.map((item) => {
    let eventTime: string | null = null;
    let endTime: string | null = null;
    if (item.default_offset_minutes != null) {
      eventTime = addMinutesToTime(startBase, item.default_offset_minutes);
      if (item.duration_minutes) {
        endTime = addMinutesToTime(eventTime, item.duration_minutes);
      }
    }

    return {
      booking_id: input.bookingId,
      added_by: auth.userId,
      sort_order: nextOrder++,
      is_done: false,
      item_type: item.item_type,
      title: item.title,
      notes: item.notes,
      duration_minutes: item.duration_minutes,
      event_time: eventTime,
      end_time: endTime,
      start_mode: item.start_mode ?? (eventTime ? "timed" : null),
      start_detail: item.start_detail,
      is_critical: item.is_critical,
      song_title: item.song_title,
      song_artist: item.song_artist,
      tech_notes: item.tech_notes,
      energy: null as string | null,
    };
  });

  const { error } = await auth.supabase.from("booking_timeline").insert(rows);
  if (error) {
    console.error("[applyProgramTemplateToBooking]", error);
    return { ok: false, error: "Program zo šablóny sa nepodarilo vytvoriť." };
  }

  revalidatePath("/dashboard/bookings");
  return { ok: true, inserted: rows.length };
}
