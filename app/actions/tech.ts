"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import {
  adminClient,
  resolveGuestShareBooking,
} from "@/lib/guest-share";
import type {
  HallSize,
  PaProvidedBy,
  PowerAvailable,
  TechRider,
  VenueQuestionnaire,
  VenueSetting,
} from "@/lib/tech/types";

const RIDER_COLS =
  "id, booking_id, power_requirements, table_or_stage, needs_di_boxes, di_boxes_count, lighting_notes, pa_provided_by, pa_notes, space_notes, parking_needed, load_in_notes, other_notes, visible_to_client, updated_by, created_at, updated_at";

const VENUE_COLS =
  "id, booking_id, venue_setting, guest_count, hall_size, hall_size_notes, ceiling_height, power_available, power_notes, stage_available, outdoor_notes, other_notes, submitted_at, updated_by, created_at, updated_at";

const PA_SET = new Set(["dj", "venue", "shared", "other"]);
const SETTING_SET = new Set(["indoor", "outdoor", "mixed", "unknown"]);
const HALL_SET = new Set(["small", "medium", "large", "unknown"]);
const POWER_SET = new Set(["yes", "no", "unknown"]);

function normalizeText(value: string | undefined | null, max: number) {
  return (value ?? "").trim().slice(0, max) || null;
}

async function getAcceptedBookingAccess(bookingId: string) {
  const supabase = await createSSRClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { supabase, user: null as null, booking: null, role: null as null };
  }

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, status, client_id, dj_id")
    .eq("id", bookingId)
    .maybeSingle();

  if (!booking || booking.status !== "accepted") {
    return { supabase, user: authData.user, booking: null, role: null as null };
  }

  const role =
    booking.client_id === authData.user.id
      ? ("client" as const)
      : booking.dj_id === authData.user.id
        ? ("dj" as const)
        : null;

  return { supabase, user: authData.user, booking, role };
}

type AccessOk = {
  ok: true;
  client: Awaited<ReturnType<typeof createSSRClient>>;
  userId: string | null;
  role: "client" | "dj" | "guest";
};

type AccessFail = { ok: false; error: string };

async function resolveTechAccess(
  bookingId: string,
  shareToken?: string
): Promise<AccessOk | AccessFail> {
  if (shareToken) {
    const guest = await resolveGuestShareBooking(bookingId, shareToken);
    if (!guest.ok) return guest;
    return {
      ok: true,
      client: guest.admin,
      userId: null,
      role: "guest",
    };
  }

  const { supabase, user, booking, role } =
    await getAcceptedBookingAccess(bookingId);
  if (!user) return { ok: false, error: "Musíš byť prihlásený." };
  if (!booking || !role) {
    return {
      ok: false,
      error: "Dostupné len pri potvrdenej rezervácii.",
    };
  }
  return { ok: true, client: supabase, userId: user.id, role };
}

export type TechRiderInput = {
  powerRequirements?: string | null;
  tableOrStage?: string | null;
  needsDiBoxes?: boolean;
  diBoxesCount?: number | null;
  lightingNotes?: string | null;
  paProvidedBy?: PaProvidedBy | null;
  paNotes?: string | null;
  spaceNotes?: string | null;
  parkingNeeded?: boolean;
  loadInNotes?: string | null;
  otherNotes?: string | null;
  visibleToClient?: boolean;
};

export type VenueQuestionnaireInput = {
  venueSetting?: VenueSetting | null;
  guestCount?: number | null;
  hallSize?: HallSize | null;
  hallSizeNotes?: string | null;
  ceilingHeight?: string | null;
  powerAvailable?: PowerAvailable | null;
  powerNotes?: string | null;
  stageAvailable?: boolean | null;
  outdoorNotes?: string | null;
  otherNotes?: string | null;
};

export async function getTechRider(
  bookingId: string,
  shareToken?: string
): Promise<{ ok: true; rider: TechRider | null } | { ok: false; error: string }> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(bookingId, shareToken);
  if (!access.ok) return access;

  const { data, error } = await access.client
    .from("booking_tech_riders")
    .select(RIDER_COLS)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[getTechRider]", error);
    return { ok: false, error: "Rider sa nepodarilo načítať." };
  }

  const rider = (data as TechRider | null) ?? null;
  if (
    rider &&
    access.role !== "dj" &&
    !rider.visible_to_client
  ) {
    return { ok: true, rider: null };
  }

  return { ok: true, rider };
}

export async function upsertTechRider(input: {
  bookingId: string;
} & TechRiderInput): Promise<
  { ok: true; rider: TechRider } | { ok: false; error: string }
