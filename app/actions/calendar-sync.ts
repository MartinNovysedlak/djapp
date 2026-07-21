"use server";

import { randomBytes } from "crypto";
import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  calendarExportUrl,
  isValidExternalIcsUrl,
} from "@/lib/calendar/export-ics";
import { invalidateExternalCalendarCache } from "@/lib/calendar/import-ics";

export type CalendarSyncSettings = {
  externalCalendarUrl: string | null;
  exportUrl: string | null;
  exportToken: string | null;
};

export type CalendarSyncResult = {
  ok: boolean;
  error?: string;
  settings?: CalendarSyncSettings;
};

async function requireDj() {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { error: "Musíš byť prihlásený." as const, supabase, userId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, external_calendar_url, calendar_export_token")
    .eq("id", authData.user.id)
    .maybeSingle();

  if (!profile || profile.role === "client") {
    return {
      error: "Len umelecké účty môžu spravovať synchronizáciu kalendára." as const,
      supabase,
      userId: null,
    };
  }

  return {
    error: null,
    supabase,
    userId: authData.user.id,
    profile,
  };
}

function toSettings(row: {
  external_calendar_url?: string | null;
  calendar_export_token?: string | null;
}): CalendarSyncSettings {
  const token = row.calendar_export_token ?? null;
  return {
    externalCalendarUrl: row.external_calendar_url ?? null,
    exportToken: token,
    exportUrl: token ? calendarExportUrl(token) : null,
  };
}

export async function getCalendarSyncSettings(): Promise<CalendarSyncResult> {
  const ctx = await requireDj();
  if (ctx.error || !ctx.profile) {
    return { ok: false, error: ctx.error ?? "Profil nenájdený." };
  }

  let token = ctx.profile.calendar_export_token as string | null;
  if (!token) {
    token = randomBytes(24).toString("hex");
    const { error } = await ctx.supabase
      .from("profiles")
      .update({ calendar_export_token: token })
      .eq("id", ctx.userId!);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  return {
    ok: true,
    settings: toSettings({
      external_calendar_url: ctx.profile.external_calendar_url,
      calendar_export_token: token,
    }),
  };
}

export async function updateExternalCalendarUrl(
  url: string
): Promise<CalendarSyncResult> {
  const ctx = await requireDj();
  if (ctx.error || !ctx.userId) {
    return { ok: false, error: ctx.error ?? "Neautorizované." };
  }

  const trimmed = url.trim();
  if (trimmed && !isValidExternalIcsUrl(trimmed)) {
    return {
      ok: false,
      error:
        "Neplatná ICS URL. Vlož tajný odkaz na .ics feed z Google/Apple kalendára (https://…).",
    };
  }

  const previous = (ctx.profile?.external_calendar_url as string | null) ?? null;

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ external_calendar_url: trimmed || null })
    .eq("id", ctx.userId)
    .select("external_calendar_url, calendar_export_token")
    .single();

  if (error) {
    console.error("[updateExternalCalendarUrl]", error);
    return { ok: false, error: error.message };
  }

  invalidateExternalCalendarCache(previous);
  invalidateExternalCalendarCache(trimmed || null);

  return { ok: true, settings: toSettings(data) };
}

export async function regenerateCalendarExportToken(): Promise<CalendarSyncResult> {
  const ctx = await requireDj();
  if (ctx.error || !ctx.userId) {
    return { ok: false, error: ctx.error ?? "Neautorizované." };
  }

  const token = randomBytes(24).toString("hex");
  const { data, error } = await ctx.supabase
    .from("profiles")
    .update({ calendar_export_token: token })
    .eq("id", ctx.userId)
    .select("external_calendar_url, calendar_export_token")
    .single();

  if (error) {
    console.error("[regenerateCalendarExportToken]", error);
    return { ok: false, error: error.message };
  }

  return { ok: true, settings: toSettings(data) };
}
