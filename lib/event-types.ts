export const EVENT_TYPES = [
  { value: "svadba", label: "Svadba" },
  { value: "rodinna_akcia", label: "Rodinná akcia" },
  { value: "oslava", label: "Oslava" },
  { value: "klub", label: "Klub" },
  { value: "firemny_event", label: "Firemný event" },
  { value: "ine", label: "Iné" },
] as const;

export type EventTypeValue = (typeof EVENT_TYPES)[number]["value"];

export const EVENT_TYPE_LABELS: Record<string, string> = {
  svadba: "Svadba",
  rodinna_akcia: "Rodinná akcia",
  oslava: "Oslava",
  klub: "Klub",
  firemny_event: "Firemný event",
  ine: "Iné",
  blockout: "Nedostupnosť",
};

export function formatEventTypeLabel(
  eventType: string | null | undefined,
  fallback = "Akcia"
) {
  if (!eventType) return fallback;
  return EVENT_TYPE_LABELS[eventType] ?? eventType;
}
