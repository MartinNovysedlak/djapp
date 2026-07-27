export type SoundChoice =
  | "dj_brings"
  | "venue_has"
  | "shared"
  | "need_from_venue";

export type RequirementItemId =
  | "sound"
  | "booth_table"
  | "power_sockets"
  | "dedicated_circuit"
  | "booth_monitor"
  | "microphone"
  | "lights"
  | "weather_cover"
  | "parking"
  | "load_in"
  | "extension_cables"
  | "wifi"
  | "dressing_room"
  | "stage_space"
  | "other";

export type RequirementItem = {
  id: RequirementItemId;
  note: string | null;
  quantity?: number | null;
  choice?: string | null;
};

export type VenueSetting = "indoor" | "outdoor" | "mixed" | "unknown";

export type HallSize = "small" | "medium" | "large" | "unknown";

export type PowerAvailable = "yes" | "no" | "unknown";

export type DjRequirements = {
  id: string;
  booking_id: string;
  items: RequirementItem[];
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

export const SOUND_CHOICE_OPTIONS: {
  value: SoundChoice;
  label: string;
  hint: string;
}[] = [
  {
    value: "dj_brings",
    label: "Prinášam vlastné",
    hint: "PA / suby idú so mnou",
  },
  {
    value: "venue_has",
    label: "Je na mieste",
    hint: "Hrám do existujúceho systému",
  },
  {
    value: "shared",
    label: "Kombinácia",
    hint: "Časť moja, časť miesta",
  },
  {
    value: "need_from_venue",
    label: "Potrebujem od miesta",
    hint: "Miesto / klient zabezpečí PA",
  },
];

export const REQUIREMENT_CATALOG: {
  id: RequirementItemId;
  label: string;
  hint: string;
  hasQuantity?: boolean;
  choices?: typeof SOUND_CHOICE_OPTIONS;
}[] = [
  {
    id: "sound",
    label: "Ozvučenie (PA)",
    hint: "Kto zabezpečí zvuk",
    choices: SOUND_CHOICE_OPTIONS,
  },
  {
    id: "booth_table",
    label: "Stôl / pult",
    hint: "Pevný stôl pre setup",
  },
  {
    id: "power_sockets",
    label: "Zásuvky 230V",
    hint: "Pri pulte / setup zóne",
    hasQuantity: true,
  },
  {
    id: "dedicated_circuit",
    label: "Samostatný okruh",
    hint: "Prúd nie so svetlami",
  },
  {
    id: "booth_monitor",
    label: "Monitor pri DJ",
    hint: "Reproduktory pri pulte",
  },
  {
    id: "microphone",
    label: "Mikrofón",
    hint: "Príhovory, tombola…",
  },
  {
    id: "lights",
    label: "Svetlá",
    hint: "DJ / ambient / dancefloor",
  },
  {
    id: "extension_cables",
    label: "Predlžovačky",
    hint: "Rozvodky blízko pultu",
  },
  {
    id: "weather_cover",
    label: "Zákryt vonku",
    hint: "Ochrana pred dažďom",
  },
  {
    id: "parking",
    label: "Parkovanie pri vykládke",
    hint: "Blízko vchodu",
  },
  {
    id: "load_in",
    label: "Prístup / vykládka",
    hint: "Vchod, výťah, čas",
  },
  {
    id: "wifi",
    label: "Wi‑Fi / internet",
    hint: "Streaming, sync, backup",
  },
  {
    id: "stage_space",
    label: "Priestor / pódium",
    hint: "Miesto na setup",
  },
  {
    id: "dressing_room",
    label: "Zázemie / šatňa",
    hint: "Miesto na prípravu",
  },
  {
    id: "other",
    label: "Iné",
    hint: "Čokoľvek navyše",
  },
];

/** Predvolená šablóna — typický set pre súkromnú akciu / svadbu */
export const DEFAULT_REQUIREMENT_TEMPLATE_ITEMS: RequirementItem[] = [
  { id: "sound", note: null, choice: "dj_brings" },
  { id: "booth_table", note: null },
  { id: "power_sockets", note: null, quantity: 2 },
  { id: "dedicated_circuit", note: null },
  { id: "booth_monitor", note: null },
  { id: "microphone", note: null },
  { id: "lights", note: null },
  { id: "parking", note: null },
  { id: "load_in", note: null },
];

export const DEFAULT_REQUIREMENT_TEMPLATE_NAME = "Štandardné požiadavky";

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

const ITEM_IDS = new Set(REQUIREMENT_CATALOG.map((c) => c.id));
const SOUND_CHOICES = new Set(SOUND_CHOICE_OPTIONS.map((o) => o.value));

export function getSoundChoiceLabel(value: string | null | undefined) {
  if (!value) return null;
  return SOUND_CHOICE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

export function getRequirementItemMeta(id: RequirementItemId) {
  return REQUIREMENT_CATALOG.find((c) => c.id === id) ?? null;
}

export function getRequirementItemLabel(id: RequirementItemId) {
  return getRequirementItemMeta(id)?.label ?? id;
}

export function formatRequirementItemSummary(item: RequirementItem) {
  const label = getRequirementItemLabel(item.id);
  const parts: string[] = [];
  if (item.id === "sound" && item.choice) {
    const choice = getSoundChoiceLabel(item.choice);
    if (choice) parts.push(choice);
  }
  if (item.id === "power_sockets" && item.quantity != null) {
    parts.push(`min. ${item.quantity}×`);
  }
  if (item.note) parts.push(item.note);
  return parts.length ? `${label} — ${parts.join(" · ")}` : label;
}

export function normalizeRequirementItems(raw: unknown): RequirementItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: RequirementItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    if (typeof id !== "string" || !ITEM_IDS.has(id as RequirementItemId)) {
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);

    const noteRaw = (entry as { note?: unknown }).note;
    const note =
      typeof noteRaw === "string" ? noteRaw.trim().slice(0, 500) || null : null;

    const item: RequirementItem = {
      id: id as RequirementItemId,
      note,
    };

    if (id === "power_sockets") {
      const q = (entry as { quantity?: unknown }).quantity;
      const n = typeof q === "number" ? q : Number(q);
      item.quantity =
        Number.isFinite(n) && n >= 1 && n <= 20 ? Math.round(n) : null;
    }

    if (id === "sound") {
      const c = (entry as { choice?: unknown }).choice;
      item.choice =
        typeof c === "string" && SOUND_CHOICES.has(c as SoundChoice)
          ? c
          : "dj_brings";
    }

    out.push(item);
  }

  return out;
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
