export type TimelineItemType =
  | "setup"
  | "ceremony"
  | "entrance"
  | "first_dance"
  | "parent_dance"
  | "dance_round"
  | "song_cue"
  | "speech"
  | "toast"
  | "dinner"
  | "cake"
  | "changeover"
  | "party"
  | "photo"
  | "announcement"
  | "break"
  | "performance"
  | "show"
  | "special"
  | "moment"
  | "other";

export type TimelineEnergy = "soft" | "warm" | "build" | "peak" | "chill";

/** How / when this program point should start. */
export type TimelineStartMode =
  | "timed"
  | "on_signal"
  | "on_word"
  | "after_previous"
  | "flexible";

export type TimelineItem = {
  id: string;
  booking_id: string;
  added_by: string;
  event_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  item_type: TimelineItemType;
  title: string;
  notes: string | null;
  song_title: string | null;
  song_artist: string | null;
  tech_notes: string | null;
  energy: TimelineEnergy | null;
  start_mode: TimelineStartMode | null;
  start_detail: string | null;
  is_critical: boolean;
  sort_order: number;
  is_done: boolean;
  created_at: string;
  updated_at: string;
};

export const TIMELINE_ITEM_TYPES: {
  value: TimelineItemType;
  label: string;
  hint: string;
  defaultTitle: string;
  needsSong?: boolean;
}[] = [
  {
    value: "setup",
    label: "Príprava",
    hint: "Príchod, skúška zvuku, mikrofon",
    defaultTitle: "Príprava / skúška zvuku",
  },
  {
    value: "ceremony",
    label: "Obrad",
    hint: "Tichá hudba, nástup, podpis",
    defaultTitle: "Obrad",
  },
  {
    value: "entrance",
    label: "Nástup",
    hint: "Vstup novomanželov / hostí",
    defaultTitle: "Nástup novomanželov",
    needsSong: true,
  },
  {
    value: "first_dance",
    label: "Prvý tanec",
    hint: "Kľúčový moment + skladba",
    defaultTitle: "Prvý tanec",
    needsSong: true,
  },
  {
    value: "parent_dance",
    label: "Tanec s rodičmi",
    hint: "Otec/dcéra, matka/syn…",
    defaultTitle: "Tanec s rodičmi",
    needsSong: true,
  },
  {
    value: "dance_round",
    label: "Tanečné kolo",
    hint: "Spoločný tanec hostí, konkrétna skladba",
    defaultTitle: "Tanečné kolo",
    needsSong: true,
  },
  {
    value: "song_cue",
    label: "Skladba",
    hint: "Konkrétna pieseň v programe",
    defaultTitle: "Skladba",
    needsSong: true,
  },
  {
    value: "speech",
    label: "Príhovor",
    hint: "Stíšiť hudbu, pripraviť mikrofon",
    defaultTitle: "Príhovor",
  },
  {
    value: "toast",
    label: "Prípitok",
    hint: "Krátka pauza pri prípitku",
    defaultTitle: "Prípitok",
  },
  {
    value: "dinner",
    label: "Večera",
    hint: "Pokojná hudba počas jedla",
    defaultTitle: "Večera – pokojná hudba",
  },
  {
    value: "cake",
    label: "Torta",
    hint: "Krájanie torty",
    defaultTitle: "Krájanie torty",
    needsSong: true,
  },
  {
    value: "changeover",
    label: "Zmena",
    hint: "Prechod medzi blokmi programu",
    defaultTitle: "Zmena programu",
  },
  {
    value: "break",
    label: "Prestávka",
    hint: "Pauza v hudbe / ticho",
    defaultTitle: "Prestávka",
  },
  {
    value: "performance",
    label: "Vystúpenie",
    hint: "Hosťujúci umelec, spev, tanec…",
    defaultTitle: "Vystúpenie",
  },
  {
    value: "show",
    label: "Show",
    hint: "Efekty, choreografia, veľký moment",
    defaultTitle: "Show",
  },
  {
    value: "party",
    label: "Párty",
    hint: "Voľný tanec, tanečný blok",
    defaultTitle: "Tanečný blok / párty",
  },
  {
    value: "photo",
    label: "Foto",
    hint: "Spoločné fotenie",
    defaultTitle: "Spoločné fotenie",
  },
  {
    value: "announcement",
    label: "Oznam",
    hint: "Hlásenie / oznámenie hostom",
    defaultTitle: "Oznam",
  },
  {
    value: "special",
    label: "Špeciál",
    hint: "Prskavky, prekvapenie…",
    defaultTitle: "Špeciálny moment",
  },
  {
    value: "other",
    label: "Iné",
    hint: "Čokoľvek iné",
    defaultTitle: "",
  },
];

export const TIMELINE_ENERGY: {
  value: TimelineEnergy;
  label: string;
}[] = [
  { value: "soft", label: "Jemné" },
  { value: "warm", label: "Teplé" },
  { value: "build", label: "Stupňovať" },
  { value: "peak", label: "Vrchol" },
  { value: "chill", label: "Utlmiť" },
];

export const TIMELINE_START_MODES: {
  value: TimelineStartMode;
  label: string;
  hint: string;
  needsDetail?: boolean;
  detailPlaceholder?: string;
}[] = [
  {
    value: "timed",
    label: "Podľa času",
    hint: "Spustiť v dohodnutom čase",
  },
  {
    value: "on_signal",
    label: "Na znamenie",
    hint: "Kývnutie, pokyn od organizátora / fotografa…",
    needsDetail: true,
    detailPlaceholder: "napr. kývnutie od fotografa / oddelenia",
  },
  {
    value: "on_word",
    label: "Na konkrétne slovo",
    hint: "Po vypočutí dohodnutého slova alebo vety",
    needsDetail: true,
    detailPlaceholder: 'napr. „a teraz prvý tanec“',
  },
  {
    value: "after_previous",
    label: "Hneď po predchádzajúcom",
    hint: "Bez medzery po predchádzajúcom bode",
  },
  {
    value: "flexible",
    label: "Podľa situácie",
    hint: "Keď to bude sedieť atmosférou",
  },
];

export function getTimelineTypeMeta(type: TimelineItemType) {
  return (
    TIMELINE_ITEM_TYPES.find((t) => t.value === type) ??
    TIMELINE_ITEM_TYPES.find((t) => t.value === "other")!
  );
}

export function getTimelineEnergyLabel(energy: TimelineEnergy | null | undefined) {
  if (!energy) return null;
  return TIMELINE_ENERGY.find((e) => e.value === energy)?.label ?? energy;
}

export function getTimelineStartModeMeta(mode: TimelineStartMode | null | undefined) {
  if (!mode) return null;
  return TIMELINE_START_MODES.find((m) => m.value === mode) ?? null;
}

export function getTimelineStartModeLabel(mode: TimelineStartMode | null | undefined) {
  return getTimelineStartModeMeta(mode)?.label ?? null;
}
