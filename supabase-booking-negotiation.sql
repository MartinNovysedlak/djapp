-- Negotiation fields for bookings + bulk inquiries
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS client_budget NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS dj_offer_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS dj_offer_message TEXT;

ALTER TABLE public.bulk_inquiries
  ADD COLUMN IF NOT EXISTS client_budget NUMERIC(12, 2);
