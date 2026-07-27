export type SoundProvidedBy =
  | "dj_brings"
  | "venue_has"
  | "shared"
  | "need_from_venue";

export type MicrophoneNeed =
  | "none"
  | "dj_brings"
  | "venue_wired"
  | "venue_wireless";

export type LightsSetup = "dj_brings" | "venue_has" | "both" | "none";

export type VenueSetting = "indoor" | "outdoor" | "mixed" | "unknown";

export type HallSize = "small" | "medium" | "large" | "unknown";

export type PowerAvailable = "yes" | "no" | "unknown";

export type DjRequirements = {
  id: string;
  booking_id: string;
  sound_provided_by: SoundProvidedBy | null;
  sound_notes: string | null;
  booth_table_notes: string | null;
  power_sockets_min: number | null;
  power_dedicated_circuit: boolean;
  power_notes: string | null;
  needs_booth_monitor: boolean;
  microphone_need: MicrophoneNeed | null;
  microphone_notes: string | null;
  lights_setup: LightsSetup | null;
  lights_notes: string | null;
  needs_weather_cover: boolean;
  needs_parking: boolean;
  load_in_notes: string | null;
  other_notes: string | null;
  visible_to_client: boolean;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export type VenueQuestionnaire = {
  id: string;
  booking_id: string;
  venue_setting: VenueSetting | null;
  guest_count: number | null;
  hall_size: HallSize | null;
  hall_size_notes: string | null;
  ceiling_height: string | null;
  power_available: PowerAvailable | null;
  power_notes: string | null;
  stage_available: boolean | null;
  outdoor_notes: string | null;
  other_notes: string | null;
  submitted_at: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
};

export const SOUND_PROVIDED_OPTIONS: {
  value: SoundProvidedBy;
  label: string;
  hint: string;
}[] = [
  {
    value: "dj_brings",
    label: "Prinášam vlastné ozvučenie",
    hint: "PA / suby idú so mnou",
  },
  {
    value: "venue_has",
    label: "Ozvučenie je na mieste",
    hint: "Hrám do existujúceho systému",
  },
  {
    value: "shared",
    label: "Kombinácia",
    hint: "Časť moja, časť miesta",
  },
  {
    value: "need_from_venue",
    label: "Potrebujem ozvučenie od miesta",
    hint: "Miesto / klient zabezpečí PA",
  },
];

export const MICROPHONE_OPTIONS: {
  value: MicrophoneNeed;
  label: string;
}[] = [
  { value: "none", label: "Netreba mikrofón" },
  { value: "dj_brings", label: "Prinášam vlastný" },
  { value: "venue_wired", label: "Potrebujem káblový od miesta" },
  { value: "venue_wireless", label: "Potrebujem bezdrôtový od miesta" },
];

export const LIGHTS_OPTIONS: { value: LightsSetup; label: string }[] = [
  { value: "dj_brings", label: "Prinášam vlastné svetlá" },
  { value: "venue_has", label: "Svetlá sú na mieste" },
  { value: "both", label: "Oboje" },
  { value: "none", label: "Bez špeciálnych svetiel" },
];

export const VENUE_SETTING_OPTIONS: { value: VenueSetting; label: string }[] =
  [
    { value: "indoor", label: "Vnútri" },
    { value: "outdoor", label: "Vonku" },
    { value: "mixed", label: "Oboje" },
    { value: "unknown", label: "Zatiaľ neviem" },
  ];

export const HALL_SIZE_OPTIONS: { value: HallSize; label: string }[] = [
  { value: "small", label: "Malá (do ~80 hostí)" },
  { value: "medium", label: "Stredná (~80–200)" },
  { value: "large", label: "Veľká (200+)" },
  { value: "unknown", label: "Neviem" },
];

export const POWER_AVAILABLE_OPTIONS: {
  value: PowerAvailable;
  label: string;
}[] = [
  { value: "yes", label: "Áno" },
  { value: "no", label: "Nie / neistota" },
  { value: "unknown", label: "Neviem" },
];

export function getSoundProvidedLabel(
  value: SoundProvidedBy | null | undefined
) {
  if (!value) return null;
  return SOUND_PROVIDED_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getMicrophoneLabel(value: MicrophoneNeed | null | undefined) {
  if (!value) return null;
  return MICROPHONE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getLightsLabel(value: LightsSetup | null | undefined) {
  if (!value) return null;
  return LIGHTS_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getVenueSettingLabel(value: VenueSetting | null | undefined) {
  if (!value) return null;
  return VENUE_SETTING_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getHallSizeLabel(value: HallSize | null | undefined) {
  if (!value) return null;
  return HALL_SIZE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getPowerAvailableLabel(
  value: PowerAvailable | null | undefined
) {
  if (!value) return null;
  return POWER_AVAILABLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