> {
  if (!input.bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(input.bookingId);
  if (!access.ok) return access;
  if (access.role !== "dj") {
    return { ok: false, error: "Rider môže upravovať len umelec." };
  }

  const pa = input.paProvidedBy ?? null;
  if (pa && !PA_SET.has(pa)) {
    return { ok: false, error: "Neplatná voľba ozvučenia." };
  }

  let diCount: number | null = null;
  if (input.diBoxesCount != null && String(input.diBoxesCount) !== "") {
    const n = Math.round(Number(input.diBoxesCount));
    if (!Number.isFinite(n) || n < 0 || n > 50) {
      return { ok: false, error: "Počet DI boxov musí byť 0–50." };
    }
    diCount = n;
  }

  const row = {
    booking_id: input.bookingId,
    power_requirements: normalizeText(input.powerRequirements, 400),
    table_or_stage: normalizeText(input.tableOrStage, 300),
    needs_di_boxes: Boolean(input.needsDiBoxes),
    di_boxes_count: input.needsDiBoxes ? diCount : null,
    lighting_notes: normalizeText(input.lightingNotes, 500),
    pa_provided_by: pa,
    pa_notes: normalizeText(input.paNotes, 400),
    space_notes: normalizeText(input.spaceNotes, 500),
    parking_needed: Boolean(input.parkingNeeded),
    load_in_notes: normalizeText(input.loadInNotes, 500),
    other_notes: normalizeText(input.otherNotes, 800),
    visible_to_client: input.visibleToClient !== false,
    updated_by: access.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await access.client
    .from("booking_tech_riders")
    .upsert(row, { onConflict: "booking_id" })
    .select(RIDER_COLS)
    .single();

  if (error || !data) {
    console.error("[upsertTechRider]", error);
    return { ok: false, error: "Rider sa nepodarilo uložiť." };
  }

  return { ok: true, rider: data as TechRider };
}

export async function getVenueQuestionnaire(
  bookingId: string,
  shareToken?: string
): Promise<
  | { ok: true; questionnaire: VenueQuestionnaire | null }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(bookingId, shareToken);
  if (!access.ok) return access;

  const { data, error } = await access.client
    .from("booking_venue_questionnaires")
    .select(VENUE_COLS)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[getVenueQuestionnaire]", error);
    return { ok: false, error: "Dotazník sa nepodarilo načítať." };
  }

  return {
    ok: true,
    questionnaire: (data as VenueQuestionnaire | null) ?? null,
  };
}

export async function upsertVenueQuestionnaire(input: {
  bookingId: string;
  shareToken?: string;
} & VenueQuestionnaireInput): Promise<
  | { ok: true; questionnaire: VenueQuestionnaire }
  | { ok: false; error: string }
> {
  if (!input.bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(input.bookingId, input.shareToken);
  if (!access.ok) return access;
  if (access.role !== "client" && access.role !== "guest") {
    return {
      ok: false,
      error: "Dotazník môže vyplniť klient.",
    };
  }

  const setting = input.venueSetting ?? null;
  const hall = input.hallSize ?? null;
  const power = input.powerAvailable ?? null;

  if (setting && !SETTING_SET.has(setting)) {
    return { ok: false, error: "Neplatný typ miesta." };
  }
  if (hall && !HALL_SET.has(hall)) {
    return { ok: false, error: "Neplatná veľkosť sály." };
  }
  if (power && !POWER_SET.has(power)) {
    return { ok: false, error: "Neplatná odpoveď o prúde." };
  }

  let guestCount: number | null = null;
  if (input.guestCount != null && String(input.guestCount) !== "") {
    const n = Math.round(Number(input.guestCount));
    if (!Number.isFinite(n) || n < 1 || n > 20000) {
      return { ok: false, error: "Počet hostí musí byť 1–20000." };
    }
    guestCount = n;
  }

  const row = {
    booking_id: input.bookingId,
    venue_setting: setting,
    guest_count: guestCount,
    hall_size: hall,
    hall_size_notes: normalizeText(input.hallSizeNotes, 300),
    ceiling_height: normalizeText(input.ceilingHeight, 120),
    power_available: power,
    power_notes: normalizeText(input.powerNotes, 400),
    stage_available:
      input.stageAvailable === undefined ? null : input.stageAvailable,
    outdoor_notes: normalizeText(input.outdoorNotes, 500),
    other_notes: normalizeText(input.otherNotes, 800),
    submitted_at: new Date().toISOString(),
    updated_by: access.userId,
    updated_at: new Date().toISOString(),
  };

  // Guest path uses service role; auth client for logged-in client
  const writer =
    access.role === "guest"
      ? adminClient()
      : access.client;

  const { data, error } = await writer
    .from("booking_venue_questionnaires")
    .upsert(row, { onConflict: "booking_id" })
    .select(VENUE_COLS)
    .single();

  if (error || !data) {
    console.error("[upsertVenueQuestionnaire]", error);
    return { ok: false, error: "Dotazník sa nepodarilo uložiť." };
  }

  return { ok: true, questionnaire: data as VenueQuestionnaire };
}
