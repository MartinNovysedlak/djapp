export type DjExtra = {
  id: string;
  dj_id: string;
  title: string;
  description: string | null;
  price: number;
  icon: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BookingExtra = {
  id: string;
  booking_id: string;
  extra_id: string | null;
  title: string;
  description: string | null;
  unit_price: number;
  quantity: number;
  created_at: string;
};

export const EXTRA_ICON_OPTIONS = [
  { value: "sparkles", label: "Efekty" },
  { value: "cloud", label: "Dym / hmla" },
  { value: "camera", label: "Foto" },
  { value: "lightbulb", label: "Svetlá" },
  { value: "mic", label: "Mikrofon" },
  { value: "speaker", label: "Ozvučenie" },
  { value: "party-popper", label: "Party" },
  { value: "video", label: "Video" },
  { value: "gift", label: "Extra" },
] as const;

export type ExtraIconValue = (typeof EXTRA_ICON_OPTIONS)[number]["value"];

export function formatExtraPrice(price: number | null | undefined) {
  if (price == null || Number.isNaN(Number(price))) return "—";
  return `${Number(price).toLocaleString("sk-SK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })} €`;
}
