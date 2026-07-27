"use server";

import { createClient as createSSRClient } from "@/utils/supabase/server";
import { adminClient, resolveGuestShareBooking } from "@/lib/guest-share";
import type {
  DjRequirements,
  HallSize,
  LightsSetup,
  MicrophoneNeed,
  PowerAvailable,
  SoundProvidedBy,
  VenueQuestionnaire,
  VenueSetting,
} from "@/lib/tech/types";

const REQ_COLS =
  "id, booking_id, sound_provided_by, sound_notes, booth_table_notes, power_sockets_min, power_dedicated_circuit, power_notes, needs_booth_monitor, microphone_need, microphone_notes, lights_setup, lights_notes, needs_weather_cover, needs_parking, load_in_notes, other_notes, visible_to_client, updated_by, created_at, updated_at";

const VENUE_COLS =
  "id, booking_id, venue_setting, guest_count, hall_size, hall_size_notes, ceiling_height, power_available, power_notes, stage_available, outdoor_notes, other_notes, submitted_at, updated_by, created_at, updated_at";

const SOUND_SET = new Set([
  "dj_brings",
  "venue_has",
  "shared",
  "need_from_venue",
]);
const MIC_SET = new Set([
  "none",
  "dj_brings",
  "venue_wired",
  "venue_wireless",
]);
const LIGHTS_SET = new Set(["dj_brings", "venue_has", "both", "none"]);
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

export type DjRequirementsInput = {
  soundProvidedBy?: SoundProvidedBy | null;
  soundNotes?: string | null;
  boothTableNotes?: string | null;
  powerSocketsMin?: number | null;
  powerDedicatedCircuit?: boolean;
  powerNotes?: string | null;
  needsBoothMonitor?: boolean;
  microphoneNeed?: MicrophoneNeed | null;
  microphoneNotes?: string | null;
  lightsSetup?: LightsSetup | null;
  lightsNotes?: string | null;
  needsWeatherCover?: boolean;
  needsParking?: boolean;
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

export async function getDjRequirements(
  bookingId: string,
  shareToken?: string
): Promise<
  | { ok: true; requirements: DjRequirements | null }
  | { ok: false; error: string }
> {
  if (!bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(bookingId, shareToken);
  if (!access.ok) return access;

  const { data, error } = await access.client
    .from("booking_dj_requirements")
    .select(REQ_COLS)
    .eq("booking_id", bookingId)
    .maybeSingle();

  if (error) {
    console.error("[getDjRequirements]", error);
    return { ok: false, error: "Požiadavky sa nepodarilo načítať." };
  }

  const requirements = (data as DjRequirements | null) ?? null;
  if (
    requirements &&
    access.role !== "dj" &&
    !requirements.visible_to_client
  ) {
    return { ok: true, requirements: null };
  }

  return { ok: true, requirements };
}

export async function upsertDjRequirements(input: {
  bookingId: string;
} & DjRequirementsInput): Promise<
  { ok: true; requirements: DjRequirements } | { ok: false; error: string }
> {
  if (!input.bookingId) return { ok: false, error: "Chýba ID rezervácie." };

  const access = await resolveTechAccess(input.bookingId);
  if (!access.ok) return access;
  if (access.role !== "dj") {
    return { ok: false, error: "Požiadavky môže upravovať len umelec." };
  }

  const sound = input.soundProvidedBy ?? null;
  const mic = input.microphoneNeed ?? null;
  const lights = input.lightsSetup ?? null;

  if (sound && !SOUND_SET.has(sound)) {
    return { ok: false, error: "Neplatná voľba ozvučenia." };
  }
  if (mic && !MIC_SET.has(mic)) {
    return { ok: false, error: "Neplatná voľba mikrofónu." };
  }
  if (lights && !LIGHTS_SET.has(lights)) {
    return { ok: false, error: "Neplatná voľba svetiel." };
  }

  let sockets: number | null = null;
  if (input.powerSocketsMin != null && String(input.powerSocketsMin) !== "") {
    const n = Math.round(Number(input.powerSocketsMin));
    if (!Number.isFinite(n) || n < 1 || n > 20) {
      return { ok: false, error: "Počet zásuviek musí byť 1–20." };
    }
    sockets = n;
  }

  const row = {
    booking_id: input.bookingId,
    sound_provided_by: sound,
    sound_notes: normalizeText(input.soundNotes, 500),
    booth_table_notes: normalizeText(input.boothTableNotes, 400),
    power_sockets_min: sockets,
    power_dedicated_circuit: Boolean(input.powerDedicatedCircuit),
    power_notes: normalizeText(input.powerNotes, 400),
    needs_booth_monitor: Boolean(input.needsBoothMonitor),
    microphone_need: mic,
    microphone_notes: normalizeText(input.microphoneNotes, 300),
    lights_setup: lights,
    lights_notes: normalizeText(input.lightsNotes, 400),
    needs_weather_cover: Boolean(input.needsWeatherCover),
    needs_parking: Boolean(input.needsParking),
    load_in_notes: normalizeText(input.loadInNotes, 500),
    other_notes: normalizeText(input.otherNotes, 800),
    visible_to_client: input.visibleToClient !== false,
    updated_by: access.userId,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await access.client
    .from("booking_dj_requirements")
    .upsert(row, { onConflict: "booking_id" })
    .select(REQ_COLS)
    .single();

  if (error || !data) {
    console.error("[upsertDjRequirements]", error);
    return { ok: false, error: "Požiadavky sa nepodarilo uložiť." };
  }

  return { ok: true, requirements: data as DjRequirements };
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

  const writer = access.role === "guest" ? adminClient() : access.client;

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
