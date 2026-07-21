export type BookingMessage = {
  id: string;
  booking_id: string;
  sender_id: string;
  body: string | null;
  attachment_path: string | null;
  attachment_mime: string | null;
  attachment_url?: string | null;
  created_at: string;
  read_at: string | null;
};
