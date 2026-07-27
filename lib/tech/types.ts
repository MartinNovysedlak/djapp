export type PaProvidedBy = "dj" | "venue" | "shared" | "other";

export type VenueSetting = "indoor" | "outdoor" | "mixed" | "unknown";

export type HallSize = "small" | "medium" | "large" | "unknown";

export type PowerAvailable = "yes" | "no" | "unknown";

export type TechRider = {
  id: string;
  booking_id: string;
  power_requirements: string | null;
  table_or_stage: string | null;
  needs_di_boxes: boolean;
  di_boxes_count: number | null;
  lighting_notes: string | null;
  pa_provided_by: PaProvidedBy | null;
  pa_notes: string | null;
  space_notes: string | null;
  parking_needed: boolean;
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

export const PA_PROVIDED_OPTIONS: { value: PaProvidedBy; label: string }[] = [
  { value: "dj", label: "Prináša umelec" },
  { value: "venue", label: "Je na mieste" },
  { value: "shared", label: "Kombinácia" },
  { value: "other", label: "Iné" },
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

export function getPaProvidedLabel(value: PaProvidedBy | null | undefined) {
  if (!value) return null;
  return PA_PROVIDED_OPTIONS.find((o) => o.value === value)?.label ?? value;
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
