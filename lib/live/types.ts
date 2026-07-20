export const LIVE_REQUEST_STATUSES = [
  "pending",
  "accepted",
  "played",
  "rejected",
] as const;

export type LiveRequestStatus = (typeof LIVE_REQUEST_STATUSES)[number];

export type LiveRequest = {
  id: string;
  booking_id: string;
  song_title: string;
  artist: string;
  guest_name: string | null;
  status: LiveRequestStatus;
  source_url: string | null;
  normalized_title: string | null;
  created_at: string;
  updated_at: string;
};

export type LiveBookingPublic = {
  slug: string;
  eventType: string | null;
  eventDate: string | null;
  djName: string | null;
};

export function isLiveRequestStatus(value: string): value is LiveRequestStatus {
  return (LIVE_REQUEST_STATUSES as readonly string[]).includes(value);
}
